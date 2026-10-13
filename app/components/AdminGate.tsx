import { Navigate } from "react-router";
import { authClient } from "../lib/api";
import { isAdmin } from "../lib/session";

/**
 * The desk and the storefront are separate surfaces. Staff get the desk and are
 * bounced off the shop; buyers are bounced off the desk. The server enforces
 * both regardless — this only stops either side from ever rendering the other's
 * chrome, which would otherwise leak page structure and copy.
 *
 * Deliberately renders children while the session is still unknown. `useSession`
 * never settles during SSR, so gating on `isPending` would ship every shop page
 * as an empty "Checking access…" shell — no headings, no copy, nothing for a
 * crawler or a slow connection to read. Redirect only once the role is known.
 * Nothing is exposed by rendering early: the loaders 401/403 the same data.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (!isPending) {
    if (!session?.user) return <Navigate to="/sign-in?next=%2Fadmin" replace />;
    if (!isAdmin(session.user)) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/** Storefront side of the same split. Same early-render rule as AdminGate. */
export function StorefrontGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (!isPending && isAdmin(session?.user)) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
