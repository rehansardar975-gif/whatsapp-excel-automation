"""Phone number cleanup: anything a person types in Excel -> E.164 or a clear reason."""
import re
from dataclasses import dataclass

import phonenumbers

COUNTRY_NAMES = {
    "uae": "AE", "united arab emirates": "AE", "emirates": "AE", "dubai": "AE", "abu dhabi": "AE",
    "saudi arabia": "SA", "ksa": "SA", "saudi": "SA", "qatar": "QA", "kuwait": "KW", "bahrain": "BH",
    "oman": "OM", "pakistan": "PK", "india": "IN", "egypt": "EG", "jordan": "JO",
    "united kingdom": "GB", "uk": "GB", "england": "GB", "great britain": "GB",
    "united states": "US", "usa": "US", "us": "US", "america": "US", "canada": "CA",
    "australia": "AU", "germany": "DE", "france": "FR", "spain": "ES", "italy": "IT",
    "netherlands": "NL", "turkey": "TR", "south africa": "ZA", "nigeria": "NG", "kenya": "KE",
    "singapore": "SG", "malaysia": "MY", "philippines": "PH", "indonesia": "ID", "brazil": "BR", "mexico": "MX",
}


def country_to_region(value: str | None) -> str | None:
    if not value:
        return None
    v = str(value).strip()
    if len(v) == 2 and v.isalpha():
        code = v.upper()
        return "GB" if code == "UK" else code
    return COUNTRY_NAMES.get(v.lower())


@dataclass
class PhoneResult:
    status: str  # valid | invalid | missing
    e164: str | None = None
    region: str = ""
    reason: str = ""


def _clean_cell(raw) -> str:
    if raw is None:
        return ""
    if isinstance(raw, float):
        # Excel stores numbers like 971501234567.0 (or 9.71501E+11 once rounded)
        if raw != raw:  # NaN
            return ""
        raw = f"{raw:.0f}"
    s = str(raw).strip()
    if s.lower() in {"n/a", "na", "-", "none", "null", "nil"}:
        return ""
    # several numbers in one cell -> use the first one
    s = re.split(r"[,;/]| or |\n", s)[0].strip()
    # drop extensions such as "x123" / "ext. 12"
    s = re.split(r"(?i)\s*(?:ext\.?|x)\s*\d+$", s)[0]
    return s


def normalize_phone(raw, default_region: str = "AE", country_hint: str | None = None) -> PhoneResult:
    s = _clean_cell(raw)
    if not s or s.lower() in {"n/a", "na", "-", "none", "null", "0"}:
        return PhoneResult("missing", reason="No phone number")
    digits = re.sub(r"[^\d+]", "", s)
    if not re.search(r"\d", digits):
        return PhoneResult("invalid", reason="Not a phone number")
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    region = country_to_region(country_hint) or default_region
    candidates = [digits]
    # "971501234567" typed without "+": try it as international too
    if not digits.startswith("+") and len(digits) >= 11:
        candidates.append("+" + digits)
    for cand in candidates:
        try:
            num = phonenumbers.parse(cand, None if cand.startswith("+") else region)
        except phonenumbers.NumberParseException:
            continue
        if phonenumbers.is_valid_number(num):
            return PhoneResult(
                "valid",
                phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.E164),
                phonenumbers.region_code_for_number(num) or region,
            )
    return PhoneResult("invalid", reason="Invalid number for the country")
