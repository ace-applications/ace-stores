import { Navigate } from "react-router";
import { authClient } from "../lib/api";
import { isAdmin } from "../lib/session";

/**
 * The desk and the storefront are separate surfaces. Staff get the desk and are
 * bounced off the shop; buyers are bounced off the desk. The server enforces
 * both regardless — this only stops either side from ever rendering the other's
 * chrome, which would otherwise leak page structure and copy.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <Pending label="Checking access…" />;

  if (!session?.user) return <Navigate to="/sign-in?next=%2Fadmin" replace />;

  if (!isAdmin(session.user)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

/** Storefront side of the same split. */
export function StorefrontGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <Pending label="Checking access…" />;

  if (isAdmin(session?.user)) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

function Pending({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
      <p className="animate-pulse text-dim">{label}</p>
    </div>
  );
}
