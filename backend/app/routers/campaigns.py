from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Campaign, Message, Template
from ..serializers import campaign_out, message_out
from ..services import campaigns as svc
from .contacts import _file

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


def via_of(request: Request) -> str:
    """Automation tools identify themselves with an `X-Automation` header (e.g. n8n)."""
    v = (request.headers.get("x-automation") or "").strip().lower()
    return v[:20] if v.isalnum() else "app"


class Audience(BaseModel):
    batch_id: int | None = None
    country: str | None = Field(None, max_length=2)


class CampaignIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    template_id: int
    audience: Audience = Audience()


def _get(db: Session, cid: int) -> Campaign:
    c = db.get(Campaign, cid)
    if not c:
        raise HTTPException(404, "Campaign not found")
    return c


@router.post("/audience-preview")
def audience_preview(body: Audience, db: Session = Depends(get_db)):
    return svc.audience_preview(db, body.model_dump(exclude_none=True))


@router.get("")
def list_campaigns(db: Session = Depends(get_db)):
    return [campaign_out(c, svc.report(db, c)) for c in db.scalars(select(Campaign).order_by(Campaign.id.desc()))]


@router.post("", status_code=201)
def create(body: CampaignIn, request: Request, db: Session = Depends(get_db)):
    t = db.get(Template, body.template_id)
    if not t:
        raise HTTPException(422, "Choose a message first.")
    try:
        c = svc.create_campaign(db, body.name.strip(), t, body.audience.model_dump(exclude_none=True), via_of(request))
    except ValueError as e:
        raise HTTPException(422, str(e))
    return campaign_out(c, svc.report(db, c))


@router.get("/{cid}")
def get(cid: int, db: Session = Depends(get_db)):
    c = _get(db, cid)
    return campaign_out(c, svc.report(db, c))


@router.post("/{cid}/start")
def start(cid: int, request: Request, db: Session = Depends(get_db)):
    c = _get(db, cid)
    try:
        svc.start(db, c, via_of(request))
    except ValueError as e:
        raise HTTPException(409, str(e))
    return campaign_out(c, svc.report(db, c))


@router.post("/{cid}/pause")
def pause(cid: int, db: Session = Depends(get_db)):
    c = _get(db, cid)
    try:
        svc.pause(db, c)
    except ValueError as e:
        raise HTTPException(409, str(e))
    return campaign_out(c, svc.report(db, c))


@router.delete("/{cid}")
def delete(cid: int, db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status == "running":
        raise HTTPException(409, "Pause the campaign before deleting it.")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.get("/{cid}/messages")
def messages(cid: int, status: str = "", q: str = "", page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200),
             db: Session = Depends(get_db)):
    _get(db, cid)
    stmt = select(Message).where(Message.campaign_id == cid)
    if status == "sent":
        stmt = stmt.where(Message.status.in_(("sent", "delivered")))
    elif status == "opted_out":
        stmt = stmt.where(Message.opted_out.is_(True))
    elif status:
        stmt = stmt.where(Message.status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Message.contact_name.ilike(like) | Message.company.ilike(like) | Message.phone.ilike(like))
    rows = db.scalars(stmt.order_by(Message.updated_at.desc(), Message.id)).all()
    return {"items": [message_out(m) for m in rows[(page - 1) * page_size: page * page_size]], "total": len(rows)}


@router.get("/{cid}/export")
def export(cid: int, format: str = "xlsx", db: Session = Depends(get_db)):
    c = _get(db, cid)
    rows = db.scalars(select(Message).where(Message.campaign_id == cid).order_by(Message.id)).all()
    headers = ["Contact", "Business", "Phone", "Status", "Reason", "Retries", "Opted out", "Message", "Last update (UTC)"]
    data = [[m.contact_name, m.company, m.phone, m.status, m.reason, m.retry_count, "Yes" if m.opted_out else "",
             m.body, m.updated_at.strftime("%Y-%m-%d %H:%M:%S") if m.updated_at else ""] for m in rows]
    return _file(headers, data, f"campaign-{c.id}-results", format)
