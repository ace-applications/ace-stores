import { Outlet } from "react-router";
import { AdminGate } from "../components/AdminGate";
import { Shell } from "../components/Shell";

/** shared chrome for the admin desk — gate + page container, stated once */
export default function AdminLayout() {
  return (
    <AdminGate>
      <Shell>
        <Outlet />
      </Shell>
    </AdminGate>
  );
}