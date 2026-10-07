"""Contact Collection demo: Collect -> Clean -> Validate -> Deduplicate -> Review -> Export / Add to contacts.
Source is a bundled sample directory of fictional businesses. No live websites are scraped."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..demo_data import CITIES, INDUSTRIES, directory_listings
from ..models import ImportBatch
from ..services import activity, importer
from .contacts import _file

router = APIRouter(prefix="/api/collection", tags=["collection"])
HEADERS = ["Business", "Contact", "Phone", "Country", "City", "Industry", "Website", "Source"]
MAPPING = {f: None for f in importer.FIELDS} | {"company": "Business", "full_name": "Contact", "phone": "Phone",
                                                 "country": "Country", "city": "City", "industry": "Industry", "source": "Source"}


@router.get("/options")
def options():
    return {"industries": list(INDUSTRIES), "cities": list(CITIES)}


class RunIn(BaseModel):
    industry: str
    city: str
    limit: int = Field(40, ge=5, le=200)


@router.post("/runs")
def run(body: RunIn, db: Session = Depends(get_db)):
    if body.industry not in INDUSTRIES or body.city not in CITIES:
        raise HTTPException(422, "Choose an industry and city from the list.")
    listings = directory_listings(body.industry, body.city, body.limit)
    rows = [[l[h] for h in HEADERS] for l in listings]
    batch = ImportBatch(file_name=f"Collected: {body.industry} in {body.city}", source="collection", headers=HEADERS,
                        rows=rows, mapping=MAPPING, default_country=CITIES[body.city])
    db.add(batch)
    activity.log(db, "collection", f"Collected {len(rows)} business listings: {body.industry} in {body.city} (sample directory)", "info")
    db.commit()
    return _result(db, batch)


def _result(db: Session, batch: ImportBatch) -> dict:
    records, summary = importer.analyze(db, batch.headers, batch.rows, batch.mapping, batch.default_country)
    w = HEADERS.index("Website")
    for r in records:
        r["website"] = batch.rows[r["row"] - 1][w]
    return {"id": batch.id, "name": batch.file_name, "status": batch.status, "summary": summary, "records": records,
            "steps": [{"label": "Collected", "count": summary["total"]},
                      {"label": "Valid phone", "count": summary["total"] - summary["invalid"] - summary["missing"]},
                      {"label": "Unique", "count": summary["total"] - summary["invalid"] - summary["missing"] - summary["duplicate"]},
                      {"label": "New to your contacts", "count": summary["will_import"]}]}


@router.get("/runs/{bid}/export")
def export(bid: int, format: str = "xlsx", db: Session = Depends(get_db)):
    batch = db.get(ImportBatch, bid)
    if not batch or batch.source != "collection" or batch.status != "preview":
        raise HTTPException(404, "Collection run not found")
    res = _result(db, batch)
    headers = ["Business", "Contact", "Phone (cleaned)", "Phone (original)", "Country", "City", "Industry", "Website", "Validation", "Note"]
    data = [[r["company"], f"{r['first_name']} {r['last_name']}".strip(), r["phone"] or "", r["phone_raw"], r["country"], r["city"],
             r["industry"], r["website"], r["status"].replace("_", " "), r["reason"]] for r in res["records"]]
    return _file(headers, data, "collected-contacts", format)


@router.post("/runs/{bid}/add")
def add_to_contacts(bid: int, db: Session = Depends(get_db)):
    batch = db.get(ImportBatch, bid)
    if not batch or batch.source != "collection":
        raise HTTPException(404, "Collection run not found")
    if batch.status == "imported":
        raise HTTPException(409, "These contacts were already added.")
    # Collected businesses have NOT agreed to WhatsApp messages: they are added as "Needs opt-in".
    return importer.commit(db, batch, consent_confirmed=False)
