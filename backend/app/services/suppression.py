from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Contact, Suppression
from . import activity


def add_suppression(db: Session, phone: str, reason: str, source: str, log_event: bool = True) -> Suppression:
    """Put a number on the Do Not Contact list. Idempotent. Caller commits."""
    existing = db.scalar(select(Suppression).where(Suppression.phone == phone))
    if existing:
        return existing
    s = Suppression(phone=phone, reason=reason, source=source)
    db.add(s)
    c = db.scalar(select(Contact).where(Contact.phone == phone))
    if c:
        c.last_activity = f"Added to Do Not Contact: {reason}"
        c.last_activity_at = datetime.now(timezone.utc)
    if log_event:
        name = f"{c.first_name} {c.last_name}".strip() if c else phone
        activity.log(db, "opt_out", f"{name} added to Do Not Contact — {reason}", "warning", phone=phone, source=source)
    return s


def is_suppressed(db: Session, phone: str | None) -> bool:
    return bool(phone) and db.scalar(select(Suppression.id).where(Suppression.phone == phone)) is not None
