# Demo recording plan — P07 (60–90 s, no code on screen)

Before recording: `./run.sh`, open http://localhost:8000, go to **WhatsApp & n8n → Reset demo**. Browser at 1440×900, zoom 100%.
Optional: `DEMO_SEND_DELAY=0.05` makes the 1,092-message campaign finish in about 1.5 minutes. Pause or cut during processing.

| Time | Screen | Action | Voice / caption |
|---|---|---|---|
| 0–6 s | Dashboard | Hover the 4 step cards | "Your contacts are in Excel. You want to send them a WhatsApp offer — safely." |
| 6–16 s | Upload Excel | Click **Use 1,250 contacts (Excel)** | "Upload the file. Nothing to configure." |
| 16–28 s | Review & clean | Hover the tiles, click **Duplicates removed**, then **Invalid numbers** | "It finds the columns, fixes number formats, removes 41 duplicates, flags invalid numbers and checks opt-in." |
| 28–32 s | Review & clean | Click **Import 1,164 contacts** | "Only clean contacts are saved." |
| 32–42 s | Messages | Type a message, click `{{first_name}}` / `{{company}}` | "Write the message once — every contact gets their own name and business." |
| 42–52 s | New Campaign | List → Next → pick message → Next → review | "One clear check before anything is sent: 1,092 contacts, this message, Demo Mode." |
| 52–64 s | Processing | **Start Campaign**, watch the progress | "Messages go through a queue. Temporary errors are retried automatically." |
| 64–80 s | Results | Scroll to the KPIs and reason cards, click **Failed** | "At the end you see exactly what happened — and why — and can export it to Excel." |
| 80–88 s | WhatsApp & n8n | Show the production flow | "Built on the official WhatsApp Business Cloud API, and ready to run from n8n." |

End card: *"Portfolio demo — simulated sending on fictional data."*

## Screenshot set (already captured in `screenshots/`, 2880×1800)
| File | Purpose |
|---|---|
| 01-dashboard | Thumbnail: the full workflow at a glance |
| 02-upload | Upload with a friendly error state |
| 03-validation | Automatic cleaning result |
| 04-contacts | Contact review with statuses and reasons |
| 05-message | Message builder + live preview |
| 06-campaign-review | Confirmation before sending |
| 07-processing | Live queue |
| 08-results | Outcome with reasons |
| 09-collection | Data preparation module |
| 10-activity | Audit trail |
| 11-integration | WhatsApp Cloud API + n8n architecture |
| 12-mobile-dashboard | Responsive proof |

Re-generate all of them: start the app, then `node e2e/journey.mjs`. Note that this resets the demo data first.
