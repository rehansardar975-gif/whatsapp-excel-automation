# Test report — SheetReach (P07)

Run on 7 Oct 2026 in a Linux cloud container: Python 3.13, Node 22, Chromium (Playwright 1.56). All data is fictional.

## Summary
| Suite | Result |
|---|---|
| Backend unit + API tests (`backend/tests`, pytest) | **32 passed, 0 failed** |
| Browser journey (`e2e/journey.mjs`, real UI in Chromium against the running app) | **33 / 33 checks passed** |
| TypeScript type check (`tsc -b`, strict) + production build | Passed, no errors |
| Live WhatsApp Cloud API | **Not verified** — no Meta business account in this project. Only the request payload shape is unit-tested. |

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

## Not tested / limits
- Real WhatsApp sending, template approval and real webhook deliveries from Meta: **not verified because** no WhatsApp Business account or Meta app is connected (by design for a portfolio demo).
- Load beyond 10,000 rows per upload (the enforced limit) and multiple simultaneous users. The in-process queue is single-server.
- Browsers other than Chromium.
