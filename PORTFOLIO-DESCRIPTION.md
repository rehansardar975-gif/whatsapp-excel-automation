# Upwork portfolio entry — Project 07 (draft, not uploaded)

**Title (short, 38 chars):** Excel to WhatsApp Business Automation
**Title (long):** Excel → WhatsApp Campaign Automation (Cloud API-ready, Demo Mode)

**Your role:** Automation engineer: designed, built and tested the full app (React, FastAPI, WhatsApp Cloud API integration layer)

## Description (short, 299 characters)
Excel contact list in, personalised WhatsApp campaign out. The app cleans numbers, removes duplicates, blocks opted-out and Do Not Contact numbers, sends through a queue with retries and reports why anything failed. A real n8n workflow runs it end to end. Cloud API-ready; demo sending is simulated.

## Description (long)
Many businesses keep their contacts in Excel and send WhatsApp offers by hand: cleaning numbers, removing duplicates, guessing who agreed to be contacted, and pasting the same message hundreds of times with no record afterwards.

SheetReach automates that. Upload an Excel or CSV file and it finds the columns, converts every number to international format, removes duplicates, flags invalid or missing numbers, and checks opt-in and a Do Not Contact list. You see the result before anything is saved, for example 1,250 rows → 1,092 ready, 41 duplicates, 15 invalid. One message with {{first_name}} and {{company}} is then personalised for every contact and sent through a queue that retries temporary errors and re-checks opt-outs before each message.

An n8n workflow runs the whole process automatically: new file → clean → consent check → campaign → progress tracking → Excel results → final report. The WhatsApp layer is built for Meta's official Business Cloud API. In this portfolio version, sending is simulated on fictional data and no real messages are sent.

## Skills
n8n · WhatsApp Business API · Workflow Automation · API Integration · Python (FastAPI) · React · Data Cleaning · Excel

## Image order (`portfolio/screenshots/`)
1. `01-dashboard.png`: the whole workflow on one screen *(thumbnail)*
2. `02-upload-validation.png`: 1,250 rows cleaned automatically
3. `06-n8n-workflow-run.png`: real n8n execution, every step green
4. `04-message-builder.png`: personalised message with live preview
5. `05-campaign-review.png`: one clear confirmation before sending
6. `07-campaign-processing.png`: live queue, started by n8n
7. `08-campaign-results.png`: results with a reason for every failure and skip
8. `09-n8n-final-report.png`: the report n8n builds at the end
9. `10-architecture.png`: demo provider vs official WhatsApp Cloud API
10. `03-contacts.png`: contacts with clear statuses (optional)

**Video:** `portfolio/video/P07-sheetreach-n8n-demo.mp4` (2 min 14 s, voiceover + music).

> Honesty note for the listing: say "Demo Mode, simulated sending, fictional data". Do not describe it as a client project or quote the demo numbers as real delivery rates.
