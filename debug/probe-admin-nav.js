/** Navigation feedback loop for the "page switches feel frozen" symptom.
 *
 * Drives the real UI on a signed-in admin: click the Products desk chip from
 * /admin and record exactly what the page shows after the click:
 *
 *   barAt      — ms until the .desk-progress sweep appeared (aria-hidden)
 *   skeletonAt — ms until the desk loading skeleton appeared
 *   h1At       — ms until the target page h1 landed
 *
 * PASS: skeletonAt <= 150 AND barAt <= 150 AND h1At !== null. RED = silent
 * freeze: old page stays up with zero feedback until the loader completes.
 * Run from ace-stores:  bun debug/probe-admin-nav.js  (exit 0 = green)
 */
import { chromium } from "playwright";

const APP = process.env.PROBE_APP ?? "http://localhost:5173";
const EMAIL = process.env.PROBE_EMAIL ?? "persist-test@example.com";
const PASS = process.env.PROBE_PASS ?? "Passw0rd!x";

const browser = await chromium.launch();
const page = await browser.newPage();

// sign in (hydration gate: RR mounts __reactRouterVersion; fill before that lands nowhere)
await page.goto(`${APP}/sign-in`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__reactRouterVersion != null, { timeout: 15_000 });
await page.getByLabel(/email/i).fill(EMAIL);
await page.getByLabel(/password/i).fill(PASS);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL((u) => new URL(u).pathname !== "/sign-in", { timeout: 15_000 })
  .catch(() => { throw new Error(`sign-in did not navigate; url=${page.url()}`); });
await page.goto(`${APP}/admin`, { waitUntil: "networkidle" });
await page.waitForSelector('h1:has-text("Overview")', { timeout: 15_000 });

await page.evaluate(`
  window.__probe = {};
  const tick = () => {
    const t = Date.now();
    if (document.querySelector(".desk-progress") && !window.__probe.barAt) window.__probe.barAt = t;
    if (document.querySelector(".desk-skeleton") && !window.__probe.skeletonAt) window.__probe.skeletonAt = t;
    if ([...document.querySelectorAll("main h1")].some((h) => h.textContent.trim().toLowerCase().includes("products")) && !window.__probe.h1At) window.__probe.h1At = t;
  };
  window.__probeTimer = setInterval(tick, 8);
`);

const tClick = Date.now();
await page.locator('nav[aria-label="Admin desk sections"] a:has-text("Products")').click();

// settle = target h1 visible, or 15 s cap
await page
  .waitForFunction(() => window.__probe?.h1At != null, { timeout: 15_000, polling: 50 })
  .catch(() => {});

const events = await page.evaluate(() => {
  clearInterval(window.__probeTimer);
  return window.__probe;
});
const rel = (t) => (t == null ? null : t - tClick);
const verdict = { pass: false, barAt: rel(events.barAt), skeletonAt: rel(events.skeletonAt), h1At: rel(events.h1At) };
verdict.pass =
  verdict.skeletonAt !== null && verdict.skeletonAt <= 150 &&
  verdict.barAt !== null && verdict.barAt <= 150 &&
  verdict.h1At !== null;

console.log(JSON.stringify(verdict, null, 2));
await browser.close();
process.exit(verdict.pass ? 0 : 1);
