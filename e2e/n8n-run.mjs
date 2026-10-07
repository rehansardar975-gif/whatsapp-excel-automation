// Runs the SheetReach n8n workflow inside the n8n editor (real execution) and captures screenshots.
// Usage: N8N_EMAIL=... N8N_PASSWORD=... node e2e/n8n-run.mjs <workflowId> [n8nUrl] [sheetreachUrl]
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(`${execSync("npm root -g").toString().trim()}/playwright`); }

const [wfId, N8N = "http://localhost:5678", APP = "http://localhost:8000"] = process.argv.slice(2);
const OUT = new URL("../portfolio/screenshots/", import.meta.url).pathname;
if (!wfId || !process.env.N8N_EMAIL || !process.env.N8N_PASSWORD) { console.error("usage: N8N_EMAIL=.. N8N_PASSWORD=.. node e2e/n8n-run.mjs <workflowId>"); process.exit(2); }

const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, timezoneId: "Asia/Dubai" });
const page = await ctx.newPage();
await page.request.post(`${APP}/api/demo/reset`);

await page.goto(`${N8N}/signin`);
await page.locator('input[type="email"]').fill(process.env.N8N_EMAIL);
await page.locator('input[type="password"]').fill(process.env.N8N_PASSWORD);
await page.keyboard.press("Enter");
await page.waitForURL((u) => !u.pathname.includes("signin"), { timeout: 30000 });
await page.goto(`${N8N}/workflow/${wfId}`);
await page.waitForTimeout(4000);
await page.keyboard.press("Shift+1"); // zoom to fit
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}extra/n8n-workflow-before-run.png` });

const t0 = Date.now();
// run from the manual trigger (the webhook trigger is for production use)
const trigger = page.locator('[data-test-id="canvas-node"]').filter({ hasText: "Run manually" }).first();
await trigger.hover();
await trigger.locator('[data-test-id="execute-node-button"]').click(); // selects this trigger for the main button
await page.waitForTimeout(1500);
await page.getByText("from Run manually").first().click();
await page.waitForTimeout(9000);
// meanwhile in SheetReach: the campaign n8n started is processing
const app = await ctx.newPage();
let campId;
for (let i = 0; i < 30 && !campId; i++) {
  campId = (await (await app.request.get(`${APP}/api/campaigns`)).json()).find((c) => c.created_via === "n8n")?.id;
  if (!campId) await app.waitForTimeout(1000);
}
await app.goto(`${APP}/campaigns/${campId}`);
await app.getByTestId("via-badge").waitFor();
await app.waitForTimeout(2500);
await app.screenshot({ path: `${OUT}07-campaign-processing.png` });
// wait until SheetReach reports the n8n-started campaign as complete
let done = false;
for (let i = 0; i < 120 && !done; i++) {
  const cs = await (await page.request.get(`${APP}/api/campaigns`)).json();
  done = cs.some((c) => c.created_via === "n8n" && c.status === "completed");
  if (!done) await page.waitForTimeout(2000);
}
await app.reload();
await app.getByText("Campaign complete").waitFor();
await app.waitForTimeout(1500);
await app.screenshot({ path: `${OUT}08-campaign-results.png` });
await page.waitForTimeout(8000);
await page.screenshot({ path: `${OUT}06-n8n-workflow-run.png` });
// open the Final report node to show the run's output
await page.locator('[data-test-id="canvas-node"]').filter({ hasText: "Final report" }).first().dblclick();
await page.waitForTimeout(2000);
await page.locator('[data-test-id="output-panel"]').getByText("JSON", { exact: true }).click().catch(() => {});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}09-n8n-final-report.png` });
await page.keyboard.press("Escape");
// read the run's status from n8n's own Executions list (n8n binds API sessions to the browser, so use the UI)
await page.goto(`${N8N}/workflow/${wfId}/executions`);
const first = page.getByText(/^(Succeeded|Failed|Error|Running)/).first();
await first.waitFor({ timeout: 30000 });
const statusText = (await first.innerText()).trim();
const last = { status: statusText.startsWith("Succeeded") ? "success" : statusText };
console.log(`n8n execution: ${statusText}`);
if (!done || last.status !== "success") process.exitCode = 1;
console.log(`campaign completed: ${done} after ${Math.round((Date.now() - t0) / 1000)}s`);
await browser.close();
