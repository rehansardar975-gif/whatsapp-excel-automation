# Architecture — SheetReach (P07)

## Overview
```
 Browser (React + TS + Tailwind)
      │  JSON over /api  (same origin; Vite proxy in dev)
      ▼
 FastAPI routers ──► services (business logic) ──► SQLAlchemy models ──► SQLite / Postgres
                          │
                          ├─ importer: read_table → detect_mapping → analyze → commit
                          ├─ campaigns: eligibility → create (queued / skipped) → worker → report
                          └─ status_events.apply_event  ◄── Meta webhook  /  Demo provider follow-ups
                          │
                          ▼
                  WhatsAppProvider (abstract)
                   ├─ DemoWhatsAppProvider        (default sandbox)
                   └─ WhatsAppCloudAPIProvider     (Graph API, template messages)
```
Routers only validate input and translate errors. All rules live in `services/`, so the same logic serves the UI, an n8n workflow or a script.

## Key design decisions
| Decision | Why |
|---|---|
| **One eligibility function** (`campaigns.eligibility`) | Contacts page, audience preview, campaign creation and the send step all use the same rule: valid number + opt-in + not suppressed. |
| **Suppression keyed by phone, not contact** | A number that opted out stays blocked even if the contact is deleted and re-imported in a new file. |
| **Re-check suppression immediately before each send** | Someone who replies STOP while a 1,000-message campaign is running is not messaged later in that campaign. |
| **Skipped contacts are recorded as messages** | The report can say *who* was not messaged and *why*, not just a count. |
| **Message body snapshot per message** | Editing a template later never changes what a past campaign shows. |
| **Demo outcomes deterministic per phone number** | Same file → same result. Tests can assert each outcome, and recordings are repeatable. |
| **Demo provider feeds the real status handler** | Delivery receipts and STOP replies go through `apply_event`, the code Meta's webhook calls. The live path is the code that is tested. |
| **Status ordering** | Webhook statuses can arrive out of order; a message never moves backwards (delivered → sent). |
| **SQLite by default** | Zero setup for a reviewer. `DATABASE_URL` switches to Postgres; models use only portable types. |
| **In-process worker thread** | Enough for a demo; campaigns resume after restart (`processing` → `queued`). Production: Redis/RQ or Celery. |

## Data model
- `ImportBatch`: one upload or collection run. Holds raw rows only until import, plus the column mapping and summary.
- `Contact`: one per E.164 number (unique). Stores opt-in plus consent source and time, and last activity.
- `Suppression`: Do Not Contact list (phone, reason, source: manual / reply_stop / provider_opt_out / import).
- `Template`: name, category (marketing/utility), body with `{{fields}}`, fallbacks.
- `Campaign`: template snapshot, audience filter (list, country), status draft / running / paused / completed.
- `Message`: one per contact per campaign. Status queued / processing / sent / delivered / failed / skipped, plus reason, error code, provider message id, retry count, next attempt time and an opted-out flag.
- `Activity`: business events (import, duplicate, invalid, campaign, retry, failure, opt_out, consent, collection).

## Message lifecycle
```
create ─► queued ─► processing ─► provider.send_template()
                      │   accepted ─► sent ─► (status event) delivered
                      │   retryable error & retries left ─► queued (next_attempt_at = backoff)
                      │   other error ─► failed (+ suppress if 131050)
          skipped (at creation: not eligible  |  at send time: now on Do Not Contact)
STOP reply (webhook/demo) ─► Suppression + contact opt-in removed + message.opted_out
```

## Import pipeline
1. **Read:** `.xlsx` via openpyxl (first sheet with data, read-only) or `.csv` (encoding fallback utf-8-sig → cp1252, delimiter sniffing for `, ; tab |`).
2. **Header row:** the row among the first 10 that matches the most known column names, so title rows above the table are skipped.
3. **Mapping:** synonym matching ("Mobile", "WhatsApp Number", "Tel", "Shop", "Consent"…). The user can override it.
4. **Normalise:** Excel float cells, `00` prefixes, two numbers in one cell, extensions, country column → region hint; result is E.164 or a reason.
5. **Classify** in priority order: missing → invalid → duplicate (in file) → Do Not Contact → opted out in file → already saved → needs opt-in → ready.
6. **Commit:** saves *ready* and *needs opt-in*, adds file opt-outs to suppression, logs the activity, and discards the raw rows.

## Going live (Cloud API)
Set `WHATSAPP_MODE=cloud_api`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN`. Then register `https://<host>/api/webhooks/whatsapp` in the Meta app and create each message as an approved template. Its API name is the lower-snake-case form of the message name. Without credentials, `get_provider()` falls back to the sandbox provider, so the app can never claim to be live when it isn't.

**Not verified:** the Cloud API provider was not run against Meta (no business account in this project). Its request payload shape is unit-tested.

## n8n
`portfolio/n8n/whatsapp-excel-automation.json` (see `portfolio/n8n/README.md`) orchestrates the API:
`POST /api/imports` → `POST /api/imports/{id}/commit` → `POST /api/campaigns/audience-preview` → `GET /api/templates` → `POST /api/campaigns` → `POST /api/campaigns/{id}/start` → poll `GET /api/campaigns/{id}` → `GET /api/campaigns/{id}/export`.

Requests carry `X-Automation: n8n`. SheetReach stores it on the campaign (`created_via`, alphanumeric values only) and in the activity log, so users can see which campaigns an automation started.

Design rule: n8n holds **no business logic and no WhatsApp credentials**. Cleaning, consent, Do Not Contact and sending stay in SheetReach, so the UI and the automation can never disagree. Meta's status webhook points at SheetReach, not n8n, so delivery state and opt-outs are stored next to the contacts.

See `portfolio/screenshots/10-architecture.png` for the diagram (sandbox provider and official Cloud API).
