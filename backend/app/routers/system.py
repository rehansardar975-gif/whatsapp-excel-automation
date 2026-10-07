"""Dashboard, activity log, integration status, Meta webhook, demo reset."""
import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..models import Activity, Campaign, Contact, Message, Suppression
from ..providers import get_provider
from ..providers.base import StatusEvent
from ..serializers import activity_out, campaign_out
from ..services import campaigns as svc
from ..services.campaigns import eligibility, suppressed_set
from ..services.status_events import apply_event

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    sup = suppressed_set(db)
    contacts = db.scalars(select(Contact)).all()
    ready = sum(1 for c in contacts if eligibility(c, sup)[0])
    by = dict(db.execute(select(Message.status, func.count()).group_by(Message.status)).all())
    camps = db.scalars(select(Campaign).order_by(Campaign.id.desc()).limit(5)).all()
    return {
        "contacts": len(contacts), "ready": ready, "not_ready": len(contacts) - ready,
        "campaigns": db.scalar(select(func.count()).select_from(Campaign)),
        "running": db.scalar(select(func.count()).select_from(Campaign).where(Campaign.status == "running")),
        "processed": by.get("sent", 0) + by.get("delivered", 0) + by.get("failed", 0) + by.get("skipped", 0),
        "sent": by.get("sent", 0) + by.get("delivered", 0), "delivered": by.get("delivered", 0),
        "failed": by.get("failed", 0), "skipped": by.get("skipped", 0), "opt_outs": len(sup),
        "recent_campaigns": [campaign_out(c, svc.report(db, c)) for c in camps],
        "recent_activity": [activity_out(a) for a in db.scalars(select(Activity).order_by(Activity.id.desc()).limit(8))],
        "mode": status()["mode"],
    }


@router.get("/activity")
def activity_log(type: str = "", level: str = "", page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=200),
                 db: Session = Depends(get_db)):
    stmt = select(Activity)
    if type:
        stmt = stmt.where(Activity.type == type)
    if level:
        stmt = stmt.where(Activity.level == level)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Activity.id.desc()).offset((page - 1) * page_size).limit(page_size))
    return {"items": [activity_out(a) for a in rows], "total": total}


@router.get("/status")
def status():
    p = get_provider()
    return {"mode": "live" if p.is_live else "demo", "provider": p.name,
            "cloud_api_configured": bool(config.WHATSAPP_PHONE_NUMBER_ID and config.WHATSAPP_ACCESS_TOKEN),
            "api_version": config.WHATSAPP_API_VERSION, "webhook_path": "/api/webhooks/whatsapp",
            "signature_check": bool(config.WHATSAPP_APP_SECRET), "max_retries": config.MAX_RETRIES}


# ---------- Meta webhook (official Cloud API format) ----------
@router.get("/webhooks/whatsapp", response_class=PlainTextResponse)
def verify(mode: str = Query("", alias="hub.mode"), token: str = Query("", alias="hub.verify_token"),
           challenge: str = Query("", alias="hub.challenge")):
    if mode == "subscribe" and hmac.compare_digest(token, config.WHATSAPP_VERIFY_TOKEN):
        return challenge
    raise HTTPException(403, "Verification failed")


@router.post("/webhooks/whatsapp")
async def webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    if config.WHATSAPP_APP_SECRET:
        sig = request.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(config.WHATSAPP_APP_SECRET.encode(), raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise HTTPException(401, "Invalid signature")
    try:
        payload = json.loads(raw or b"{}")
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON")
    applied = 0
    for entry in payload.get("entry", []) or []:
        for change in entry.get("changes", []) or []:
            value = change.get("value", {}) or {}
            for st in value.get("statuses", []) or []:
                code = str(((st.get("errors") or [{}])[0]).get("code", "")) if st.get("errors") else ""
                if apply_event(db, StatusEvent(st.get("id", ""), st.get("status", ""), error_code=code)):
                    applied += 1
            for m in value.get("messages", []) or []:
                text = (m.get("text") or {}).get("body", "") or (m.get("button") or {}).get("text", "")
                ctx_id = (m.get("context") or {}).get("id", "")
                if ctx_id and apply_event(db, StatusEvent(ctx_id, "reply", text=text)):
                    applied += 1
                elif text.strip().lower() in {"stop", "unsubscribe"} and m.get("from"):
                    from ..services.status_events import handle_opt_out
                    handle_opt_out(db, "+" + m["from"].lstrip("+"), "Replied STOP", "reply_stop")
                    applied += 1
    db.commit()
    return {"received": True, "applied": applied}  # always 200 so Meta does not retry valid deliveries


@router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db)):
    if db.scalar(select(func.count()).select_from(Campaign).where(Campaign.status == "running")):
        raise HTTPException(409, "Pause running campaigns before resetting the demo.")
    from ..seed import reset_and_seed
    reset_and_seed(db)
    return {"ok": True}


SAMPLES = {"sample-contacts-1250.xlsx", "sample-contacts-messy.csv"}


@router.get("/samples/{name}")
def sample_file(name: str):
    from pathlib import Path

    from fastapi.responses import FileResponse
    if name not in SAMPLES:  # fixed allow-list: no path traversal
        raise HTTPException(404, "Sample not found")
    return FileResponse(Path(__file__).resolve().parents[3] / "sample-data" / name, filename=name)
