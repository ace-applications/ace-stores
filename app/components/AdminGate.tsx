import { Link, Navigate } from "react-router";
import { authClient } from "../lib/api";

function isAdminRole(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const u = user as { role?: string };
  return u.role === "admin";
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
        <div className="animate-pulse text-dim">Checking access…</div>
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/sign-in?next=/admin" replace />;
  }

  if (!isAdminRole(session.user)) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
        <div className="max-w-[48ch]">
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
            Desk access restricted
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-dim">
            This desk is for store staff. Your account doesn’t have admin access.
          </p>
          <Link to="/" className="btn btn-primary mt-6">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}