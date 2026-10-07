"""Provider contract. Everything above this layer is identical in Demo Mode and live mode."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class SendResult:
    accepted: bool
    provider_message_id: str = ""
    error_code: str = ""
    error_message: str = ""      # plain business language, shown in the UI
    technical_detail: str = ""   # raw provider detail, shown under "Technical details"
    retryable: bool = False
    recipient_opted_out: bool = False


@dataclass
class StatusEvent:
    """Same shape as a status coming from the Meta webhook (`statuses[]` / inbound `messages[]`)."""
    provider_message_id: str
    status: str  # sent | delivered | read | failed | reply
    error_code: str = ""
    text: str = ""
    extra: dict = field(default_factory=dict)


class WhatsAppProvider(ABC):
    name: str = "base"
    is_live: bool = False

    @abstractmethod
    def send_template(self, *, to: str, template_name: str, language: str, body_text: str,
                      parameters: list[dict], attempt: int = 1) -> SendResult: ...

    def follow_up_events(self, provider_message_id: str, to: str) -> list[StatusEvent]:
        """Live providers receive status updates via webhook, so they return nothing here."""
        return []


# Meta error codes -> wording a business user understands.
ERROR_TEXT = {
    "131026": ("Number is not on WhatsApp or cannot receive messages", False),
    "131049": ("WhatsApp limited marketing messages to this person", True),
    "131050": ("Recipient stopped marketing messages from your business", False),
    "130429": ("Messaging temporarily paused (sending too fast)", True),
    "131047": ("Outside the 24-hour window — an approved template is required", False),
    "132001": ("Message template not found or not approved", False),
    "131000": ("WhatsApp had a temporary problem", True),
}
