import { Outlet, useLocation, useNavigation, useRevalidator } from "react-router";
import { AdminGate } from "../components/AdminGate";
import { Shell } from "../components/Shell";
import { DESK_NAV } from "../components/Nav";

/** shared chrome for the admin desk — gate + page container, stated once.
 *  The section links live in the main header (Nav) so the desk has one menu;
 *  this layout only supplies the page frame and the loading skeleton. Two
 *  feedback layers keep every click answered from the first frame: the sweep
 *  bar shows for every clientLoader navigation and revalidation; the desk
 *  skeleton replaces the outgoing page during a loader navigation, so a slow
 *  cross-region fetch never reads as a frozen surface. */

export default function AdminLayout() {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigating = navigation.state !== "idle";
  const working = navigating || revalidator.state !== "idle";
  const { pathname } = useLocation();
  const deskSection = DESK_NAV.find((d) => (d.to === "/admin" ? pathname === d.to : pathname.startsWith(d.to)));

  return (
    <AdminGate>
      {working && <div className="desk-progress" aria-hidden="true" />}
      <Shell>
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
