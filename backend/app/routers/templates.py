from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Template
from ..serializers import template_out
from ..services import activity, templating

router = APIRouter(prefix="/api/templates", tags=["templates"])


class TemplateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    category: str = Field("marketing", pattern="^(marketing|utility)$")
    body: str = Field(..., max_length=2000)
    fallbacks: dict[str, str] = {}


class PreviewIn(BaseModel):
    body: str = Field("", max_length=2000)
    contact: dict[str, str] = {}
    fallbacks: dict[str, str] = {}


def _check(body: TemplateIn):
    errs = templating.validate_body(body.body)
    if errs:
        raise HTTPException(422, " ".join(errs))


@router.get("")
def list_templates(db: Session = Depends(get_db)):
    return [template_out(t) for t in db.scalars(select(Template).order_by(Template.updated_at.desc()))]


@router.post("", status_code=201)
def create(body: TemplateIn, db: Session = Depends(get_db)):
    _check(body)
    t = Template(name=body.name.strip(), category=body.category, body=body.body.strip(), fallbacks=body.fallbacks)
    db.add(t)
    activity.log(db, "template", f"Message “{t.name}” created", "info")
    db.commit()
    return template_out(t)


@router.put("/{tid}")
def update(tid: int, body: TemplateIn, db: Session = Depends(get_db)):
    t = db.get(Template, tid)
    if not t:
        raise HTTPException(404, "Message not found")
    _check(body)
    t.name, t.category, t.body, t.fallbacks = body.name.strip(), body.category, body.body.strip(), body.fallbacks
    t.updated_at = datetime.now(timezone.utc)
    db.commit()
    return template_out(t)


@router.delete("/{tid}")
def delete(tid: int, db: Session = Depends(get_db)):
    t = db.get(Template, tid)
    if not t:
        raise HTTPException(404, "Message not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


@router.post("/preview")
def preview(body: PreviewIn):
    return {"text": templating.render(body.body, body.contact, body.fallbacks), "errors": templating.validate_body(body.body),
            "fields": templating.placeholders(body.body)}
