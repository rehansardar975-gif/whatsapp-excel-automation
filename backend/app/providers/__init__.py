from .. import config
from .base import SendResult, WhatsAppProvider
from .cloud_api import WhatsAppCloudAPIProvider
from .demo import DemoWhatsAppProvider


def get_provider() -> WhatsAppProvider:
    """Live Cloud API only when explicitly enabled AND fully configured. Otherwise Demo Mode."""
    if config.WHATSAPP_MODE == "cloud_api":
        live = WhatsAppCloudAPIProvider()
        if live.is_configured():
            return live
    return DemoWhatsAppProvider()


__all__ = ["SendResult", "WhatsAppProvider", "get_provider", "DemoWhatsAppProvider", "WhatsAppCloudAPIProvider"]
