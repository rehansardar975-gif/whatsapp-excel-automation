from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Contact, ImportBatch, Suppression
from ..serializers import contact_out, iso
from ..services import activity, exporter
from ..services.campaigns import eligibility, suppressed_set
from ..services.phone import normalize_phone
from ..services.suppression import add_suppression

router = APIRouter(prefix="/api", tags=["contacts"])
SORTS = {"name": Contact.first_name, "company": Contact.company, "country": Contact.country,
         "created": Contact.created_at, "activity": Contact.last_activity_at}


def _rows(db: Session, q: str, status: str, country: str, batch_id: int | None, sort: str, order: str):
    sup = suppressed_set(db)
    stmt = select(Contact)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Contact.first_name.ilike(like), Contact.last_name.ilike(like), Contact.company.ilike(like),
                              Contact.phone.ilike(like), Contact.phone_raw.ilike(like), Contact.email.ilike(like),
                              Contact.city.ilike(like)))
    if country:
        stmt = stmt.where(Contact.country == country)
    if batch_id:
        stmt = stmt.where(Contact.import_batch_id == batch_id)
    col = SORTS.get(sort, Contact.created_at)
    stmt = stmt.order_by(col.desc() if order == "desc" else col.asc(), Contact.id.desc())
    out = []
    for c in db.scalars(stmt):
        ok, why = eligibility(c, sup)
        d = contact_out(c, ok, why, bool(c.phone and c.phone in sup))
        if not status or d["status"] == status:
            out.append(d)
    return out


@router.get("/contacts")
def list_contacts(q: str = "", status: str = "", country: str = "", batch_id: int | None = None,
                  sort: str = "created", order: str = "desc", page: int = Query(1, ge=1),
                  page_size: int = Query(25, ge=1, le=200), db: Session = Depends(get_db)):
    rows = _rows(db, q, status, country, batch_id, sort, order)
    counts: dict = {}
    for r in _rows(db, "", "", "", None, "created", "desc"):
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    countries = sorted(set(db.scalars(select(Contact.country).where(Contact.country != "").distinct())))
    return {"items": rows[(page - 1) * page_size: page * page_size], "total": len(rows), "page": page,
            "page_size": page_size, "counts": counts, "countries": countries}


@router.get("/contacts/export")
def export_contacts(format: str = "xlsx", q: str = "", status: str = "", country: str = "", db: Session = Depends(get_db)):
    rows = _rows(db, q, status, country, None, "created", "desc")
    headers = ["First name", "Last name", "Business", "Phone", "Country", "City", "Email", "Industry", "Source",
               "Status", "Reason", "WhatsApp opt-in", "Consent source"]
    data = [[r["first_name"], r["last_name"], r["company"], r["phone"], r["country"], r["city"], r["email"], r["industry"],
             r["source"], r["status"].replace("_", " "), r["reason"], "Yes" if r["opted_in"] else "No", r["consent_source"]] for r in rows]
    return _file(headers, data, "contacts", format)


def _file(headers, data, name, fmt):
    if fmt == "csv":
        return Response(exporter.to_csv(headers, data), media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{name}.csv"'})
    return Response(exporter.to_xlsx(headers, data, name.title()),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{name}.xlsx"'})


class ConsentIn(BaseModel):
    opted_in: bool
    note: str = Field("Updated manually", max_length=200)


@router.post("/contacts/{cid}/consent")
def set_consent(cid: int, body: ConsentIn, db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    c = db.get(Contact, cid)
    if not c:
        raise HTTPException(404, "Contact not found")
    if body.opted_in and c.phone and db.scalar(select(Suppression.id).where(Suppression.phone == c.phone)):
        raise HTTPException(409, "This number is on the Do Not Contact list. Remove it from the list first.")
    c.opted_in = body.opted_in
    c.consent_source = body.note if body.opted_in else ""
    c.consent_at = datetime.now(timezone.utc) if body.opted_in else None
    c.last_activity, c.last_activity_at = ("Opt-in recorded" if body.opted_in else "Opt-in removed"), datetime.now(timezone.utc)
    activity.log(db, "consent", f"{'Opt-in recorded' if body.opted_in else 'Opt-in removed'} for {c.first_name} {c.last_name}".strip(), "info", contact_id=c.id)
    db.commit()
    return {"ok": True}


# -------- Do Not Contact list --------
class SuppressIn(BaseModel):
    phone: str = Field(..., min_length=3, max_length=40)
    reason: str = Field("Requested no contact", max_length=200)


@router.get("/suppressions")
def list_suppressions(db: Session = Depends(get_db)):
    rows = db.scalars(select(Suppression).order_by(Suppression.created_at.desc())).all()
    names = {c.phone: f"{c.first_name} {c.last_name}".strip() for c in db.scalars(select(Contact).where(Contact.phone.in_([r.phone for r in rows])))}
    return [{"id": s.id, "phone": s.phone, "name": names.get(s.phone, ""), "reason": s.reason, "source": s.source,
             "created_at": iso(s.created_at)} for s in rows]


@router.post("/suppressions", status_code=201)
def add_to_suppression(body: SuppressIn, db: Session = Depends(get_db)):
    ph = normalize_phone(body.phone)
    if ph.status != "valid":
        raise HTTPException(422, "Enter a valid phone number with country code, e.g. +971 50 123 4567")
    add_suppression(db, ph.e164, body.reason.strip() or "Requested no contact", "manual")
    c = db.scalar(select(Contact).where(Contact.phone == ph.e164))
    if c:
        c.opted_in = False
    db.commit()
    return {"phone": ph.e164}


@router.delete("/suppressions/{sid}")
def remove_suppression(sid: int, db: Session = Depends(get_db)):
    s = db.get(Suppression, sid)
    if not s:
        raise HTTPException(404, "Not found")
    activity.log(db, "opt_out", f"{s.phone} removed from Do Not Contact (needs a new opt-in before messaging)", "info")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.get("/lists")
def import_lists(db: Session = Depends(get_db)):
    rows = db.execute(select(ImportBatch, func.count(Contact.id)).join(Contact, Contact.import_batch_id == ImportBatch.id)
                      .group_by(ImportBatch.id).order_by(ImportBatch.id.desc())).all()
    return [{"id": b.id, "name": b.file_name, "source": b.source, "contacts": n, "imported_at": iso(b.imported_at)} for b, n in rows]
