"""Provider selection (Demo vs Cloud API), Cloud API response handling, and automation (n8n) tracking."""
import httpx
import pytest

from app import config
from app.providers import DemoWhatsAppProvider, WhatsAppCloudAPIProvider, get_provider


@pytest.fixture()
def cloud_env(monkeypatch):
    monkeypatch.setattr(config, "WHATSAPP_MODE", "cloud_api")
    monkeypatch.setattr(config, "WHATSAPP_PHONE_NUMBER_ID", "123456789")
    monkeypatch.setattr(config, "WHATSAPP_ACCESS_TOKEN", "test-token")


def test_demo_is_default_and_cloud_needs_credentials(monkeypatch):
    assert isinstance(get_provider(), DemoWhatsAppProvider) and not get_provider().is_live
    monkeypatch.setattr(config, "WHATSAPP_MODE", "cloud_api")  # mode set but no credentials -> stays Demo
    monkeypatch.setattr(config, "WHATSAPP_ACCESS_TOKEN", "")
    assert isinstance(get_provider(), DemoWhatsAppProvider)


def test_cloud_provider_selected_when_configured(cloud_env):
    p = get_provider()
    assert isinstance(p, WhatsAppCloudAPIProvider) and p.is_live


def _send(monkeypatch, response):
    seen = {}

    def fake_post(url, json, headers, timeout):
        seen.update(url=url, json=json, headers=headers)
        return response

    monkeypatch.setattr(httpx, "post", fake_post)
    res = WhatsAppCloudAPIProvider().send_template(to="+971501234567", template_name="catalogue", language="en",
                                                   body_text="Hi", parameters=[])
    return res, seen


def test_cloud_send_success(cloud_env, monkeypatch):
    res, seen = _send(monkeypatch, httpx.Response(200, json={"messages": [{"id": "wamid.ABC"}]}))
    assert res.accepted and res.provider_message_id == "wamid.ABC"
    assert seen["url"].endswith("/123456789/messages") and seen["headers"]["Authorization"] == "Bearer test-token"
    assert seen["json"]["to"] == "971501234567"


@pytest.mark.parametrize("code,retryable,opted_out", [(131026, False, False), (131049, True, False), (131050, False, True), (130429, True, False)])
def test_cloud_send_errors_mapped(cloud_env, monkeypatch, code, retryable, opted_out):
    res, _ = _send(monkeypatch, httpx.Response(400, json={"error": {"code": code, "message": "x"}}))
    assert not res.accepted and res.error_code == str(code)
    assert res.retryable is retryable and res.recipient_opted_out is opted_out
    assert res.error_message and "HTTP 400" in res.technical_detail


def test_cloud_network_error_is_retryable(cloud_env, monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectError("down")
    monkeypatch.setattr(httpx, "post", boom)
    res = WhatsAppCloudAPIProvider().send_template(to="+971501234567", template_name="t", language="en", body_text="", parameters=[])
    assert not res.accepted and res.retryable


def test_automation_header_recorded(fresh):
    c = fresh
    t = c.get("/api/templates").json()[0]
    camp = c.post("/api/campaigns", json={"name": "From n8n", "template_id": t["id"]}, headers={"X-Automation": "n8n"}).json()
    assert camp["created_via"] == "n8n"
    c.post(f"/api/campaigns/{camp['id']}/start", headers={"X-Automation": "n8n"})
    import time
    for _ in range(100):  # let the background queue finish before the next test resets data
        if c.get(f"/api/campaigns/{camp['id']}").json()["status"] == "completed":
            break
        time.sleep(0.1)
    msgs = [a["message"] for a in c.get("/api/activity", params={"type": "campaign"}).json()["items"]]
    assert any("created via n8n" in m for m in msgs) and any("started via n8n" in m for m in msgs)
    weird = c.post("/api/campaigns", json={"name": "Odd header", "template_id": t["id"]}, headers={"X-Automation": "<script>"}).json()
    assert weird.get("created_via") == "app", weird  # unsafe values are ignored
