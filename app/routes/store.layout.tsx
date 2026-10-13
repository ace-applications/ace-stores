import { Outlet } from "react-router";
import { StorefrontGate } from "../components/AdminGate";

/**
 * Every shop route hangs off this, so staff are kept out in one place.
 * No Shell here: routes that need a page frame already apply their own,
 * and several of them render one per step.
 */
export default function StorefrontLayout() {
  return (
    <StorefrontGate>
      <Outlet />
    </StorefrontGate>
  );
}
