import pytest

from app.providers.cloud_api import WhatsAppCloudAPIProvider
from app.services.exporter import _safe
from app.services.phone import normalize_phone
from app.services.templating import render, to_cloud_api_parameters, validate_body


@pytest.mark.parametrize("raw,region,expected", [
    ("050 123 4567", "AE", "+971501234567"),
    ("+971-50-123-4567", "AE", "+971501234567"),
    ("00971501234567", "AE", "+971501234567"),
    ("971501234567", "AE", "+971501234567"),
    (971501234567.0, "AE", "+971501234567"),          # number cell from Excel
    ("(050) 1234567", "AE", "+971501234567"),
    ("0551234567", "SA", "+966551234567"),
    ("+44 7911 123456", "AE", "+447911123456"),        # explicit country code wins over default
    ("050 123 4567, 055 765 4321", "AE", "+971501234567"),  # two numbers in one cell
])
def test_normalize_valid(raw, region, expected):
    r = normalize_phone(raw, region)
    assert r.status == "valid" and r.e164 == expected


def test_country_column_overrides_default():
    assert normalize_phone("0551234567", "AE", "Saudi Arabia").e164 == "+966551234567"


@pytest.mark.parametrize("raw", ["12345", "0500", "call office", "+971 12"])
def test_normalize_invalid(raw):
    assert normalize_phone(raw, "AE").status == "invalid"


@pytest.mark.parametrize("raw", [None, "", "  ", "N/A", "-"])
def test_normalize_missing(raw):
    assert normalize_phone(raw, "AE").status == "missing"


def test_personalization_and_fallbacks():
    body = "Hi {{first_name}}, offer for {{ company }}."
    assert render(body, {"first_name": "Sara", "company": "Palm Grill"}) == "Hi Sara, offer for Palm Grill."
    assert render(body, {"first_name": "", "company": None}) == "Hi there, offer for your business."
    assert render(body, {}, {"first_name": "friend"}) == "Hi friend, offer for your business."


def test_template_validation():
    assert validate_body("Hi {{first_name}}") == []
    assert any("Unknown field" in e for e in validate_body("Hi {{firstname}}"))
    assert validate_body("   ")
    assert validate_body("x" * 1025)


def test_cloud_api_payload_shape():
    params = to_cloud_api_parameters("Hi {{first_name}} at {{company}}", {"first_name": "Omar", "company": ""})
    p = WhatsAppCloudAPIProvider().build_payload(to="+971501234567", template_name="ramadan_offer", language="en", parameters=params)
    assert p["to"] == "971501234567" and p["type"] == "template" and p["messaging_product"] == "whatsapp"
    assert p["template"]["components"][0]["parameters"] == [
        {"type": "text", "parameter_name": "first_name", "text": "Omar"},
        {"type": "text", "parameter_name": "company", "text": "your business"}]


def test_export_formula_injection_escaped():
    assert _safe("=HYPERLINK(\"x\")").startswith("'")
    assert _safe("+971501234567") == "+971501234567"
