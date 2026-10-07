# Test report — SheetReach (P07)

Run on 7 Oct 2026 in a Linux cloud container: Python 3.13, Node 22, Chromium (Playwright 1.56). All data is fictional.

## Summary
| Suite | Result |
|---|---|
| Backend unit + API tests (`backend/tests`, pytest) | **42 passed, 0 failed** |
| Browser journey (`e2e/journey.mjs`, real UI in Chromium against the running app) | **33 / 33 checks passed** |
| n8n workflow (`portfolio/n8n/whatsapp-excel-automation.json`) executed in the n8n 2.42.4 editor (`e2e/n8n-run.mjs`) | **Succeeded**: 1,250-row file → 1,164 imported → campaign completed in ~80 s |
| TypeScript type check (`tsc -b`, strict) + production build | Passed, no errors |
| Live WhatsApp Cloud API | **Not verified against Meta**: no business account in this project. Provider selection, request shape and the mapping of success, error and network-failure responses are unit-tested with mocked responses. |

## Backend tests (what they prove)
| Area | Checks |
|---|---|
| Phone normalisation | 9 valid formats → correct E.164 (`050 123 4567`, `+971-50-…`, `00971…`, `971…`, Excel float `971501234567.0`, `(050) …`, Saudi local, UK with +44, two numbers in one cell); country column overrides the default; 4 invalid and 5 missing cases (`N/A`, `-`, blank…) |
| Personalisation | `{{first_name}}` / `{{ company }}` rendering, fallbacks for empty data, custom fallbacks, unknown field / empty / too-long body rejected |
| Cloud API readiness | Payload shape: `messaging_product`, template, named body parameters, `+` stripped |
| Export safety | Formula injection escaped; `+971…` numbers untouched |
| Excel upload | Title row above the header skipped, columns auto-detected, full name split, row classes 2 ready / 1 duplicate / 1 invalid / 1 missing / 1 opted out / 1 needs opt-in |
| CSV upload | Semicolon delimiter, wrong auto-mapping fixed by changing the column, consent confirmation turns *needs opt-in* into *ready*, unknown column rejected |
| Upload errors | Empty file, `.xls`, `.pdf`, corrupt `.xlsx`, no phone column → friendly messages |
| End-to-end workflow | Import → no double import (409) → file opt-out on Do Not Contact → re-upload shows *already saved* → search / status filter / sort → audience preview → campaign with queued + skipped → **contact suppressed after campaign creation is skipped at send time** → completed → cannot restart → **next campaign excludes the suppressed number** → opt-in cannot be re-added while suppressed → Excel/CSV export |
| Demo outcomes | Every message's outcome matches its deterministic bucket: success, not on WhatsApp (131026), stopped marketing (131050 → suppressed), limited (131049 → 2 retries → failed), retry then delivered, delivered then STOP, sent without receipt. Every opted-out recipient is on Do Not Contact |
| Validation | Unknown template (422), empty audience (422), bad template field (422), missing campaign (404) |
| Webhook | Verify token handshake (200 / 403); out-of-order "sent" doesn't downgrade "delivered"; inbound STOP reply → Do Not Contact |
| Contact collection | Steps Collected → Valid → Unique → New; duplicates found; Excel export; added contacts are all *Needs opt-in*; invalid industry rejected |
| Dashboard / activity | Mode is demo, counts present, activity type filter |

## Added in the finalisation round
| Area | Checks |
|---|---|
| Provider selection | Demo is the default; `WHATSAPP_MODE=cloud_api` **without** credentials stays Demo; with credentials it selects the Cloud API provider (`is_live`) |
| Cloud API responses (mocked HTTP) | 200 → accepted with message id, correct URL, Bearer header and number format; errors 131026 / 131049 / 131050 / 130429 → correct retry and opt-out flags plus a plain-language message; network error → retryable |
| Automation tracking | `X-Automation: n8n` → campaign `created_via = n8n`, "created/started via n8n" in the activity log; unsafe header values are ignored |
| Timestamps | API times carry an explicit UTC offset (see bug 9) |

## n8n workflow execution (`node e2e/n8n-run.mjs <workflowId>`)
Run in the n8n editor (self-hosted n8n 2.42.4) against the running SheetReach app, starting from **Run manually**:
| Step | Result |
|---|---|
| Download sample file → upload & clean | 1,250 rows analysed |
| Data quality report → import | 1,164 contacts imported (41 duplicates, 15 invalid, 18 missing, 12 Do Not Contact removed) |
| DNC & opt-in check | 1,092 eligible, 72 without opt-in |
| Create + start campaign | Campaign shows **Started by n8n** in SheetReach |
| Wait / Check progress loop | Looped until the campaign completed |
| Download results + Final report | Report JSON + 72 KB Excel attached |
| n8n execution status | **Succeeded** (several runs on 7 Oct 2026, ~55–80 s each) |

Also observed: the execution keeps running server-side while the browser moves to other pages (used in the video). The *Nothing new to send* branch (re-running the same file) was **not executed** in n8n. The SheetReach side of it (a re-uploaded file reports every contact as *already saved*, so `will_import = 0`) is covered by the backend tests.

## Browser journey (`node e2e/journey.mjs`)
| # | Check | Result |
|---|---|---|
| 1 | Dashboard loads with KPIs; "Demo Mode — WhatsApp Business API Ready" visible | ✅ |
| 2 | Uploading a `.pdf` shows a friendly error | ✅ |
| 3 | 1,250-row sample Excel analysed: 1,092 ready, 41 duplicates (also 72 need opt-in, 15 invalid, 18 missing, 12 Do Not Contact) | ✅ |
| 4 | Phone column auto-mapped to "Mobile"; clicking a summary tile filters the rows | ✅ |
| 5 | Import completes | ✅ |
| 6 | Contacts: *Needs opt-in* tab shows the reason; no-match search shows the empty state; Excel export downloads | ✅ |
| 7 | Message builder: inserted fields give a live personalised preview; unknown `{{nickname}}` is flagged | ✅ |
| 8 | Campaign audience preview = 1,092 ready; review screen shows count + Demo Mode notice | ✅ |
| 9 | Live progress while sending; pause → "Paused"; resume → completes | ✅ |
| 10 | Results add up: processed 1,164 = sent 1,041 + failed 51 + skipped 72; delivered 1,018 | ✅ |
| 11 | Failed tab shows plain-language reasons; results export downloads | ✅ |
| 12 | After the campaign, 32 opted-out numbers in that list are excluded from the next campaign | ✅ |
| 13 | Contact collection runs and adds businesses as *Needs opt-in* | ✅ |
| 14 | 9 pages at phone width (390 px): no page-level horizontal scroll; mobile menu opens | ✅ |
| 15 | No browser console errors (the intentional 422 from the bad upload excluded) | ✅ |

All numbers above are **simulated Demo Mode results on fictional data**, not real delivery statistics.

## Problems found and fixed during testing
1. `N/A` in a phone cell was split on "/" and reported as *invalid* instead of *missing*. Fixed: placeholder values are checked before splitting multi-number cells.
2. Final failure after retries said "will retry later". Now it reads "… (gave up after 2 retries)".
3. Seed backdating used SQL date arithmetic that SQLite stores as a number, which broke date parsing. Moved to Python.
4. Collection run matched websites by phone number, which collides for blank or duplicate numbers. Now matched by row.
5. UX: the **Import** button was below the fold on the review screen. Moved into an action bar directly under the summary.
6. UX: unused First/Last name selectors were shown when a Full name column exists. Hidden.
7. UX: the "Processed" count during sending looked inconsistent with "62 of 1,092". The card now says "incl. 72 skipped".
8. UX: smaller copy fixes (lower-cased "whatsapp" in skip reasons, truncated dashboard step text, chat preview initials, "Awaiting delivery" label).

9. **Time-zone bug (found while recording the demo):** SQLite returns timestamps without a time zone, so the API sent `11:55` without "Z", and a browser in Dubai showed UTC as local time while n8n showed 15:54. Fixed: the API now always sends an explicit UTC offset, and a regression test was added.
10. The n8n test script couldn't read execution status through the n8n API (n8n ties API sessions to the browser). It now reads the status from n8n's Executions view.
11. During the video recording the n8n execution-preview step could hang, so it was removed from the recording script.

## Not tested / limits
- Real WhatsApp sending, template approval and real webhook deliveries from Meta: **not verified because** no WhatsApp Business account or Meta app is connected (by design for a portfolio demo).
- Load beyond 10,000 rows per upload (the enforced limit) and multiple simultaneous users. The in-process queue is single-server.
- Browsers other than Chromium.
- n8n versions other than 2.42.4 (the workflow only uses standard core nodes).
- The n8n webhook trigger path (`POST /webhook/sheetreach-new-contacts`): built, but only the manual trigger was executed.
