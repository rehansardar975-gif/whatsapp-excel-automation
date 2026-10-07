"""First-run demo workspace: fictional contacts, message templates and one completed Demo Mode campaign."""
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import config
from .database import Base, engine
from .demo_data import contact_rows
from .models import Activity, Campaign, Contact, ImportBatch, Message, Template
from .services import campaigns, importer
from .services.suppression import add_suppression

TEMPLATES = [
    ("Ramadan offer — existing customers", "marketing",
     "Hi {{first_name}}, Ramadan Kareem from all of us! As a thank-you to {{company}}, we're offering 15% off all "
     "orders placed before the end of the month. Reply YES and we'll send the catalogue. Reply STOP to opt out."),
    ("New catalogue announcement", "marketing",
     "Hello {{first_name}}, our new product catalogue is ready. We picked a few items that suit {{company}} — "
     "would you like a copy on WhatsApp? Reply STOP to opt out."),
    ("Order follow-up", "utility",
     "Hi {{first_name}}, this is a quick follow-up on your recent order for {{company}}. "
     "Is everything as expected? Just reply here if you need anything."),
]


def reset_and_seed(db: Session) -> None:
    db.close()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with _session() as s:
        _seed(s)


def _session():
    from .database import SessionLocal
    return SessionLocal()


def seed_if_empty() -> None:
    Base.metadata.create_all(engine)
    with _session() as db:
        if db.scalar(select(func.count()).select_from(Template)) == 0:
            _seed(db)


def _seed(db: Session) -> None:
    rows = contact_rows(180, seed=2026)
    headers = list(rows[0].keys())
    batch = ImportBatch(file_name="Customer list - Q3.xlsx", headers=headers, rows=[[r[h] for h in headers] for r in rows],
                        mapping=importer.detect_mapping(headers), default_country="AE")
    db.add(batch)
    db.commit()
    importer.commit(db, batch, consent_confirmed=False)

    tpls = [Template(name=n, category=c, body=b) for n, c, b in TEMPLATES]
    db.add_all(tpls)
    db.commit()

    old = config.DEMO_SEND_DELAY
    config.DEMO_SEND_DELAY = 0
    try:
        camp = campaigns.create_campaign(db, "Ramadan offer — Q3 customers", tpls[0], {"batch_id": batch.id})
        camp.status = "running"
        camp.started_at = campaigns._now()
        db.commit()
        campaigns.launch(camp.id, sync=True)
    finally:
        config.DEMO_SEND_DELAY = old

    c = db.scalar(select(Contact).where(Contact.opted_in.is_(True)).order_by(Contact.id.desc()))
    if c:
        add_suppression(db, c.phone, "Asked by phone not to be contacted", "manual")
        c.opted_in = False
    db.commit()

    # make the sample history look like it happened yesterday
    shift = timedelta(days=1, hours=3)
    for model in (Activity, Contact, Campaign, Message, ImportBatch):
        for obj in db.scalars(select(model)):
            for attr in ("created_at", "started_at", "completed_at", "updated_at", "imported_at", "consent_at", "last_activity_at"):
                v = getattr(obj, attr, None)
                if v is not None:
                    setattr(obj, attr, v - shift)
    db.commit()
