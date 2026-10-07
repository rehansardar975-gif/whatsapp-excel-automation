// Records the portfolio demo video from the running apps (SheetReach + a real n8n execution).
// Subtitles come from portfolio/_build/audio/captions.json; each stays on screen for at least the
// length of its voice clip (durations.json), and the moment it appears is logged so the voiceover
// (the same words) can be placed exactly. Usage:
//   N8N_EMAIL=.. N8N_PASSWORD=.. node e2e/record-demo.mjs <workflowId> [n8nUrl] [sheetreachUrl]
// Output: portfolio/video/raw/<main>.webm + events.json
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(`${execSync("npm root -g").toString().trim()}/playwright`); }

const [wfId, N8N = "http://localhost:5678", APP = "http://localhost:8000"] = process.argv.slice(2);
const AUDIO = new URL("../portfolio/_build/audio/", import.meta.url).pathname;
const RAW = new URL("../portfolio/video/raw/", import.meta.url).pathname;
mkdirSync(RAW, { recursive: true });
const CAPS = Object.fromEntries(JSON.parse(readFileSync(`${AUDIO}captions.json`, "utf8")).map((c) => [c.id, c]));
const DUR = JSON.parse(readFileSync(`${AUDIO}durations.json`, "utf8"));
const W = 1440, H = 900;

const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, timezoneId: "Asia/Dubai", recordVideo: { dir: RAW, size: { width: W, height: H } } });
const login = await ctx.request.post(`${N8N}/rest/login`, { data: { emailOrLdapLoginId: process.env.N8N_EMAIL, password: process.env.N8N_PASSWORD } });
if (!login.ok()) throw new Error(`n8n login failed: ${login.status()}`);
await ctx.request.post(`${APP}/api/demo/reset`);
const page = await ctx.newPage();
const t0 = Date.now();
const wait = (ms) => page.waitForTimeout(ms);
const events = [];
let minNext = 0;
const hold = async () => { const ms = minNext - Date.now(); if (ms > 0) await wait(ms); };

const CAP_CSS = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;width:max-content;max-width:1100px;" +
  "background:rgba(11,15,23,.94);color:#fff;font:600 19px/1.4 Inter,system-ui,sans-serif;padding:14px 24px;border-radius:12px;" +
  "box-shadow:0 12px 40px rgba(0,0,0,.35);border-left:4px solid #14b8a6;letter-spacing:-.01em;text-align:left;pointer-events:none";

async function say(id, top = false) {
  await hold();
  const c = CAPS[id];
  if (c.card) {
    await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@500;600&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet"></head>
    <body style="margin:0;height:100vh;background:#0B0F17;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 110px;font-family:Inter;overflow:hidden;position:relative">
    <div style="position:absolute;width:900px;height:900px;border-radius:50%;right:-260px;top:-300px;background:radial-gradient(circle,rgba(20,184,166,.25),rgba(20,184,166,0) 62%)"></div>
    <p style="font:600 15px 'JetBrains Mono';letter-spacing:.2em;color:#5eead4;margin:0">P07 · PORTFOLIO DEMO</p>
    <h1 style="font:800 62px/1.06 'Plus Jakarta Sans';letter-spacing:-.03em;margin:18px 0 0;max-width:1150px">${c.title}</h1>
    <p style="font:500 26px/1.4 Inter;color:#C7CDE0;margin:22px 0 0;max-width:1050px">${c.text}</p>
    <p style="position:absolute;left:110px;bottom:56px;font:600 13px 'JetBrains Mono';letter-spacing:.14em;color:#64748B;margin:0">${c.foot}</p></body></html>`);
    await page.waitForLoadState("networkidle").catch(() => {});
  } else {
    const css = top ? CAP_CSS.replace("bottom:28px", "top:118px") : CAP_CSS;
    await page.evaluate(([t, s, css]) => {
      let el = document.getElementById("demo-cap");
      if (!el) { el = document.createElement("div"); el.id = "demo-cap"; document.body.appendChild(el); }
      el.style.cssText = css;
      el.innerHTML = `<span style="font:600 12px/1 'JetBrains Mono',monospace;letter-spacing:.16em;color:#5eead4;display:block;margin-bottom:6px">${s}</span>${t}`;
    }, [c.text, c.step, css]);
  }
  const now = Date.now();
  events.push({ id, t: (now - t0) / 1000 });
  minNext = now + DUR[id] * 1000 + 700;
}

// 1 · Title
await say("title");

// 2 · Problem
await hold(); await page.goto(APP); await page.getByTestId("kpi-contacts").waitFor();
await say("problem");

// 3 · Upload + cleaning
await hold(); await page.goto(`${APP}/import`); await page.getByTestId("dropzone").waitFor();
await say("upload");
await hold(); await page.getByTestId("sample-sample-contacts-messy.csv").click();
await page.getByTestId("import-summary").waitFor();
await say("clean");
await wait(3000); await page.getByText("Invalid numbers").first().click();
await wait(2500); await page.getByText("Do Not Contact").first().click();
await hold(); await page.getByTestId("import-commit").click(); await page.getByTestId("import-done").waitFor();
await say("saved");

// 4 · Personalisation
await hold(); await page.goto(`${APP}/messages`); await page.getByTestId("template-list").waitFor();
await page.getByTestId("template-list").getByText("New catalogue announcement").click(); await wait(400);
await say("message");
const nameField = page.locator('input[placeholder*="there"]');
await nameField.fill(""); await nameField.type("Omar", { delay: 110 });
const coField = page.locator('input[placeholder*="your business"]');
await coField.fill(""); await coField.type("Skyline Realty", { delay: 60 });

// 5 · n8n runs the process
await hold(); await page.goto(`${N8N}/workflow/${wfId}`);
await page.locator('[data-test-id="canvas-node"]').first().waitFor({ timeout: 60000 });
await wait(1200); await page.keyboard.press("Shift+1"); await wait(500);
await say("n8n-intro", true);
await hold();
const trigger = page.locator('[data-test-id="canvas-node"]').filter({ hasText: "Run manually" }).first();
await trigger.hover(); await trigger.locator('[data-test-id="execute-node-button"]').click(); await wait(800);
await page.getByText("from Run manually").first().click();
await say("n8n-run", true);
await say("n8n-wait", true);

// 6 · Live processing in SheetReach
let campId;
for (let i = 0; i < 30 && !campId; i++) {
  campId = (await (await page.request.get(`${APP}/api/campaigns`)).json()).find((c) => c.created_via === "n8n")?.id;
  if (!campId) await wait(1000);
}
await hold(); await page.goto(`${APP}/campaigns/${campId}`); await page.getByTestId("progress-card").waitFor();
await say("processing");
await say("demo-mode");
await hold();
await page.waitForFunction(() => document.querySelector('[data-testid="progress-title"]')?.textContent?.includes("Campaign complete"), null, { timeout: 240000, polling: 500 });

// 7 · Results
await page.evaluate(() => document.querySelector("main").scrollTo(0, 0)); await wait(600);
await say("results");
await wait(2200); await page.evaluate(() => document.querySelector("main").scrollTo({ top: 520, behavior: "smooth" }));
await wait(1800); await page.getByTestId("tab-failed").click();
await hold(); await page.getByTestId("tab-opted_out").click(); await wait(400);
await say("safety");
await hold(); await page.evaluate(() => document.querySelector("main").scrollTo({ top: 0, behavior: "smooth" })); await wait(900);
const dl = page.waitForEvent("download"); await page.getByTestId("export-results").click(); await dl;
await say("export");

// 8 · n8n finished
await hold(); await wait(2500);
await page.goto(`${N8N}/workflow/${wfId}/executions`);
await page.getByText(/^Succeeded/).first().waitFor({ timeout: 60000 });
await say("report", true);

// 9 · End card
await say("end");
await hold(); await wait(800);

const video = page.video(); await page.close(); await ctx.close();
const main = await video.path();
writeFileSync(`${RAW}events.json`, JSON.stringify({ video: main, events }, null, 1));
console.log("video:", main); console.log(events.map((e) => `${e.t.toFixed(1)} ${e.id}`).join("\n"));
await browser.close();
