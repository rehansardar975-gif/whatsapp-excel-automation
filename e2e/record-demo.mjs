// Records the portfolio demo video: SheetReach + a real n8n execution, one continuous browser session.
// Usage: N8N_EMAIL=.. N8N_PASSWORD=.. node e2e/record-demo.mjs <workflowId> [n8nUrl] [sheetreachUrl]
// Output: portfolio/video/raw/*.webm (convert with ffmpeg, see portfolio/DEMO-SCRIPT.md)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(`${execSync("npm root -g").toString().trim()}/playwright`); }

const [wfId, N8N = "http://localhost:5678", APP = "http://localhost:8000"] = process.argv.slice(2);
const RAW = new URL("../portfolio/video/raw/", import.meta.url).pathname;
const SHOTS = new URL("../portfolio/screenshots/", import.meta.url).pathname;
mkdirSync(RAW, { recursive: true });
const W = 1440, H = 900;

const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, timezoneId: "Asia/Dubai", recordVideo: { dir: RAW, size: { width: W, height: H } } });
const login = await ctx.request.post(`${N8N}/rest/login`, { data: { emailOrLdapLoginId: process.env.N8N_EMAIL, password: process.env.N8N_PASSWORD } });
if (!login.ok()) throw new Error(`n8n login failed: ${login.status()}`);
await ctx.request.post(`${APP}/api/demo/reset`);
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);

const CAP_CSS = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;max-width:1100px;" +
  "background:rgba(11,15,23,.94);color:#fff;font:600 19px/1.4 Inter,system-ui,sans-serif;padding:14px 24px;border-radius:12px;" +
  "box-shadow:0 12px 40px rgba(0,0,0,.35);border-left:4px solid #14b8a6;letter-spacing:-.01em;text-align:left;pointer-events:none";
async function cap(text, step, top = false) {
  const css = top ? CAP_CSS.replace("bottom:28px", "top:118px") : CAP_CSS;
  await page.evaluate(([t, s, css]) => {
    let el = document.getElementById("demo-cap");
    if (!el) { el = document.createElement("div"); el.id = "demo-cap"; document.body.appendChild(el); }
    el.style.cssText = css;
    el.innerHTML = (s ? `<span style="font:600 12px/1 'JetBrains Mono',monospace;letter-spacing:.16em;color:#5eead4;display:block;margin-bottom:6px">${s}</span>` : "") + t;
  }, [text, step, css]);
}
async function card(title, sub, foot) {
  await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@500;600&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet"></head>
  <body style="margin:0;height:100vh;background:#0B0F17;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 110px;font-family:Inter;overflow:hidden;position:relative">
  <div style="position:absolute;width:900px;height:900px;border-radius:50%;right:-260px;top:-300px;background:radial-gradient(circle,rgba(20,184,166,.25),rgba(20,184,166,0) 62%)"></div>
  <p style="font:600 15px 'JetBrains Mono';letter-spacing:.2em;color:#5eead4;margin:0">P07 · PORTFOLIO DEMO</p>
  <h1 style="font:800 64px/1.05 'Plus Jakarta Sans';letter-spacing:-.03em;margin:18px 0 0;max-width:1100px">${title}</h1>
  <p style="font:500 26px/1.4 Inter;color:#C7CDE0;margin:22px 0 0;max-width:1050px">${sub}</p>
  <p style="position:absolute;left:110px;bottom:56px;font:600 13px 'JetBrains Mono';letter-spacing:.14em;color:#64748B;margin:0">${foot}</p></body></html>`);
  await page.waitForLoadState("networkidle").catch(() => {});
}

// 1 · Title
await card("Excel contacts → clean data → personalised WhatsApp campaign",
  "SheetReach + n8n. The complete workflow, automated end to end.",
  "FICTIONAL SAMPLE DATA · DEMO WHATSAPP PROVIDER · NO REAL MESSAGES ARE SENT");
await wait(4500);

// 2 · Dashboard
await page.goto(APP); await page.getByTestId("kpi-contacts").waitFor();
await cap("Contacts live in Excel. Before a WhatsApp campaign they must be cleaned, checked for consent and personalised — usually by hand.", "THE PROBLEM");
await wait(5500);

// 3 · Upload + automatic cleaning
await page.goto(`${APP}/import`); await page.getByTestId("dropzone").waitFor();
await cap("Upload a messy contact file. No setup.", "STEP 1 · UPLOAD");
await wait(2200);
await page.getByTestId("sample-sample-contacts-messy.csv").click();
await page.getByTestId("import-summary").waitFor();
await cap("SheetReach finds the columns, fixes number formats, removes duplicates and blocks invalid, opted-out and Do Not Contact numbers.", "STEP 2 · CLEAN & VALIDATE");
await wait(5500);
await page.getByText("Invalid numbers").first().click(); await wait(2500);
await page.getByText("Do Not Contact").first().click(); await wait(2500);
await page.getByTestId("import-commit").click(); await page.getByTestId("import-done").waitFor();
await cap("Only clean, consented contacts are saved.", "STEP 2 · CLEAN & VALIDATE"); await wait(3000);

// 4 · Message personalisation
await page.goto(`${APP}/messages`); await page.getByTestId("template-list").waitFor();
await page.getByTestId("template-list").getByText("New catalogue announcement").click();
await cap("Write the message once. {{first_name}} and {{company}} are filled in for every contact.", "STEP 3 · PERSONALISE");
await wait(2500);
const nameField = page.locator('input[placeholder*="there"]');
await nameField.fill(""); await nameField.type("Omar", { delay: 120 });
const coField = page.locator('input[placeholder*="your business"]');
await coField.fill(""); await coField.type("Skyline Realty", { delay: 70 });
await wait(3000);

// 5 · n8n runs the whole process
await page.goto(`${N8N}/workflow/${wfId}`);
await page.locator('[data-test-id="canvas-node"]').first().waitFor({ timeout: 30000 });
await wait(2500); await page.keyboard.press("Shift+1"); await wait(800);
await cap("Now the automation: an n8n workflow takes a new 1,250-row Excel file and runs the full process through the SheetReach API.", "STEP 4 · n8n AUTOMATION", true);
await wait(5000);
const trigger = page.locator('[data-test-id="canvas-node"]').filter({ hasText: "Run manually" }).first();
await trigger.hover(); await trigger.locator('[data-test-id="execute-node-button"]').click(); await wait(1200);
await page.getByText("from Run manually").first().click();
await cap("Running live: download file → clean & validate → DNC & opt-in check → create campaign → start sending.", "STEP 4 · n8n AUTOMATION", true);
await wait(11000);
await cap("The campaign is running. n8n keeps checking progress until the queue is finished.", "STEP 4 · n8n AUTOMATION", true);
await wait(4000);

// 6 · Live processing in SheetReach
let campId;
for (let i = 0; i < 30 && !campId; i++) {
  const cs = await (await page.request.get(`${APP}/api/campaigns`)).json();
  campId = cs.find((c) => c.created_via === "n8n")?.id; if (!campId) await wait(1000);
}
await page.goto(`${APP}/campaigns/${campId}`); await page.getByTestId("progress-card").waitFor();
await cap("Messages go out one by one through the WhatsApp provider. Temporary errors are retried; opt-outs are re-checked before every send.", "STEP 5 · PROCESSING (DEMO PROVIDER)");
await wait(9000);
await page.getByText("Waiting", { exact: false }).first().click().catch(() => {}); await wait(2500);
await page.getByTestId("tab-").first().click().catch(() => {});
await cap("Demo Mode: sending is simulated so the full workflow can be shown safely. The official WhatsApp Business Cloud API plugs in when the client's credentials are available.", "STEP 5 · PROCESSING (DEMO PROVIDER)");
await page.waitForFunction(() => document.querySelector('[data-testid="progress-title"]')?.textContent?.includes("Campaign complete"), null, { timeout: 240000, polling: 500 });

// 7 · Results
await page.evaluate(() => document.querySelector("main").scrollTo(0, 0));
await cap("Clear results: sent, delivered, failed, skipped and opted out — each with a plain reason.", "STEP 6 · RESULTS");
await wait(5500);
await page.evaluate(() => document.querySelector("main").scrollTo({ top: 520, behavior: "smooth" })); await wait(3500);
await page.getByTestId("tab-failed").click(); await wait(3000);
await page.getByTestId("tab-opted_out").click();
await cap("People who replied STOP are added to Do Not Contact automatically and blocked from every future campaign.", "SAFETY");
await wait(4500);
await page.evaluate(() => document.querySelector("main").scrollTo({ top: 0, behavior: "smooth" })); await wait(1200);
const dl = page.waitForEvent("download"); await page.getByTestId("export-results").click(); await dl;
await cap("Full results exported to Excel.", "STEP 6 · RESULTS"); await wait(3000);

// 8 · n8n finished + final report
await wait(4000);
await page.goto(`${N8N}/workflow/${wfId}/executions`); await wait(5000);
await cap("n8n finished the run: execution successful, final report built and the Excel results attached.", "STEP 7 · REPORT", true);
await wait(3000);

await wait(3000);

// 9 · End card
await card("Excel → clean contacts → WhatsApp campaign → report",
  "Built on the official WhatsApp Business Cloud API design. The demo uses a simulated provider; the client's Meta account connects in production.",
  "SHEETREACH · PORTFOLIO PROJECT 07 · FICTIONAL DATA — NOT A CLIENT PROJECT");
await wait(5000);
const video = page.video(); await page.close(); await ctx.close();
console.log("video:", await video.path());
await browser.close();
