"""Fictional demo data. Every name, business and number here is generated — none are real people or companies.
Phone numbers are random numbers in valid national formats; Demo Mode never sends anything to them."""
import random

FIRST = ["Ahmed", "Fatima", "Omar", "Sara", "Rahul", "Priya", "James", "Emma", "Yusuf", "Layla", "Hassan", "Aisha",
         "Daniel", "Noor", "Khalid", "Mariam", "Imran", "Zainab", "Lucas", "Hana", "Bilal", "Reem", "Arjun", "Sofia",
         "Tariq", "Huda", "Michael", "Amira", "Faisal", "Nadia", "Kareem", "Leila", "Sanjay", "Olivia", "Majid", "Dina"]
LAST = ["Rahman", "Khan", "Haddad", "Patel", "Smith", "Al Mansoori", "Siddiqui", "Nasser", "Fernandes", "Qureshi",
        "Al Harbi", "Mehta", "Johnson", "Saleh", "Malik", "Hussain", "Brown", "Al Zahrani", "Iyer", "Darwish"]
INDUSTRIES = {
    "Restaurants": (["Palm", "Saffron", "Olive", "Spice", "Cedar", "Harbor", "Golden", "Urban"], ["Grill", "Kitchen", "Bistro", "Café", "Eatery"]),
    "Real Estate": (["Crescent", "Skyline", "Marina", "Oasis", "Summit", "Bluewater"], ["Properties", "Realty", "Homes", "Estates"]),
    "Clinics": (["CarePoint", "Healing Hands", "BrightSmile", "Wellness", "Family", "Prime"], ["Clinic", "Dental Center", "Medical Center", "Physio"]),
    "Retail": (["Al Noor", "Desert Rose", "Modern", "City", "Silk Road", "Pearl"], ["Trading", "Boutique", "Electronics", "Supplies", "Store"]),
    "Auto Services": (["Speedline", "AutoCare", "Falcon", "Precision", "Express"], ["Garage", "Auto Service", "Tyres", "Car Wash"]),
    "Salons": (["Glow", "Velvet", "Luxe", "Bloom", "Serene"], ["Salon", "Spa", "Beauty Lounge", "Barbers"]),
}
CITIES = {"Dubai": "AE", "Abu Dhabi": "AE", "Sharjah": "AE", "Riyadh": "SA", "Jeddah": "SA", "Doha": "QA"}
SOURCES = ["Website form", "Trade show", "Walk-in", "Referral", "Instagram", "Existing customer"]


def _national_mobile(rng: random.Random, region: str) -> str:
    if region == "AE":
        return f"05{rng.choice('024568')}{rng.randint(1000000, 9999999)}"
    if region == "SA":
        return f"05{rng.choice('0345689')}{rng.randint(1000000, 9999999)}"
    return f"{rng.choice('3567')}{rng.randint(1000000, 9999999)}"  # QA


def _messy(rng: random.Random, national: str, region: str) -> str:
    cc = {"AE": "971", "SA": "966", "QA": "974"}[region]
    intl = national[1:] if national.startswith("0") else national
    style = rng.randint(0, 5)
    if style == 0:
        return f"+{cc} {intl[:2]} {intl[2:5]} {intl[5:]}"
    if style == 1:
        return f"00{cc}{intl}"
    if style == 2:
        return f"{national[:3]}-{national[3:6]}-{national[6:]}" if region != "QA" else national
    if style == 3:
        return f"{cc}{intl}"
    if style == 4:
        return f"({national[:3]}) {national[3:]}" if region != "QA" else f"+{cc}-{intl}"
    return national


def business_name(rng: random.Random, industry: str) -> str:
    a, b = INDUSTRIES[industry]
    return f"{rng.choice(a)} {rng.choice(b)}"


def contact_rows(n: int, seed: int = 7, dup_rate=0.035, invalid_rate=0.017, missing_rate=0.012,
                 optout_rate=0.006, no_optin_rate=0.05) -> list[dict]:
    """Rows as a business would keep them in Excel — inconsistent formats included."""
    rng = random.Random(seed)
    rows: list[dict] = []
    for _ in range(n):
        city = rng.choice(list(CITIES))
        region = CITIES[city]
        industry = rng.choice(list(INDUSTRIES))
        first, last = rng.choice(FIRST), rng.choice(LAST)
        national = _national_mobile(rng, region)
        phone = _messy(rng, national, region)
        roll = rng.random()
        opt = "Yes"
        if roll < invalid_rate:
            phone = rng.choice([national[:6], "0500", "12345", "+971 12", "call office"])
        elif roll < invalid_rate + missing_rate:
            phone = ""
        elif roll < invalid_rate + missing_rate + optout_rate:
            opt = "No"
        elif roll < invalid_rate + missing_rate + optout_rate + no_optin_rate:
            opt = ""
        name = f"{first} {last}"
        rows.append({
            "Contact Name": name.upper() if rng.random() < 0.05 else name,
            "Business Name": business_name(rng, industry), "Mobile": phone,
            "Country": {"AE": rng.choice(["UAE", "United Arab Emirates", "AE"]), "SA": rng.choice(["Saudi Arabia", "KSA"]), "QA": "Qatar"}[region],
            "City": city, "Industry": industry,
            "Email": f"{first.lower()}.{last.lower().replace(' ', '')}@{business_name(rng, industry).lower().replace(' ', '').replace('é', 'e')}.example",
            "Lead Source": rng.choice(SOURCES), "WhatsApp Opt-in": opt,
        })
    # duplicates: same person entered again with a differently formatted number
    for _ in range(int(n * dup_rate)):
        src = dict(rng.choice(rows))
        if src["Mobile"] and src["Mobile"][0] in "0+(9":
            src["Mobile"] = src["Mobile"].replace(" ", "").replace("-", "")
        rows.insert(rng.randint(0, len(rows)), src)
    return rows


def directory_listings(industry: str, city: str, limit: int, seed: int = 11) -> list[dict]:
    """Simulated public business-directory results for the Contact Collection demo."""
    rng = random.Random(f"{seed}-{industry}-{city}")
    region = CITIES[city]
    out = []
    for i in range(limit):
        name = business_name(rng, industry)
        if any(o["Business"] == name for o in out):
            name = f"{name} {rng.choice(['Branch 2', 'Downtown', 'Mall', 'North'])}"
        national = _national_mobile(rng, region)
        phone = _messy(rng, national, region)
        r = rng.random()
        if r < 0.06:
            phone = ""
        elif r < 0.10:
            phone = national[:5]
        out.append({"Business": name, "Contact": f"{rng.choice(FIRST)} {rng.choice(LAST)}", "Phone": phone,
                    "Country": region, "City": city, "Industry": industry,
                    "Website": f"https://{name.lower().replace(' ', '').replace('é', 'e')}.example",
                    "Source": "Sample business directory (demo)"})
    for _ in range(max(1, limit // 12)):  # the same business listed twice
        out.insert(rng.randint(0, len(out)), dict(rng.choice(out)))
    return out
