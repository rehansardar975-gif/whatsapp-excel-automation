"""Runtime settings, read from environment variables (never hard-coded secrets)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'app.db'}")

# "demo" (default) or "cloud_api". Cloud API is only used when all credentials exist.
WHATSAPP_MODE = os.getenv("WHATSAPP_MODE", "demo").lower()
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "demo-verify-token")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")  # verifies webhook signatures when set

DEFAULT_COUNTRY = os.getenv("DEFAULT_COUNTRY", "AE")
# Delay between demo sends so progress is visible in the UI (seconds).
DEMO_SEND_DELAY = float(os.getenv("DEMO_SEND_DELAY", "0.12"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "2"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
MAX_UPLOAD_ROWS = int(os.getenv("MAX_UPLOAD_ROWS", "10000"))
