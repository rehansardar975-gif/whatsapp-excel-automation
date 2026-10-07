"""WhatsApp Excel Campaigns — FastAPI application."""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .routers import campaigns, collection, contacts, imports, system, templates
from .seed import seed_if_empty
from .services.campaigns import resume_running_campaigns

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_: FastAPI):
    seed_if_empty()
    resume_running_campaigns()
    yield


app = FastAPI(title="WhatsApp Excel Campaigns API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
                   allow_methods=["*"], allow_headers=["*"])
for r in (contacts.router, imports.router, collection.router, templates.router, campaigns.router, system.router):
    app.include_router(r)


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    log.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})


@app.get("/api/health")
def health():
    return {"ok": True}


# Serve the built frontend (single-command run). In development, Vite serves it instead.
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = DIST / path
        return FileResponse(f if path and f.is_file() else DIST / "index.html")
