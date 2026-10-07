"""Create the fictional sample files in sample-data/ (run from the repo root)."""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Font  # noqa: E402

from app.demo_data import contact_rows  # noqa: E402

out = Path(__file__).resolve().parents[1] / "sample-data"
out.mkdir(exist_ok=True)

rows = contact_rows(1208, seed=1250)
wb = Workbook()
ws = wb.active
ws.title = "Contacts"
ws.append(["Gulf Trade Leads — contact list"])
ws["A1"].font = Font(bold=True)
ws.append([])
headers = list(rows[0].keys())
ws.append(headers)
for r in rows:
    ws.append([r[h] for h in headers])
wb.save(out / "sample-contacts-1250.xlsx")

small = contact_rows(60, seed=99, dup_rate=0.08, invalid_rate=0.06, missing_rate=0.05, optout_rate=0.03, no_optin_rate=0.1)
with open(out / "sample-contacts-messy.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Name", "Shop", "Phone No", "Country", "City", "Consent"])
    for r in small:
        w.writerow([r["Contact Name"], r["Business Name"], r["Mobile"], r["Country"], r["City"], r["WhatsApp Opt-in"]])
print(len(rows), len(small))
