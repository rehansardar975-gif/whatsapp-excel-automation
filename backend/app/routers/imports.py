from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..models import ImportBatch
from ..services import importer
from .campaigns import via_of

router = APIRouter(prefix="/api/imports", tags=["imports"])


def _preview(db: Session, batch: ImportBatch, consent_confirmed: bool = False) -> dict:
    try:
        records, summary = importer.analyze(db, batch.headers, batch.rows, batch.mapping, batch.default_country, consent_confirmed)
    except importer.ImportErrorForUser as e:
        records, summary = [], {"error": str(e)}
    return {"id": batch.id, "file_name": batch.file_name, "source": batch.source, "status": batch.status,
            "headers": batch.headers, "mapping": batch.mapping, "default_country": batch.default_country,
            "fields": [{"key": k, "label": importer.FIELD_LABELS[k]} for k in importer.FIELDS],
            "sample": [dict(zip(batch.headers, r)) for r in batch.rows[:3]],
            "summary": summary, "records": records}


@router.post("")
async def upload(file: UploadFile = File(...), default_country: str = Form(config.DEFAULT_COUNTRY), db: Session = Depends(get_db)):
    content = await file.read(config.MAX_UPLOAD_BYTES + 1)
    try:
        headers, rows = importer.read_table(file.filename or "upload", content)
    except importer.ImportErrorForUser as e:
        raise HTTPException(422, str(e))
    batch = ImportBatch(file_name=(file.filename or "upload")[:255], headers=headers, rows=rows,
                        mapping=importer.detect_mapping(headers), default_country=(default_country or "AE").upper()[:2])
    db.add(batch)
    db.commit()
    return _preview(db, batch)


class MappingIn(BaseModel):
    mapping: dict[str, str | None] | None = None
    default_country: str | None = None
    consent_confirmed: bool = False


def _get_preview_batch(db: Session, bid: int) -> ImportBatch:
    batch = db.get(ImportBatch, bid)
    if not batch:
        raise HTTPException(404, "Upload not found")
    if batch.status == "imported":
        raise HTTPException(409, "This file was already imported.")
    return batch


@router.put("/{bid}")
def update(bid: int, body: MappingIn, db: Session = Depends(get_db)):
    batch = _get_preview_batch(db, bid)
    if body.mapping is not None:
        clean = {}
        for k in importer.FIELDS:
            v = body.mapping.get(k)
            if v is not None and v not in batch.headers:
                raise HTTPException(422, f"Unknown column: {v}")
            clean[k] = v
        batch.mapping = clean
    if body.default_country:
        batch.default_country = body.default_country.upper()[:2]
    db.commit()
    return _preview(db, batch, body.consent_confirmed)


class CommitIn(BaseModel):
    consent_confirmed: bool = False


@router.post("/{bid}/commit")
def commit(bid: int, body: CommitIn, request: Request, db: Session = Depends(get_db)):
    batch = _get_preview_batch(db, bid)
    try:
        return importer.commit(db, batch, body.consent_confirmed, via_of(request))
    except importer.ImportErrorForUser as e:
        raise HTTPException(422, str(e))
