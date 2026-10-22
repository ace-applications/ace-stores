import type { Route } from "./+types/policies";
import { Link, useLoaderData } from "react-router";
import { useState } from "react";
import { settings } from "../lib/api";
import { Shell } from "../components/Shell";

export async function loader({ request }: Route.LoaderArgs) {
  // no error swallowing: a missing backend must read as an error, not as
  // "we have no policies"
  return { config: await settings(request) };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Store policies — ACE Stores" }];
}

const SECTIONS = [
  { key: "policies_terms", title: "Terms of service", tab: "terms" },
  { key: "policies_privacy", title: "Privacy policy", tab: "privacy" },
  { key: "policies_refund", title: "Refund policy", tab: "refund" },
] as const;

type Tab = (typeof SECTIONS)[number]["tab"];

/** Legal copy is the store's own, set from the admin desk — the page presents
 *  what exists and never invents a fallback policy. */
export default function Policies() {
  const { config } = useLoaderData<typeof loader>();
  const available = SECTIONS.filter((s) => Boolean(config[s.key]));
  const [tab, setTab] = useState<Tab>((available[0]?.tab ?? "terms") as Tab);
  const current = SECTIONS.find((s) => s.tab === tab);

  return (
    <Shell>
      <div className="mx-auto max-w-[72rem]">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Store policies
        </h1>

        {available.length === 0 ? (
          <div className="panel mt-8 max-w-2xl rounded-2xl px-6 py-12">
            <p className="max-w-[50ch] text-[14.5px] leading-relaxed text-dim">
              No policies are published yet. Before the first sale lands this page carries
              the store's terms, privacy, and refund text.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Policies">
              {SECTIONS.filter((s) => config[s.key]).map((s) => (
                <button
                  key={s.tab}
                  type="button"
                  className="chip"
                  data-on={tab === s.tab || undefined}
                  onClick={() => setTab(s.tab)}
                >
                  {s.title}
                </button>
              ))}
            </div>

            {current && (
              <section key={current.key} aria-labelledby={`policy-${current.tab}`} className="mt-8">
                <h2 id={`policy-${current.tab}`} className="font-display text-2xl font-bold text-ink">
                  {current.title}
                </h2>
                <div className="mt-4 max-w-[65ch] whitespace-pre-wrap text-[15px] leading-relaxed text-dim">
                  {config[current.key]}
                </div>
              </section>
            )}
          </>
        )}

        <p className="mt-16 text-[13.5px] text-dim">
          Questions about any of this — <Link to="/account" className="text-accent">your account page</Link>{" "}
          carries the support contact.
        </p>
      </div>
    </Shell>
  );
}
