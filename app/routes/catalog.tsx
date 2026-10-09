import type { Route } from "./+types/catalog";
import { useMemo, useState } from "react";
import { useLoaderData, useSearchParams } from "react-router";
import { FAMILY_LABEL, type Family } from "../data/products";
import { fetchCatalog, API_BASE } from "../lib/api";
import { abs, pageMeta } from "../lib/seo";
import logoMain from "../../assets/Logo/ACE Stores Logo/Ace Stores main.png";
import { PackCard } from "../components/PackCard";

export async function loader() {
  try {
    return { packs: await fetchCatalog(), error: false };
  } catch {
    return { packs: [], error: true };
  }
}

export function meta({}: Route.MetaArgs) {
  return pageMeta({
    title: "Catalog — video transition packs & audio assets | ACE Stores",
    description:
      "Browse every ACE pack: video transitions and audio assets, one price each. Filter by family and format, and see exact file lists before you buy.",
    image: abs(logoMain),
  });
}

type FamilyFilter = "all" | Family;
type Sort = "new" | "price-asc" | "price-desc";

export default function Catalog() {
  const { packs: all, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const familyParam = searchParams.get("family");
  const family: FamilyFilter = familyParam === "video" || familyParam === "audio" ? familyParam : "all";
  const [format, setFormat] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");

  const setFamily = (f: FamilyFilter) => {
    setSearchParams(f === "all" ? {} : { family: f }, { replace: true });
  };

  const FORMATS = useMemo(() => [...new Set(all.flatMap((p) => p.formats))], [all]);

  const packs = useMemo(() => {
    let list = all.filter(
      (p) => (family === "all" || p.family === family) && (!format || p.formats.includes(format)),
    );
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [all, family, format, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          {family === "all" ? "The catalog" : FAMILY_LABEL[family]}
        </h1>
        <span className="label-caps tnum">
          {packs.length} pack{packs.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-hairline bg-panel px-5 py-4">
        <div className="flex items-center gap-1.5" role="group" aria-label="Family">
          {(["all", "video", "audio"] as FamilyFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              data-on={family === f}
              aria-pressed={family === f}
              onClick={() => setFamily(f)}
            >
              {f === "all" ? "all" : FAMILY_LABEL[f]}
            </button>
          ))}
        </div>

        <div
          className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          role="group"
          aria-label="Format"
        >
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              className="chip shrink-0"
              data-on={format === f}
              aria-pressed={format === f}
              onClick={() => setFormat((cur) => (cur === f ? null : f))}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:ml-auto" role="group" aria-label="Sort">
          <span className="label-caps">sort</span>
          {(
            [
              ["new", "newest"],
              ["price-asc", "price ↑"],
              ["price-desc", "price ↓"],
            ] as [Sort, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="chip"
              data-on={sort === value}
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {packs.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {packs.map((p, i) => (
            <PackCard key={p.id} pack={p} delay={Math.min(i, 7) * 50} />
          ))}
        </div>
      ) : (
        <div className="panel mt-8 rounded-2xl px-6 py-20 text-center">
          <svg viewBox="0 0 48 48" className="mx-auto w-12" aria-hidden>
            <rect x="8" y="14" width="32" height="26" rx="4" fill="none" stroke="#3a3f4a" strokeWidth="2" />
            <path d="M8 22h32M20 14v-4h8v4" fill="none" stroke="#3a3f4a" strokeWidth="2" />
            <circle cx="24" cy="30" r="3" fill="#8b5cf6" />
          </svg>
          <p className="mt-6 font-display text-2xl font-bold text-ink">
            {error ? "Catalog unreachable." : "Nothing matches those filters."}
          </p>
          <p className="mx-auto mt-2 max-w-[48ch] text-[14px] text-dim">
            {error
              ? `Could not reach the store API at ${API_BASE} — is the backend running?`
              : format
                ? `No packs ship in ${format} yet — try clearing the format.`
                : family === "all"
                  ? "No packs in the catalog yet."
                  : `No ${FAMILY_LABEL[family].toLowerCase()} yet — try all families.`}
          </p>
          {!error && (
            <button
              type="button"
              className="btn btn-ghost mt-6"
              onClick={() => {
                setFamily("all");
                setFormat(null);
              }}
            >
              clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
