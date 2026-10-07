"""CSV / XLSX export with spreadsheet formula-injection protection."""
import csv
import io

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill


def _safe(v):
    if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r") and not v[1:2].isdigit():
        return "'" + v
    return "" if v is None else v


def to_csv(headers: list[str], rows: list[list]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    for r in rows:
        w.writerow([_safe(v) for v in r])
    return buf.getvalue().encode("utf-8-sig")


def to_xlsx(headers: list[str], rows: list[list], sheet: str = "Export") -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet[:31]
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="0F172A")
    for r in rows:
        ws.append([_safe(v) for v in r])
    for col in ws.columns:
        width = max(len(str(c.value or "")) for c in col[:200])
        ws.column_dimensions[col[0].column_letter].width = min(max(10, width + 2), 50)
    ws.freeze_panes = "A2"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
