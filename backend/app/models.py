"""Database tables."""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class ImportBatch(Base):
    """One uploaded Excel/CSV file (or one collection run)."""
    __tablename__ = "import_batches"
    id: Mapped[int] = mapped_column(primary_key=True)
    file_name: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(50), default="excel_upload")
    status: Mapped[str] = mapped_column(String(20), default="preview")  # preview | imported
    default_country: Mapped[str] = mapped_column(String(2), default="AE")
    headers: Mapped[list] = mapped_column(JSON, default=list)
    rows: Mapped[list] = mapped_column(JSON, default=list)  # raw rows, kept until import
    mapping: Mapped[dict] = mapped_column(JSON, default=dict)
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Contact(Base):
    __tablename__ = "contacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), default="")
    last_name: Mapped[str] = mapped_column(String(100), default="")
    company: Mapped[str] = mapped_column(String(200), default="")
    phone_raw: Mapped[str] = mapped_column(String(64), default="")
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)  # E.164
    country: Mapped[str] = mapped_column(String(2), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    industry: Mapped[str] = mapped_column(String(100), default="")
    source: Mapped[str] = mapped_column(String(100), default="")
    phone_status: Mapped[str] = mapped_column(String(20), default="valid")  # valid | invalid | missing
    opted_in: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_source: Mapped[str] = mapped_column(String(200), default="")
    consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    import_batch_id: Mapped[int | None] = mapped_column(ForeignKey("import_batches.id", ondelete="SET NULL"), nullable=True)
    last_activity: Mapped[str] = mapped_column(String(200), default="")
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Suppression(Base):
    """Do Not Contact list. Keyed by phone so it survives contact deletion and re-imports."""
    __tablename__ = "suppressions"
    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    reason: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(50))  # manual | reply_stop | provider_opt_out | import
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Template(Base):
    __tablename__ = "templates"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(20), default="marketing")  # marketing | utility
    language: Mapped[str] = mapped_column(String(10), default="en")
    body: Mapped[str] = mapped_column(Text)
    fallbacks: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    template_id: Mapped[int | None] = mapped_column(ForeignKey("templates.id", ondelete="SET NULL"), nullable=True)
    template_name: Mapped[str] = mapped_column(String(120), default="")
    template_body: Mapped[str] = mapped_column(Text, default="")  # snapshot at creation
    audience: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | running | paused | completed
    provider: Mapped[str] = mapped_column(String(20), default="demo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    messages: Mapped[list["Message"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    contact_id: Mapped[int | None] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    contact_name: Mapped[str] = mapped_column(String(200), default="")
    company: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(20), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    # queued | processing | sent | delivered | failed | skipped
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    reason: Mapped[str] = mapped_column(String(200), default="")
    error_code: Mapped[str] = mapped_column(String(20), default="")
    provider_message_id: Mapped[str] = mapped_column(String(100), default="", index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    campaign: Mapped[Campaign] = relationship(back_populates="messages")


class Activity(Base):
    __tablename__ = "activity"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(40), index=True)
    level: Mapped[str] = mapped_column(String(10), default="info")  # info | success | warning | error
    message: Mapped[str] = mapped_column(String(400))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
