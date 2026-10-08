/**
 * E2E local: requiere playwright-core + chrome.
 * node tests/e2e/shell-login.spec.mjs
 * Verifica: loginOverlay, sin "shell incompleto", sin pageerror.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../../..");
const MIME = { ".html":"text/html; charset=utf-8", ".js":"application/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".webmanifest":"application/manifest+json" };

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.log("SKIP e2e: instala playwright-core (npm i playwright-core) y chrome");
  process.exit(0);
}

const server = await new Promise((resolve) => {
  const s = createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url||"/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const file = join(root, urlPath);
    if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, {"Content-Type": MIME[extname(file)]||"application/octet-stream"});
    res.end(readFileSync(file));
  });
  s.listen(0, "127.0.0.1", () => resolve(s));
});
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless:true, executablePath: process.env.CHROME_PATH||"/usr/bin/google-chrome", args:["--no-sandbox"] });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(String(e)));
await page.goto(base+"/", { waitUntil:"networkidle", timeout:60000 });
await page.waitForTimeout(2000);
const bodyText = await page.evaluate(() => document.body?.innerText || "");
const hasLogin = await page.evaluate(() => !!document.getElementById("loginOverlay"));
const incompleto = /shell incompleto/i.test(bodyText);
console.log(incompleto ? "FAIL: shell incompleto" : "PASS: no shell incompleto");
console.log(hasLogin ? "PASS: loginOverlay" : "FAIL: no loginOverlay");
console.log(pageErrors.length ? "FAIL pageerror "+pageErrors[0] : "PASS: sin pageerror");
await browser.close(); server.close();
if (incompleto || !hasLogin || pageErrors.length) process.exit(1);
console.log("1.6 PASSED");
