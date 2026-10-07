# n8n workflow — SheetReach: Excel to WhatsApp campaign

File: `whatsapp-excel-automation.json`. Import it in n8n with **Workflows → Import from file**.

The workflow runs the whole process without anyone opening SheetReach: it takes a contact file, cleans and validates it, checks opt-in and Do Not Contact, starts a personalised campaign, tracks it to the end and builds a report with the Excel results attached.

All business rules (cleaning, duplicates, consent, Do Not Contact, sending, retries) live in SheetReach. n8n orchestrates them through the SheetReach REST API, so nothing is duplicated and n8n never talks to WhatsApp directly.

## Nodes (24 in total, including 4 section notes)
| # | Node | Type | What it does |
|---|---|---|---|
| 1 | Run manually / New file webhook | Manual Trigger, Webhook | Start by hand, or `POST /webhook/sheetreach-new-contacts` with `{"fileUrl": "https://…/contacts.xlsx"}` (e.g. from Google Drive, a form or a CRM export) |
| 2 | Settings | Edit Fields (Set) | The only node to edit: SheetReach URL, file, default country, message name, campaign name, polling interval |
| 3 | Download contact file | HTTP Request | Gets the Excel/CSV file as binary |
| 4 | Upload & clean in SheetReach | HTTP Request (multipart) | `POST /api/imports`: column detection, number normalisation, duplicates, invalid/missing, Do Not Contact |
| 5 | Data quality report | Code | Short, readable summary; stops with a clear error if no phone column is found |
| 6 | New contacts to import? | IF | False → *Nothing new to send* |
| 7 | Import clean contacts | HTTP Request | `POST /api/imports/{id}/commit` |
| 8 | DNC & opt-in check | HTTP Request | `POST /api/campaigns/audience-preview`: how many can legally be messaged and why the others are excluded |
| 9 | Anyone ready to message? | IF | False → *Nothing new to send* |
| 10 | Load message templates → Pick message | HTTP Request, Code | Finds the message named in Settings and fails clearly if it doesn't exist |
| 11 | Create personalised campaign | HTTP Request | `POST /api/campaigns`: every contact gets their own `{{first_name}}` / `{{company}}` message |
| 12 | Start sending (WhatsApp provider) | HTTP Request | `POST /api/campaigns/{id}/start` |
| 13 | Wait → Check progress → Campaign finished? | Wait, HTTP Request, IF | Polling loop until the queue is complete |
| 14 | Download results (Excel) | HTTP Request | `GET /api/campaigns/{id}/export?format=xlsx` |
| 15 | Final report | Code | Cleaning numbers, campaign outcome, failure and skip reasons, link to the campaign, and the Excel file attached |
| — | Nothing new to send | Code | Ends cleanly, with a reason, when there is nobody new to message |

Every SheetReach call sends the header `X-Automation: n8n`, so SheetReach shows **Started by n8n** on the campaign and "via n8n" in the activity log.

## Run it locally (about 5 minutes)
1. Start SheetReach: `./run.sh` → http://localhost:8000
2. Start n8n, e.g. `docker run -it --rm -p 5678:5678 n8nio/n8n`, or use your existing n8n.
3. Import `whatsapp-excel-automation.json`.
4. Open **Settings** and set `sheetreachUrl`:
   - n8n installed directly on the same machine: `http://localhost:8000`
   - **n8n in Docker on the same machine: `http://host.docker.internal:8000`**. Inside a container, `localhost` is the container itself. On Linux, add `--add-host=host.docker.internal:host-gateway` to `docker run`.
   - SheetReach on a server: its public URL
5. In SheetReach, click **WhatsApp & n8n → Reset demo** so the sample file counts as new contacts.
6. In n8n, click **Execute workflow** (from *Run manually*). With the default sample file the run takes about 1–2 minutes; the Wait loop checks progress every 3 seconds.
7. Open the **Final report** node → Output → JSON. The Excel results are attached as binary data.

Running it a second time without a reset is designed to end at **Nothing new to send**, because every contact is already saved. This branch was not executed in testing; the main path was.

## Credentials and secrets
- The workflow contains **no tokens, passwords or API keys**.
- The WhatsApp credentials (Meta access token, phone number ID, app secret) belong in **SheetReach's** environment variables (`.env`), never in n8n. SheetReach chooses the provider: Demo by default, the WhatsApp Cloud API when `WHATSAPP_MODE=cloud_api` and the credentials are set.
- The SheetReach demo API has no login. Before exposing it on the internet, put it behind authentication (e.g. an API key checked by a reverse proxy) and add an n8n **Header Auth** credential to the HTTP Request nodes.

## Verified
Executed in n8n **2.42.4** (self-hosted, local) against a running SheetReach instance on 7 Oct 2026:
- Status **success**, about 1 minute per run.
- 1,250-row file → 1,164 contacts imported → campaign of 1,164 (1,092 queued, 72 skipped for no opt-in).
- Demo outcome: 1,041 sent, 1,018 delivered, 51 failed, 32 opted out.
- The final report includes the Excel results file.

Node types used: Manual Trigger, Webhook, Edit Fields (Set) v3.4, HTTP Request v4.2, Code v2, IF v2, Wait v1.1, Sticky Note. These are standard core nodes available in current n8n 1.x and 2.x. Only 2.42.4 was tested.
