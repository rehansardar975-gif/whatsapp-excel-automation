# Demo video — P07 SheetReach + n8n

**Video:** `portfolio/video/P07-sheetreach-n8n-demo.mp4`: 2 min 11 s, 1440×900, H.264, **voiceover + original background music**, with on-screen subtitles.
It was recorded automatically from the real running apps (SheetReach + n8n 2.42.4) with `e2e/record-demo.mjs`. The voiceover speaks **exactly the subtitle text** (from `_build/audio/captions.json`), and each line starts as its subtitle appears. Three silent stretches were cut (page loading, the end of the processing wait, one navigation); nothing on screen was staged. Licences: `video/VOICE-AND-MUSIC-LICENSE.md`.

## Sequence (subtitle = voiceover)
| Time | Screen | Subtitle / voiceover |
|---|---|---|
| 0:00 | Title card | Excel contacts → clean data → personalised WhatsApp campaign. SheetReach + n8n. The complete workflow, automated end to end. |
| 0:12 | Dashboard | Contacts live in Excel. Before a WhatsApp campaign, they must be cleaned, checked for consent and personalised — usually by hand. |
| 0:21 | Upload Excel | Upload a messy contact file. No setup needed. |
| 0:25 | Review & clean | SheetReach finds the columns, fixes number formats, removes duplicates, and blocks invalid and Do Not Contact numbers. |
| 0:34 | Import done | Only clean, consented contacts are saved. |
| 0:38 | Messages | Write the message once. The first name and company are filled in for every contact. |
| 0:44 | **n8n editor** | Now the automation. An n8n workflow takes a new 1,250-row Excel file and runs the whole process through the SheetReach API. |
| 0:57 | n8n executing | Running live: download the file, clean and validate, check opt-in and Do Not Contact, create the campaign, start sending. |
| 1:07 | n8n loop | The campaign is running. n8n keeps checking progress until the queue is finished. |
| 1:13 | SheetReach campaign (Started by n8n) | Messages go out one by one through the WhatsApp provider. Temporary errors are retried automatically. |
| 1:21 | Live processing | Sandbox mode for testing. The official WhatsApp Business Cloud API connects with the client's own Meta account. |
| 1:33 | Results | Clear results: sent, delivered, failed and skipped — each with a plain reason. |
| 1:39 | Opted-out tab | People who reply STOP are added to Do Not Contact and blocked from every future campaign. |
| 1:46 | Export | The full results are exported to Excel. |
| 1:50 | n8n executions | n8n finished the run: the execution succeeded, and the final report was built with the Excel results attached. |
| 1:58 | End card | Excel → clean contacts → WhatsApp campaign → report. Built on the official WhatsApp Business Cloud API design. Tested on a sandbox provider; the client's Meta account connects for live sending. |

## Rebuild
See `_build/audio/README.md` (voice clips → recording → subtitle sync → cut → music → mix).

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
| 10 | `10-architecture.png` (2400×1800) | Architecture: sandbox provider and Cloud API |

`extra/` holds supporting shots (upload error state, contact collection, activity log, integration page, mobile layout, and the workflow before the run). Use them only if you need them.
