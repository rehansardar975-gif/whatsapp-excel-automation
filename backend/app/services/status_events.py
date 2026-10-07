"""Apply delivery-status events. Used by the Meta webhook AND by Demo Mode (same code path)."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Contact, Message
from ..providers.base import ERROR_TEXT, StatusEvent
from . import activity
from .suppression import add_suppression

STOP_WORDS = {"stop", "unsubscribe", "stop all", "opt out", "optout", "cancel", "remove me", "توقف", "إلغاء"}
ORDER = {"queued": 0, "processing": 1, "sent": 2, "delivered": 3, "read": 4}


def apply_event(db: Session, ev: StatusEvent) -> Message | None:
    msg = db.scalar(select(Message).where(Message.provider_message_id == ev.provider_message_id))
    if not msg:
        return None
    now = datetime.now(timezone.utc)
    if ev.status == "reply":
        if ev.text.strip().lower() in STOP_WORDS:
            handle_opt_out(db, msg.phone, "Replied STOP", "reply_stop", msg)
        return msg
    if ev.status == "failed":
        text, _ = ERROR_TEXT.get(ev.error_code, ("Message could not be delivered", False))
        msg.status, msg.reason, msg.error_code, msg.updated_at = "failed", text, ev.error_code, now
        activity.log(db, "failure", f"Message to {msg.contact_name or msg.phone} failed — {text}", "error",
                     campaign_id=msg.campaign_id, error_code=ev.error_code)
        if ev.error_code == "131050":
            handle_opt_out(db, msg.phone, "Stopped marketing messages in WhatsApp", "provider_opt_out", msg)
        return msg
    # status updates can arrive out of order: never move backwards (e.g. "sent" after "delivered")
    target = "delivered" if ev.status == "read" else ev.status
    if msg.status != "failed" and ORDER.get(target, -1) > ORDER.get(msg.status, -1):
        msg.status, msg.updated_at = target, now
    return msg


def handle_opt_out(db: Session, phone: str, reason: str, source: str, msg: Message | None = None) -> None:
    add_suppression(db, phone, reason, source)
    if msg:
        msg.opted_out = True
    c = db.scalar(select(Contact).where(Contact.phone == phone))
    if c:
        c.opted_in = False
