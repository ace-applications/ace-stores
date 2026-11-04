/**
 * Interaction latency canary (web.dev INP doc: ≤200 ms for the click itself —
 * input delay + processing + presentation, not the async completion).
 *
 * Measures `click → next paint` in rAF and logs `[inp-canary] Nms — "label"`.
 * Dev-only: a measurement hook inside production would turn every interaction
 * into work, which is exactly the long-task pattern the INP guidance warns
 * against. Guarded to `import.meta.env.DEV` at the top level so the bundler
 * tree-shakes it entirely from production chunks.
 */
export function wireInpCanary(): void {
  if (!import.meta.env.DEV) return;
  // single module-level listener; re-call is a no-op (setSsrFetch pattern)
  if ((globalThis as { __inpWired?: boolean }).__inpWired) return;
  (globalThis as { __inpWired?: boolean }).__inpWired = true;

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const label = target.closest("button, a, [role=\"button\"]")?.textContent?.trim().slice(0, 60);
    if (!label) return;
    const at = performance.now();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ms = Math.round(performance.now() - at);
        console.debug(`[inp-canary] ${ms}ms — "${label}"`);
      });
    });
  }, true);
}
