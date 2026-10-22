/** Feedback loop for the "admin clicks feel frozen" bug (diagnosing-bugs Phase 1).
 *
 * Drives the real UI: sign in, open /admin, click the first Approve button and
 * record exactly what the page shows after the click:
 *
 *   disabledAt        — ms until the clicked button went disabled
 *   busyIndicationAt  — ms until a real busy indication (button aria-busy
 *                       and/or data-busy spinner) appeared
 *   toastAt           — ms until an acknowledgment toast appeared
 *
 * PASS: busyIndicationAt <= 150 AND toastAt !== null. RED = today's symptom:
 * a disabled-only button, then silence until the row moves ~1 s later.
 *
 * Precondition: an order with status pending_payment in the local `ace` db.
 * Run from ace-stores:  bun debug/probe-admin-feedback.js  (exit 0 = green)
 */
import { chromium } from "playwright";

// target URL (claims local by default; PROBE_APP for staging/prod), plus creds
const APP = process.env.PROBE_APP ?? "http://localhost:5173";
const EMAIL = process.env.PROBE_EMAIL ?? "persist-test@example.com";
const PASS = process.env.PROBE_PASS ?? "Passw0rd!x";

const browser = await chromium.launch();
const page = await browser.newPage();

// sign in
// hydration gate: react-router mounts window.__reactRouterVersion; until the
// client bundle attaches its onChange handlers, fill() lands nowhere.
await page.goto(`${APP}/sign-in`, { waitUntil: "networkidle" });
await page.waitForFunction(
  () => (window).__reactRouterVersion != null,
  { timeout: 15_000 },
);
await page.getByLabel(/email/i).fill(EMAIL);
await page.getByLabel(/password/i).fill(PASS);
const state = await page.evaluate(() => ({
  email: document.querySelector('input[type="email"]')?.value,
  password: document.querySelector('input[type="password"]')?.value,
  button: document.querySelector('form button')?.textContent?.trim(),
}));
if (state.email !== EMAIL || state.button !== "sign in") {
  throw new Error(`sign-in state not live: ${JSON.stringify(state)}`);
}
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL((u) => new URL(u).pathname !== "/sign-in", { timeout: 10_000 })
  .catch(() => { throw new Error(`sign-in did not navigate; url=${page.url()}`); });
await page.goto(`${APP}/admin`);

const approve = page.locator('button:has-text("Approve")').first();
await approve.waitFor({ timeout: 10_000 });
if (!(await approve.isEnabled())) {
  throw new Error("no enabled Approve button — precondition failed: need a pending_payment order");
}

await page.evaluate(`
  window.__probe = {};
  const tick = () => {
    const t = Date.now();
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Approve");
    if (btn) {
      if (btn.disabled && !window.__probe.disabled) window.__probe.disabled = t;
      if ((btn.dataset.busy === "true" || btn.getAttribute("aria-busy") === "true") && !window.__probe.busyIndication) window.__probe.busyIndication = t;
    }
    if (document.querySelector('[role="status"]') && !window.__probe.toast) window.__probe.toast = t;
  };
  window.__probeTimer = setInterval(tick, 8);
`);

const tClick = Date.now();
await approve.click();

// settle = acknowledgment toast shown, or 15 s cap
await page
  .waitForFunction(() => window.__probe?.toast != null, { timeout: 15_000, polling: 50 })
  .catch(() => {});

const events = await page.evaluate(() => { clearInterval(window.__probeTimer); return window.__probe; });
const rel = (t) => (t == null ? null : t - tClick);
const msToToast = rel(events.toast);
const msToQuiet = Date.now() - tClick;
const verdict = {
  pass: false,
  disabledAt: rel(events.disabled),
  busyIndicationAt: rel(events.busyIndication),
  toastAt: msToToast,
  wallClock: msToQuiet,
};
verdict.pass = verdict.busyIndicationAt !== null && verdict.busyIndicationAt <= 150 && verdict.toastAt !== null;

console.log(JSON.stringify(verdict, null, 2));
await browser.close();
process.exit(verdict.pass ? 0 : 1);
