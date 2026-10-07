/**
 * RUTALOG perf harness — Playwright + CDP
 * Uso: PREVIEW_URL=https://arreglo-ui.rutalog.pages.dev node tests/perf.mjs
 * Opciones: --throttle (CPU 4x + Fast 4G)
 * Emite JSON a tests/perf-results.json y tabla en stdout.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PREVIEW = process.env.PREVIEW_URL || "https://arreglo-ui.rutalog.pages.dev";
const THROTTLE = process.argv.includes("--throttle");
const OUT = path.resolve("tests/perf-results.json");

async function setupPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    bypassCSP: true
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Network.enable");
  if (THROTTLE) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150
    });
  }
  return { context, page, cdp };
}

async function injectCounters(page) {
  await page.addInitScript(() => {
    window.__PERF_H = { go: 0, renderMapas: 0, refrescarRutaUI: 0, longTasks: [], cls: 0 };
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.entryType === "longtask") {
            window.__PERF_H.longTasks.push({ duration: e.duration, start: e.startTime });
          }
          if (e.entryType === "layout-shift" && !e.hadRecentInput) {
            window.__PERF_H.cls += e.value;
          }
        }
      });
      po.observe({ type: "longtask", buffered: true });
      po.observe({ type: "layout-shift", buffered: true });
    } catch (e) {}
  });
}

async function scenarioCold(page) {
  const t0 = Date.now();
  await page.goto(PREVIEW + "/?debug=perf", { waitUntil: "networkidle", timeout: 90000 });
  const t1 = Date.now();
  await page.waitForTimeout(3000);
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const res = performance.getEntriesByType("resource");
    const js = res.filter((r) => r.name.includes(".js"));
    const css = res.filter((r) => r.name.includes(".css"));
    const dataJson = res.filter((r) => r.name.includes("data.json"));
    let reporte = null;
    try {
      if (window.RUTALOG_PERF && window.RUTALOG_PERF.reporte) reporte = window.RUTALOG_PERF.reporte();
    } catch (e) {}
    return {
      wallMs: null,
      domInteractive: nav ? Math.round(nav.domInteractive) : null,
      loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
      resourceCount: res.length,
      jsCount: js.length,
      cssCount: css.length,
      jsKB: Math.round(js.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
      cssKB: Math.round(css.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
      dataJsonPulls: dataJson.length,
      heapMB: performance.memory ? Math.round((performance.memory.usedJSHeapSize / 1048576) * 10) / 10 : null,
      longTasks: (window.__PERF_H && window.__PERF_H.longTasks) || [],
      cls: (window.__PERF_H && window.__PERF_H.cls) || 0,
      reporte,
      pageTitle: document.getElementById("pageTitle") ? document.getElementById("pageTitle").textContent : null,
      loginVisible: !!(document.getElementById("loginOverlay") && !document.getElementById("loginOverlay").hidden)
    };
  });
  metrics.wallMs = t1 - t0;
  const lt = metrics.longTasks || [];
  metrics.longTaskCount = lt.length;
  metrics.longTaskSum = Math.round(lt.reduce((s, t) => s + t.duration, 0));
  metrics.longTaskWorst = lt.length ? Math.round(Math.max(...lt.map((t) => t.duration))) : 0;
  return metrics;
}

async function scenarioIdle(page, seconds) {
  const before = await page.evaluate(() => ({
    res: performance.getEntriesByType("resource").length,
    lt: performance.getEntriesByType("longtask").length,
    heap: performance.memory ? performance.memory.usedJSHeapSize : 0
  }));
  await page.waitForTimeout(seconds * 1000);
  const r = await page.evaluate((b) => {
    const res = performance.getEntriesByType("resource").slice(b.res);
    const lt = performance.getEntriesByType("longtask").slice(b.lt);
    return {
      seconds: null,
      newResources: res.map((r) => ({
        name: r.name.split("/").pop().slice(0, 48),
        ms: Math.round(r.duration),
        bytes: r.transferSize
      })),
      newLongTasks: lt.map((e) => Math.round(e.duration)),
      heapDeltaMB: performance.memory
        ? Math.round(((performance.memory.usedJSHeapSize - b.heap) / 1048576) * 10) / 10
        : null,
      reporte: window.RUTALOG_PERF && window.RUTALOG_PERF.reporte ? window.RUTALOG_PERF.reporte() : null
    };
  }, before);
  r.seconds = seconds;
  return r;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  } catch (e) {
    console.error("Playwright Chromium no disponible:", e.message);
    console.error("Instala con: npx playwright install chromium");
    process.exit(1);
  }

  const { context, page } = await setupPage(browser);
  await injectCounters(page);

  const results = {
    preview: PREVIEW,
    throttle: THROTTLE,
    at: new Date().toISOString(),
    scenarios: {}
  };

  console.log("=== cold load ===");
  results.scenarios.cold = await scenarioCold(page);
  console.table({
    wallMs: results.scenarios.cold.wallMs,
    jsCount: results.scenarios.cold.jsCount,
    cssCount: results.scenarios.cold.cssCount,
    dataJsonPulls: results.scenarios.cold.dataJsonPulls,
    longTaskWorst: results.scenarios.cold.longTaskWorst,
    heapMB: results.scenarios.cold.heapMB,
    cls: results.scenarios.cold.cls
  });

  console.log("=== idle 30s ===");
  results.scenarios.idle30 = await scenarioIdle(page, 30);
  console.log(JSON.stringify(results.scenarios.idle30, null, 2));

  results.scenarios.nav30 = "SKIPPED: requiere sesión autenticada";
  results.scenarios.excel = "SKIPPED: requiere sesión + Excel";
  results.scenarios.viaje = "SKIPPED: requiere sesión + clientesHoy";
  results.scenarios.mapaPan = "SKIPPED: requiere sesión + pines";
  results.scenarios.citas = "SKIPPED: requiere sesión";
  results.scenarios.sync = "PARCIAL: medido en cold/idle (data.json pulls)";

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log("Wrote", OUT);

  await context.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
