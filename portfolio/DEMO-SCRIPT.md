# Demo video — P07 SheetReach + n8n

**Video:** `portfolio/video/P07-sheetreach-n8n-demo.mp4`: 2 min 06 s, 1440×900, H.264, no audio, on-screen captions.
It was recorded automatically from the real running apps (SheetReach + n8n 2.42.4) with `e2e/record-demo.mjs`. Waiting time was cut and live processing sped up with ffmpeg; nothing was staged or edited into the screens.

## Sequence (as recorded)
| Time | Screen | What happens | Caption / suggested narration |
|---|---|---|---|
| 0:00 | Title card | — | “Excel contacts → clean data → personalised WhatsApp campaign. SheetReach + n8n.” |
| 0:05 | SheetReach dashboard | Overview | “Contacts live in Excel. Before a WhatsApp campaign they must be cleaned, checked for consent and personalised — usually by hand.” |
| 0:11 | Upload Excel | Sample messy CSV uploaded | “Upload a messy contact file. No setup.” |
| 0:14 | Review & clean | Summary tiles; *Invalid numbers* and *Do Not Contact* rows shown; **Import** | “SheetReach finds the columns, fixes number formats, removes duplicates and blocks invalid, opted-out and Do Not Contact numbers.” |
| 0:28 | Messages | Preview typed as Omar / Skyline Realty | “Write the message once. {{first_name}} and {{company}} are filled in for every contact.” |
| 0:39 | **n8n editor** | Workflow shown, **Execute workflow** clicked, nodes turn green live | “Now the automation: an n8n workflow takes a new 1,250-row Excel file and runs the full process through the SheetReach API.” |
| 0:55 | n8n (running) | Wait → Check progress loop running | “The campaign is running. n8n keeps checking progress until the queue is finished.” |
| 1:08 | SheetReach campaign | **Started by n8n** badge, live progress (sped up 3×) | “Messages go out one by one through the WhatsApp provider. Temporary errors are retried; opt-outs are re-checked before every send.” / “Demo Mode: sending is simulated…” |
| 1:22 | Results | KPIs, failure and skip reasons, *Failed* and *Opted out* tabs, Excel export | “Clear results… each with a plain reason.” / “People who replied STOP are added to Do Not Contact automatically…” |
| 1:46 | n8n executions | Execution **Succeeded** | “n8n finished the run: execution successful, final report built and the Excel results attached.” |
| 1:55 | End card | — | “Built on the official WhatsApp Business Cloud API design. The demo uses a simulated provider; the client's Meta account connects in production.” |

## Optional voiceover
The captions double as narration, read at a calm pace. If you add your own voice, keep the honesty lines: *“sending is simulated”* and *“fictional data”*.

## Re-record
1. Start SheetReach with `DEMO_SEND_DELAY=0.03` and start n8n with the workflow imported.
2. Run `N8N_EMAIL=… N8N_PASSWORD=… node e2e/record-demo.mjs <workflowId>`. The raw `.webm` is saved to `portfolio/video/raw/`.
3. Convert and cut with ffmpeg: speed up the processing stretch and drop idle waiting (see the commit history for the exact filter).

## Screenshot set (`portfolio/screenshots/`, 2880×1800 unless noted)
| # | File | Use on Upwork |
|---|---|---|
| 1 | `01-dashboard.png` | Thumbnail: the whole workflow at a glance |
| 2 | `02-upload-validation.png` | 1,250 rows cleaned automatically |
| 3 | `03-contacts.png` | Every contact with a status and a reason |
| 4 | `04-message-builder.png` | Personalised message + live preview |
| 5 | `05-campaign-review.png` | One clear confirmation before sending |
| 6 | `06-n8n-workflow-run.png` | Real n8n execution, all steps green |
| 7 | `07-campaign-processing.png` | Live queue, *Started by n8n* |
| 8 | `08-campaign-results.png` | Outcome with reasons |
| 9 | `09-n8n-final-report.png` | n8n final report output |
| 10 | `10-architecture.png` (2400×1800) | Architecture: demo provider vs Cloud API |

`extra/` holds supporting shots (upload error state, contact collection, activity log, integration page, mobile layout, and the workflow before the run). Use them only if you need them.
