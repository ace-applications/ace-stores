import { Link, Outlet, useLocation, useNavigation, useRevalidator } from "react-router";
import { AdminGate } from "../components/AdminGate";
import { Shell } from "../components/Shell";

const DESK: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/tags", label: "Tags" },
  { to: "/admin/settings", label: "Settings" },
] as const;

/** shared chrome for the admin desk — gate + desk nav + page container, stated
 *  once. Two feedback layers keep every click answered from the first frame:
 *  the sweep bar shows for every clientLoader navigation and revalidation; the
 *  desk skeleton replaces the outgoing page during a loader navigation, so a
 *  slow cross-region fetch never reads as a frozen surface. */
export default function AdminLayout() {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigating = navigation.state !== "idle";
  const working = navigating || revalidator.state !== "idle";
  const { pathname } = useLocation();

  return (
    <AdminGate>
      {working && <div className="desk-progress" aria-hidden="true" />}
      <Shell>
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Admin desk sections">
          {DESK.map((d) => {
            const on = d.exact ? pathname === d.to : pathname.startsWith(d.to);
            return (
              <Link key={d.to} to={d.to} className="chip" data-on={on} aria-current={on ? "page" : undefined}>
                {d.label}
              </Link>
            );
          })}
        </nav>
        {navigation.state === "loading" ? (
          <div className="desk-skeleton" aria-busy="true" aria-live="polite">
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
        ) : (
          <Outlet />
        )}
      </Shell>
    </AdminGate>
  );
}
