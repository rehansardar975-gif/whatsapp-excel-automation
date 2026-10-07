"""Message personalization with {{placeholders}}."""
import re

PLACEHOLDER = re.compile(r"\{\{\s*([a-z_]+)\s*\}\}")
SUPPORTED = {"first_name", "last_name", "company", "city"}
DEFAULT_FALLBACKS = {"first_name": "there", "last_name": "", "company": "your business", "city": "your city"}
MAX_BODY = 1024  # WhatsApp template body limit


def placeholders(body: str) -> list[str]:
    seen: list[str] = []
    for name in PLACEHOLDER.findall(body):
        if name not in seen:
            seen.append(name)
    return seen


def validate_body(body: str) -> list[str]:
    errors = []
    if not body.strip():
        errors.append("Message cannot be empty.")
    if len(body) > MAX_BODY:
        errors.append(f"Message is longer than {MAX_BODY} characters.")
    unknown = [p for p in placeholders(body) if p not in SUPPORTED]
    if unknown:
        errors.append("Unknown field: " + ", ".join("{{" + u + "}}" for u in unknown))
    if body.count("{{") != body.count("}}"):
        errors.append("A {{field}} is not closed.")
    return errors


def render(body: str, contact: dict, fallbacks: dict | None = None) -> str:
    fb = {**DEFAULT_FALLBACKS, **(fallbacks or {})}

    def sub(m):
        key = m.group(1)
        val = (contact.get(key) or "").strip()
        return val or fb.get(key, "")

    return PLACEHOLDER.sub(sub, body)


def to_cloud_api_parameters(body: str, contact: dict, fallbacks: dict | None = None) -> list[dict]:
    """Named template parameters for the WhatsApp Cloud API `components.body.parameters` field."""
    fb = {**DEFAULT_FALLBACKS, **(fallbacks or {})}
    return [
        {"type": "text", "parameter_name": p, "text": (contact.get(p) or "").strip() or fb.get(p, "")}
        for p in placeholders(body)
    ]
