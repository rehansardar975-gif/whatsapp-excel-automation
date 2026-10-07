"""Demo Mode provider. Sends nothing. Outcomes are simulated and deterministic per phone number,
so the same file always produces the same demo result (useful for tests and recordings)."""
import hashlib
import uuid

from .base import ERROR_TEXT, SendResult, StatusEvent, WhatsAppProvider


def _bucket(phone: str) -> int:
    return int(hashlib.sha256(phone.encode()).hexdigest(), 16) % 100


def _fail(code: str, attempt_note: str = "") -> SendResult:
    text, retryable = ERROR_TEXT[code]
    return SendResult(False, error_code=code, error_message=text, retryable=retryable,
                      recipient_opted_out=code == "131050",
                      technical_detail=f"Simulated Cloud API error {code}{attempt_note}")


class DemoWhatsAppProvider(WhatsAppProvider):
    name = "demo"
    is_live = False

    def send_template(self, *, to, template_name, language, body_text, parameters, attempt=1) -> SendResult:
        b = _bucket(to)
        n = attempt
        if b < 3:
            return _fail("131026")
        if b == 3:
            return _fail("131050")
        if b == 4:                       # limited every time -> fails after all retries
            return _fail("131049", f" (attempt {n})")
        if b in (5, 6, 7) and n == 1:    # limited once, succeeds on retry
            return _fail("131049", " (attempt 1)")
        return SendResult(True, provider_message_id=f"demo.{uuid.uuid4().hex[:24]}",
                          technical_detail="Simulated: message accepted (HTTP 200)")

    def follow_up_events(self, provider_message_id, to):
        b = _bucket(to)
        if b in (10, 11):                # accepted, but no delivery receipt (phone offline)
            return []
        events = [StatusEvent(provider_message_id, "delivered")]
        if b in (8, 9):                  # recipient replies STOP
            events.append(StatusEvent(provider_message_id, "reply", text="STOP"))
        return events
