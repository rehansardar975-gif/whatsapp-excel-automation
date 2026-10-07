# Upwork portfolio entry — Project 07 (draft, not uploaded)

**Title (short, 38 chars):** Excel to WhatsApp Business Automation
**Title (long):** Excel → WhatsApp Campaign Automation (Cloud API-ready, Demo Mode)

**Your role:** Automation engineer: designed, built and tested the full app (React, FastAPI, WhatsApp Cloud API integration layer)

## Description (short, ~290 chars)
Upload a contact Excel; the app cleans it (number formats, duplicates, invalid numbers, opt-outs), shows who can be messaged, sends a personalised WhatsApp message through a queue with retries, and reports what happened and why. Built on the official Cloud API design; runs in Demo Mode.

## Description (long)
Many businesses keep customer and lead contacts in Excel and send WhatsApp offers by hand. That means cleaning numbers, removing duplicates, guessing who agreed to be contacted, and pasting the same message hundreds of times with no record afterwards.

I built a tool for that workflow. You upload an Excel or CSV file and it finds the right columns automatically, converts every number to international format, removes duplicates and flags invalid or missing numbers. It also checks opt-in and a Do Not Contact list. You see the result before anything is saved, for example 1,250 rows → 1,092 ready, 41 duplicates, 15 invalid.

Then you write one message with {{first_name}} and {{company}}, check the preview and start the campaign. Messages go through a queue: temporary WhatsApp errors are retried, and people who reply STOP are blocked from future campaigns automatically. The report shows sent, delivered, failed and skipped, each with a plain reason, and exports to Excel.

The WhatsApp layer follows the official Business Cloud API (approved templates, status webhook, error codes). In this portfolio version it runs in Demo Mode: sending is simulated on fictional data, and no real messages are sent. Every step is also an API call, so it can be driven from an n8n workflow.

## Skills
WhatsApp Business API · Automation · Python (FastAPI) · React · API Integration · Data Cleaning · Excel · n8n

## Image order (`portfolio/screenshots/`)
1. `01-dashboard.png`: the whole workflow on one screen *(thumbnail)*
2. `03-validation.png`: 1,250 rows checked automatically
3. `04-contacts.png`: every contact with a clear status
4. `05-message.png`: personalised message with live preview
5. `06-campaign-review.png`: one clear confirmation before sending
6. `07-processing.png`: live queue with retries
7. `08-results.png`: results with reasons for every failure and skip
8. `11-integration.png`: WhatsApp Cloud API + n8n production flow

> Honesty note for the listing: say "Demo Mode, simulated sending, fictional data". Do not describe it as a client project or quote the demo numbers as real delivery rates.
