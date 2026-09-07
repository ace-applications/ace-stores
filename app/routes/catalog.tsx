import type { Route } from "./+types/catalog";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { FAMILY_LABEL, PACKS, type Family } from "../data/products";
import { PackCard } from "../components/PackCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Catalog — ACE Stores" }];
}

type FamilyFilter = "all" | Family;
type Sort = "new" | "price-asc" | "price-desc";

const FORMATS = [...new Set(PACKS.flatMap((p) => p.formats))];

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const familyParam = searchParams.get("family");
  const family: FamilyFilter = familyParam === "video" || familyParam === "audio" ? familyParam : "all";
  const [format, setFormat] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");

  const setFamily = (f: FamilyFilter) => {
    setSearchParams(f === "all" ? {} : { family: f }, { replace: true });
  };

  const packs = useMemo(() => {
    let list = PACKS.filter(
      (p) => (family === "all" || p.family === family) && (!format || p.formats.includes(format)),
    );
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [family, format, sort]);

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
            <button key={f} type="button" className="chip" data-on={family === f} onClick={() => setFamily(f)}>
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
              onClick={() => setFormat((cur) => (cur === f ? null : f))}
            >
              {f}
            </button>
          ))}
        </div>

        <label className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <span className="label-caps">sort</span>
          <select
            className="field flex-1 py-2 font-display text-[12.5px] font-semibold uppercase sm:w-40 sm:flex-none sm:py-1.5"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="new">newest</option>
            <option value="price-asc">price ↑</option>
            <option value="price-desc">price ↓</option>
          </select>
        </label>
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
          <p className="mt-6 font-display text-2xl font-bold text-ink">Nothing matches those filters.</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-[14px] text-dim">
            {format
              ? `No packs ship in ${format} yet — try clearing the format.`
              : `No ${FAMILY_LABEL[family as Family].toLowerCase()} yet — try all families.`}
          </p>
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
        </div>
      )}
    </div>
  );
}
