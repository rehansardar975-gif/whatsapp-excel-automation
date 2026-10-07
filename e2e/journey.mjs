// Browser test of the full client journey + portfolio screenshots.
// Usage: node e2e/journey.mjs [baseUrl]   (app must be running; uses Playwright + Chromium)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(`${execSync("npm root -g").toString().trim()}/playwright`); }

const BASE = process.argv[2] || "http://localhost:8000";
const OUT = new URL("../portfolio/screenshots/", import.meta.url).pathname;
mkdirSync(`${OUT}extra`, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };

const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true, timezoneId: "Asia/Dubai" });
const page = await ctx.newPage();
const consoleErrors = [];
// the 422 from the deliberately invalid upload is expected; anything else is a bug
page.on("console", (m) => m.type() === "error" && !m.text().includes("422") && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(e.message));
const shot = (n) => page.screenshot({ path: `${OUT}${n}.png` });
const text = async (sel) => (await page.locator(sel).first().innerText()).trim();

// reset to a known state
await page.request.post(`${BASE}/api/demo/reset`);

// 1 Dashboard
await page.goto(BASE);
await page.getByTestId("kpi-contacts").waitFor();
check("Dashboard loads with KPIs", (await text('[data-testid="kpi-contacts"]')).includes("175"));
check("Demo Mode label visible", (await text('[data-testid="demo-mode-pill"]')).includes("Sandbox · WhatsApp Cloud API ready"));
await shot("01-dashboard");

// 2 Upload: error state first
await page.goto(`${BASE}/import`);
await page.getByTestId("file-input").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
await page.getByTestId("upload-error").waitFor();
check("Unsupported file shows friendly error", (await text('[data-testid="upload-error"]')).includes("Excel (.xlsx) or CSV"));
await shot("extra/upload-error");

// 3 Upload sample Excel -> automatic validation
await page.getByTestId("sample-sample-contacts-1250.xlsx").click();
await page.getByTestId("import-summary").waitFor();
const total = await text('[data-testid="sum-total"]');
const ready = await text('[data-testid="sum-ready"]');
const dups = await text('[data-testid="sum-duplicate"]');
check("Excel upload detected and analysed", total === "1,250", `rows=${total} ready=${ready} duplicates=${dups}`);
check("Phone column auto-mapped", (await page.getByTestId("map-phone").inputValue()) === "Mobile");
await shot("02-upload-validation");
await page.getByText("Duplicates removed").click();
check("Filter rows by result", (await page.locator('[data-testid="import-table"] tbody tr').count()) === Number(dups));
await page.getByTestId("import-commit").click();
await page.getByTestId("import-done").waitFor();
check("Import completes", (await text('[data-testid="import-done"] h2')).includes("contacts imported"));

// 4 Contacts review
await page.goto(`${BASE}/contacts`);
await page.getByTestId("contacts-table").waitFor();
await page.getByTestId("tab-needs_opt_in").click();
await page.waitForTimeout(600);
const firstStatus = await text('[data-testid="contacts-table"] tbody tr td:nth-child(6)');
check("Status filter: Needs opt-in shows reason", firstStatus.includes("No WhatsApp opt-in on record"));
await page.getByTestId("tab-").click();
await page.getByTestId("contact-search").fill("zzzz-no-match");
await page.getByText("No contacts match").waitFor();
check("Search empty state", true);
await page.getByTestId("contact-search").fill("");
await page.waitForTimeout(600);
await shot("03-contacts");
const dl = page.waitForEvent("download");
await page.getByTestId("export-contacts").click();
check("Contacts export downloads", (await (await dl).suggestedFilename()) === "contacts.xlsx");

// 5 Message builder
await page.goto(`${BASE}/messages`);
await page.getByTestId("tpl-body").waitFor();
await page.getByTestId("new-message").click();
await page.getByTestId("tpl-name").fill("Eid offer — retail customers");
await page.getByTestId("tpl-body").fill("Hi ");
await page.getByTestId("insert-first_name").click();
await page.getByTestId("tpl-body").press("End");
await page.getByTestId("tpl-body").type(", Eid Mubarak! As a thank-you to ");
await page.getByTestId("insert-company").click();
await page.getByTestId("tpl-body").press("End");
await page.getByTestId("tpl-body").type(", enjoy 20% off your next order this week. Reply YES for the catalogue. Reply STOP to opt out.");
await page.waitForTimeout(500);
check("Live personalised preview", (await text('[data-testid="chat-preview"]')).includes("Hi Sara, Eid Mubarak! As a thank-you to Palm Grill Kitchen"));
await page.getByTestId("tpl-save").click();
await page.waitForTimeout(600);
await shot("04-message-builder");
await page.getByTestId("tpl-body").fill("Hi {{nickname}}");
await page.getByTestId("tpl-errors").waitFor();
check("Unknown field is flagged", (await text('[data-testid="tpl-errors"]')).includes("Unknown field"));

// 6 Campaign wizard -> review
await page.goto(`${BASE}/campaigns/new`);
await page.locator('[data-testid="aud-list"] option', { hasText: "sample-contacts-1250" }).waitFor({ state: "attached" });
const opts = await page.locator('[data-testid="aud-list"] option').allTextContents();
await page.getByTestId("aud-list").selectOption({ label: opts.find((o) => o.includes("sample-contacts-1250")) });
await page.waitForTimeout(700);
const audReady = await text('[data-testid="aud-ready"]');
check("Audience preview counts ready contacts", audReady === ready, `ready=${audReady}`);
await page.getByTestId("next-1").click();
await page.locator('[data-testid^="pick-template-"]').filter({ hasText: "Eid offer" }).click();
await page.getByTestId("next-2").click();
await page.getByTestId("campaign-review").waitFor();
check("Review shows contact count + demo notice", (await text('[data-testid="review-ready"]')).startsWith(ready));
await shot("05-campaign-review");

// 7 Processing
await page.getByTestId("start-campaign").click();
await page.getByTestId("progress-card").waitFor();
await page.waitForTimeout(6000);
check("Live progress while sending", (await text('[data-testid="progress-title"]')).startsWith("Sending"));
await shot("extra/ui-campaign-processing");
await page.getByTestId("pause-btn").click();
await page.getByTestId("resume-btn").waitFor();
check("Pause works", (await text('[data-testid="progress-title"]')).startsWith("Paused"));
await page.getByTestId("resume-btn").click();
await page.waitForFunction(() => document.querySelector('[data-testid="progress-title"]')?.textContent?.includes("Campaign complete"), null, { timeout: 300000, polling: 1000 });
check("Campaign completes", true);
await page.evaluate(() => document.querySelector("main").scrollTo(0, 0));
await page.waitForTimeout(800);
await shot("extra/ui-campaign-results");
const kpi = async (id) => Number((await text(`[data-testid="${id}"] p.font-num`)).replace(/,/g, ""));
const [p, s, d, f, k] = [await kpi("kpi-processed"), await kpi("kpi-sent"), await kpi("kpi-delivered"), await kpi("kpi-failed"), await kpi("kpi-skipped")];
check("Results add up (sent + failed + skipped = processed)", s + f + k === p && d <= s && p > 0, `processed=${p} sent=${s} delivered=${d} failed=${f} skipped=${k}`);
await page.getByTestId("tab-failed").click();
await page.waitForTimeout(600);
check("Failed messages show plain-language reason", (await text('[data-testid="queue-table"] tbody')).match(/not on WhatsApp|stopped marketing|limited marketing/) !== null);
const dl2 = page.waitForEvent("download");
await page.getByTestId("export-results").click();
check("Results export downloads", (await (await dl2).suggestedFilename()).endsWith("-results.xlsx"));

// 8 Suppression: opted-out contacts excluded from the next campaign
const sup = await (await page.request.get(`${BASE}/api/suppressions`)).json();
const lists = await (await page.request.get(`${BASE}/api/lists`)).json();
const prev = await (await page.request.post(`${BASE}/api/campaigns/audience-preview`, { data: { batch_id: lists.find((l) => l.name.includes("1250")).id } })).json();
const dnc = prev.excluded_reasons.find((r) => r.reason === "On Do Not Contact list");
check("Opt-outs excluded from future campaigns", !!dnc && dnc.count > 0, `${sup.length} numbers on Do Not Contact; ${dnc?.count} excluded from this list`);

// 9 Contact collection
await page.goto(`${BASE}/collect`);
await page.getByTestId("col-run").click();
await page.getByTestId("col-steps").waitFor();
await shot("extra/contact-collection");
await page.getByTestId("col-add").click();
await page.getByText(/View \d+ added contacts/).waitFor();
check("Collected contacts added as Needs opt-in", true);

// 10 Activity + integration
await page.goto(`${BASE}/activity`);
await page.getByTestId("activity-list").waitFor();
await shot("extra/activity-log");
await page.goto(`${BASE}/integration`);
await page.getByText("Production automation flow").waitFor();
await shot("extra/integration-page");

// 11 Responsive (phone)
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await m.newPage();
for (const path of ["/", "/import", "/contacts", "/messages", "/campaigns/new", "/campaigns", "/collect", "/activity", "/integration"]) {
  await mp.goto(BASE + path);
  await mp.waitForTimeout(900);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`Mobile layout ${path}: no page-level horizontal scroll`, overflow <= 0, overflow > 0 ? `${overflow}px` : "");
}
await mp.goto(BASE + "/");
await mp.waitForTimeout(900);
await mp.screenshot({ path: `${OUT}extra/mobile-dashboard.png` });
await mp.getByTestId("mobile-menu-btn").click();
check("Mobile menu opens", await mp.getByTestId("nav-contacts").last().isVisible());

check("No browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
