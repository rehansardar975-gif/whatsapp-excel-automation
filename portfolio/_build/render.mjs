// Renders the architecture card and the client presentation (PDF). Usage: node portfolio/_build/render.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(`${execSync("npm root -g").toString().trim()}/playwright`); }
const here = new URL(".", import.meta.url).pathname;
const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const arch = await b.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1.5 });
await arch.goto(`file://${here}architecture.html`); await arch.waitForLoadState("networkidle"); await arch.waitForTimeout(500);
await arch.screenshot({ path: `${here}../screenshots/10-architecture.png` });
const deck = await b.newPage();
await deck.goto(`file://${here}presentation.html`); await deck.waitForLoadState("networkidle"); await deck.waitForTimeout(800);
await deck.pdf({ path: `${here}../CLIENT-PRESENTATION.pdf`, width: "1920px", height: "1080px", printBackground: true });
await b.close(); console.log("rendered");
