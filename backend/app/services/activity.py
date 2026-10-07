from sqlalchemy.orm import Session

from ..models import Activity


def log(db: Session, type_: str, message: str, level: str = "info", **details) -> None:
    """Record a business-meaningful event. Caller commits."""
    db.add(Activity(type=type_, level=level, message=message, details=details))
