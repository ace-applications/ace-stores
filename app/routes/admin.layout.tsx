import { NavLink, Outlet, useLocation, useNavigation, useRevalidator } from "react-router";
import { AdminGate } from "../components/AdminGate";
import { Shell } from "../components/Shell";

/** shared chrome for the admin desk — gate + desk nav + page container, stated
 *  once. Two feedback layers keep every click answered from the first frame:
 *  the sweep bar shows for every clientLoader navigation and revalidation; the
 *  desk skeleton replaces the outgoing page during a loader navigation, so a
 *  slow cross-region fetch never reads as a frozen surface. NavLink isPending
 *  dims the target chip locally — the admin equivalent of the buyer isPending
 *  treatment, no global spinner blocking the list. */

const DESK: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/tags", label: "Tags" },
  { to: "/admin/settings", label: "Settings" },
] as const;

export default function AdminLayout() {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigating = navigation.state !== "idle";
  const working = navigating || revalidator.state !== "idle";
  const { pathname } = useLocation();
  const deskSection = DESK.find((d) => (d.exact ? pathname === d.to : pathname.startsWith(d.to)));

  return (
    <AdminGate>
      {working && <div className="desk-progress" aria-hidden="true" />}
      <Shell>
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Admin desk sections">
          {DESK.map((d) => {
            const on = d.exact ? pathname === d.to : pathname.startsWith(d.to);
            return (
              <NavLink key={d.to} to={d.to} className="chip" data-on={on} aria-current={on ? "page" : undefined}>
                {({ isPending }) => (
                  <>
                    <span className={isPending ? "opacity-70" : undefined}>{d.label}</span>
                    {isPending && <span className="sr-only"> (loading…)</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        {navigation.state === "loading" ? (
          <DeskSkeleton section={deskSection?.label ?? "Overview"} />
        ) : (
          <Outlet />
        )}
      </Shell>
    </AdminGate>
  );
}

/** Skeleton shape mirrors the real desk pages (stats row + list) so the swap
 *  reads as an update rather than a flash — first paint during cross-region
 *  clientLoader fetches. */
function DeskSkeleton({ section }: { section: string }) {
  return (
    <div className="desk-skeleton" aria-busy="true" aria-live="polite" aria-label={`Loading ${section}`}>
      <div className="skeleton h-10 w-56" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel rounded-2xl p-5">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-8 panel rounded-2xl p-6">
        <div className="skeleton h-5 w-40" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
