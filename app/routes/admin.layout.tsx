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
 *  once. The sweep bar shows for every clientLoader navigation and revalidation
 *  on the desk, so no page ever "waits for the backend with nothing happening". */
export default function AdminLayout() {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const working = navigation.state !== "idle" || revalidator.state !== "idle";
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
        <Outlet />
      </Shell>
    </AdminGate>
  );
}
