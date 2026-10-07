"""Campaign creation, eligibility, the processing queue and reporting."""
import logging
import threading
import time
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import config
from ..database import SessionLocal
from ..models import Campaign, Contact, Message, Suppression, Template
from ..providers import get_provider
from . import activity, templating
from .status_events import apply_event, handle_opt_out

log = logging.getLogger("campaigns")


def _now():
    return datetime.now(timezone.utc)


def contact_dict(c: Contact) -> dict:
    return {"first_name": c.first_name, "last_name": c.last_name, "company": c.company, "city": c.city}


def eligibility(c: Contact, suppressed: set[str]) -> tuple[bool, str]:
    """Single source of truth for 'can we message this contact?'"""
    if c.phone and c.phone in suppressed:
        return False, "On Do Not Contact list"
    if c.phone_status == "missing" or not c.phone:
        return False, "No phone number"
    if c.phone_status == "invalid":
        return False, "Invalid phone number"
    if not c.opted_in:
        return False, "No WhatsApp opt-in on record"
    return True, ""


def suppressed_set(db: Session) -> set[str]:
    return set(db.scalars(select(Suppression.phone)))


def audience_contacts(db: Session, audience: dict) -> list[Contact]:
    q = select(Contact).order_by(Contact.id)
    if audience.get("batch_id"):
        q = q.where(Contact.import_batch_id == int(audience["batch_id"]))
    if audience.get("country"):
        q = q.where(Contact.country == audience["country"])
    return list(db.scalars(q))


def audience_preview(db: Session, audience: dict) -> dict:
    sup = suppressed_set(db)
    contacts = audience_contacts(db, audience)
    reasons: Counter = Counter()
    ready = []
    for c in contacts:
        ok, why = eligibility(c, sup)
        if ok:
            ready.append(c)
        else:
            reasons[why] += 1
    return {"total": len(contacts), "ready": len(ready), "excluded": len(contacts) - len(ready),
            "excluded_reasons": [{"reason": r, "count": n} for r, n in reasons.most_common()],
            "sample": contact_dict(ready[0]) if ready else None}


def create_campaign(db: Session, name: str, template: Template, audience: dict) -> Campaign:
    sup = suppressed_set(db)
    contacts = audience_contacts(db, audience)
    if not any(eligibility(c, sup)[0] for c in contacts):
        raise ValueError("No contacts in this audience can receive messages.")
    camp = Campaign(name=name, template_id=template.id, template_name=template.name, template_body=template.body,
                    audience=audience, provider=get_provider().name, status="draft")
    db.add(camp)
    db.flush()
    for c in contacts:
        ok, why = eligibility(c, sup)
        db.add(Message(
            campaign_id=camp.id, contact_id=c.id, contact_name=f"{c.first_name} {c.last_name}".strip(),
            company=c.company, phone=c.phone or c.phone_raw,
            body=templating.render(template.body, contact_dict(c), template.fallbacks),
            status="queued" if ok else "skipped", reason="" if ok else why))
    queued = sum(1 for c in contacts if eligibility(c, sup)[0])
    activity.log(db, "campaign", f"Campaign “{name}” created — {queued} messages queued, {len(contacts) - queued} skipped",
                 "info", campaign_id=camp.id)
    db.commit()
    return camp


# ---------------- processing queue ----------------
_runners: dict[int, threading.Thread] = {}
_lock = threading.Lock()


def start(db: Session, camp: Campaign) -> None:
    if camp.status == "completed":
        raise ValueError("This campaign is already complete.")
    if camp.status != "running":
        first = camp.started_at is None
        camp.status = "running"
        camp.started_at = camp.started_at or _now()
        activity.log(db, "campaign", f"Campaign “{camp.name}” {'started' if first else 'resumed'}", "info", campaign_id=camp.id)
        db.commit()
    launch(camp.id)


def pause(db: Session, camp: Campaign) -> None:
    if camp.status != "running":
        raise ValueError("Only a running campaign can be paused.")
    camp.status = "paused"
    activity.log(db, "campaign", f"Campaign “{camp.name}” paused", "warning", campaign_id=camp.id)
    db.commit()


def launch(campaign_id: int, sync: bool = False) -> None:
    if sync:
        _run(campaign_id)
        return
    with _lock:
        t = _runners.get(campaign_id)
        if t and t.is_alive():
            return
        t = threading.Thread(target=_run, args=(campaign_id,), daemon=True, name=f"campaign-{campaign_id}")
        _runners[campaign_id] = t
        t.start()


def resume_running_campaigns() -> None:
    """After a restart, continue campaigns that were running. Messages stuck in 'processing' are re-queued."""
    with SessionLocal() as db:
        for camp in db.scalars(select(Campaign).where(Campaign.status == "running")):
            for m in db.scalars(select(Message).where(Message.campaign_id == camp.id, Message.status == "processing")):
                m.status = "queued"
            db.commit()
            launch(camp.id)


def _backoff(retry_count: int) -> timedelta:
    base = 1.0 if config.DEMO_SEND_DELAY < 0.05 else 2.0
    return timedelta(seconds=0 if config.DEMO_SEND_DELAY == 0 else base * (2 ** retry_count))


def _run(campaign_id: int) -> None:
    provider = get_provider()
    while True:
        with SessionLocal() as db:
            camp = db.get(Campaign, campaign_id)
            if not camp or camp.status != "running":
                return
            now = _now()
            msg = db.scalar(select(Message).where(
                Message.campaign_id == campaign_id, Message.status == "queued",
                (Message.next_attempt_at.is_(None)) | (Message.next_attempt_at <= now)).order_by(Message.id).limit(1))
            if msg is None:
                waiting = db.scalar(select(func.count()).select_from(Message).where(
                    Message.campaign_id == campaign_id, Message.status.in_(("queued", "processing"))))
                if waiting:
                    db.close()
                    time.sleep(0.2)
                    continue
                camp.status, camp.completed_at = "completed", _now()
                r = report(db, camp)
                activity.log(db, "campaign", f"Campaign “{camp.name}” complete — {r['sent']} sent, {r['delivered']} delivered, "
                             f"{r['failed']} failed, {r['skipped']} skipped", "success", campaign_id=camp.id)
                db.commit()
                return
            _process_one(db, provider, camp, msg)
        if config.DEMO_SEND_DELAY:
            time.sleep(config.DEMO_SEND_DELAY)


def _process_one(db: Session, provider, camp: Campaign, msg: Message) -> None:
    # re-check right before sending: the person may have opted out while the campaign was running
    if db.scalar(select(Suppression.id).where(Suppression.phone == msg.phone)):
        msg.status, msg.reason, msg.updated_at = "skipped", "On Do Not Contact list", _now()
        db.commit()
        return
    msg.status, msg.updated_at = "processing", _now()
    db.commit()
    template = db.get(Template, camp.template_id) if camp.template_id else None
    contact = db.get(Contact, msg.contact_id) if msg.contact_id else None
    cdict = contact_dict(contact) if contact else {}
    fallbacks = template.fallbacks if template else {}
    res = provider.send_template(
        to=msg.phone, template_name=_template_api_name(camp.template_name),
        language=template.language if template else "en", body_text=msg.body,
        parameters=templating.to_cloud_api_parameters(camp.template_body, cdict, fallbacks),
        attempt=msg.retry_count + 1)
    now = _now()
    if res.accepted:
        msg.status, msg.provider_message_id, msg.reason, msg.error_code, msg.updated_at = "sent", res.provider_message_id, "", "", now
        if contact:
            contact.last_activity, contact.last_activity_at = f"Message sent — {camp.name}", now
        db.commit()
        for ev in provider.follow_up_events(res.provider_message_id, msg.phone):
            apply_event(db, ev)
        db.commit()
        return
    if res.retryable and msg.retry_count < config.MAX_RETRIES:
        msg.retry_count += 1
        msg.status, msg.reason, msg.error_code = "queued", f"{res.error_message} — retry {msg.retry_count} scheduled", res.error_code
        msg.next_attempt_at, msg.updated_at = now + _backoff(msg.retry_count), now
        activity.log(db, "retry", f"Retrying message to {msg.contact_name or msg.phone} (attempt {msg.retry_count + 1})",
                     "warning", campaign_id=camp.id, error_code=res.error_code)
        db.commit()
        return
    reason = res.error_message + (f" (gave up after {msg.retry_count} retries)" if res.retryable else "")
    msg.status, msg.reason, msg.error_code, msg.updated_at = "failed", reason, res.error_code, now
    activity.log(db, "failure", f"Message to {msg.contact_name or msg.phone} failed — {reason}", "error",
                 campaign_id=camp.id, error_code=res.error_code, detail=res.technical_detail)
    if res.recipient_opted_out:
        handle_opt_out(db, msg.phone, "Stopped marketing messages in WhatsApp", "provider_opt_out", msg)
    if contact:
        contact.last_activity, contact.last_activity_at = f"Message failed — {camp.name}", now
    db.commit()


def _template_api_name(name: str) -> str:
    """Meta template names are lowercase with underscores."""
    import re
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


# ---------------- reporting ----------------
def report(db: Session, camp: Campaign) -> dict:
    rows = db.execute(select(Message.status, func.count()).where(Message.campaign_id == camp.id).group_by(Message.status)).all()
    by = {s: n for s, n in rows}
    total = sum(by.values())
    sent = by.get("sent", 0) + by.get("delivered", 0)
    failed, skipped = by.get("failed", 0), by.get("skipped", 0)
    opted_out = db.scalar(select(func.count()).select_from(Message).where(Message.campaign_id == camp.id, Message.opted_out.is_(True)))
    remaining = by.get("queued", 0) + by.get("processing", 0)

    def reasons(status):
        q = select(Message.reason, func.count()).where(Message.campaign_id == camp.id, Message.status == status).group_by(Message.reason)
        return [{"reason": r or "Unknown", "count": n} for r, n in sorted(db.execute(q).all(), key=lambda x: -x[1])]

    return {
        "total": total, "processed": total - remaining, "remaining": remaining, "queued": by.get("queued", 0),
        "processing": by.get("processing", 0), "sent": sent, "delivered": by.get("delivered", 0),
        "failed": failed, "skipped": skipped, "opted_out": opted_out,
        "retried": db.scalar(select(func.count()).select_from(Message).where(Message.campaign_id == camp.id, Message.retry_count > 0)),
        "progress": round(100 * (total - remaining) / total) if total else 100,
        "failed_reasons": reasons("failed"), "skipped_reasons": reasons("skipped"),
    }
