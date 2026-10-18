import { Outlet, useNavigation, useRevalidator } from "react-router";
import { AdminGate } from "../components/AdminGate";
import { Shell } from "../components/Shell";

/** shared chrome for the admin desk — gate + page container, stated once.
 *  The sweep bar shows for every clientLoader navigation and revalidation on
 *  the desk, so no page ever "waits for the backend with nothing happening". */
export default function AdminLayout() {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const working = navigation.state !== "idle" || revalidator.state !== "idle";

  return (
    <AdminGate>
      {working && <div className="desk-progress" aria-hidden="true" />}
      <Shell>
        <Outlet />
      </Shell>
    </AdminGate>
  );
}
