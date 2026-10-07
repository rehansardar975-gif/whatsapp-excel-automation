from .models import Activity, Campaign, Contact, Message, Template


def iso(dt):
    return dt.isoformat() if dt else None


def contact_out(c: Contact, eligible: bool, reason: str, suppressed: bool) -> dict:
    status = "ready" if eligible else ("do_not_contact" if suppressed else
              "invalid" if c.phone_status == "invalid" else "missing" if c.phone_status == "missing" else "needs_opt_in")
    return {"id": c.id, "first_name": c.first_name, "last_name": c.last_name, "name": f"{c.first_name} {c.last_name}".strip(),
            "company": c.company, "phone": c.phone or c.phone_raw, "country": c.country, "email": c.email, "city": c.city,
            "industry": c.industry, "source": c.source, "opted_in": c.opted_in, "consent_source": c.consent_source,
            "consent_at": iso(c.consent_at), "status": status, "reason": reason, "import_batch_id": c.import_batch_id,
            "last_activity": c.last_activity, "last_activity_at": iso(c.last_activity_at), "created_at": iso(c.created_at)}


def template_out(t: Template) -> dict:
    from .services.templating import placeholders
    return {"id": t.id, "name": t.name, "category": t.category, "language": t.language, "body": t.body,
            "fallbacks": t.fallbacks, "fields": placeholders(t.body), "updated_at": iso(t.updated_at)}


def message_out(m: Message) -> dict:
    return {"id": m.id, "contact_id": m.contact_id, "contact_name": m.contact_name, "company": m.company, "phone": m.phone,
            "body": m.body, "status": m.status, "reason": m.reason, "error_code": m.error_code,
            "provider_message_id": m.provider_message_id, "retry_count": m.retry_count, "opted_out": m.opted_out,
            "updated_at": iso(m.updated_at)}


def campaign_out(c: Campaign, report: dict | None = None) -> dict:
    d = {"id": c.id, "name": c.name, "template_id": c.template_id, "template_name": c.template_name,
         "template_body": c.template_body, "audience": c.audience, "status": c.status, "provider": c.provider,
         "created_at": iso(c.created_at), "started_at": iso(c.started_at), "completed_at": iso(c.completed_at)}
    if report is not None:
        d["report"] = report
    return d


def activity_out(a: Activity) -> dict:
    return {"id": a.id, "type": a.type, "level": a.level, "message": a.message, "details": a.details, "created_at": iso(a.created_at)}
