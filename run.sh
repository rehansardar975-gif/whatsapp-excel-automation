#!/usr/bin/env bash
# One-command local run: installs dependencies (first time), builds the UI, starts the app on http://localhost:8000
set -euo pipefail
cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q -r backend/requirements.txt
(cd frontend && [ -d node_modules ] || npm install --no-audit --no-fund) && (cd frontend && npm run build)
cd backend && exec ../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
