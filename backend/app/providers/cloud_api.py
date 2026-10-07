"""WhatsApp Business Cloud API provider (official Meta API).

Not used unless WHATSAPP_MODE=cloud_api and credentials are set. Delivery statuses arrive
asynchronously at POST /api/webhooks/whatsapp. Not exercised against Meta in this portfolio build.
"""
import httpx

from .. import config
from .base import ERROR_TEXT, SendResult, WhatsAppProvider


class WhatsAppCloudAPIProvider(WhatsAppProvider):
    name = "cloud_api"
    is_live = True

    def is_configured(self) -> bool:
        return bool(config.WHATSAPP_PHONE_NUMBER_ID and config.WHATSAPP_ACCESS_TOKEN)

    def build_payload(self, *, to: str, template_name: str, language: str, parameters: list[dict]) -> dict:
        tpl: dict = {"name": template_name, "language": {"code": language}}
        if parameters:
            tpl["components"] = [{"type": "body", "parameters": parameters}]
        return {"messaging_product": "whatsapp", "recipient_type": "individual",
                "to": to.lstrip("+"), "type": "template", "template": tpl}

    def send_template(self, *, to, template_name, language, body_text, parameters, attempt=1) -> SendResult:
        url = f"https://graph.facebook.com/{config.WHATSAPP_API_VERSION}/{config.WHATSAPP_PHONE_NUMBER_ID}/messages"
        payload = self.build_payload(to=to, template_name=template_name, language=language, parameters=parameters)
        try:
            r = httpx.post(url, json=payload, timeout=15,
                           headers={"Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}"})
        except httpx.HTTPError as e:
            return SendResult(False, error_code="network", error_message="Could not reach WhatsApp — will retry",
                              retryable=True, technical_detail=type(e).__name__)
        if r.status_code == 200:
            msg_id = (r.json().get("messages") or [{}])[0].get("id", "")
            return SendResult(True, provider_message_id=msg_id, technical_detail="HTTP 200")
        err = (r.json() if r.headers.get("content-type", "").startswith("application/json") else {}).get("error", {})
        code = str(err.get("code", r.status_code))
        text, retryable = ERROR_TEXT.get(code, ("WhatsApp rejected the message", r.status_code >= 500))
        return SendResult(False, error_code=code, error_message=text, retryable=retryable,
                          recipient_opted_out=code == "131050",
                          technical_detail=f"HTTP {r.status_code}: {err.get('message', '')[:200]}")
