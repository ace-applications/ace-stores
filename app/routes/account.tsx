import type { Route } from "./+types/account";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { authClient, api, settings, type AppSettings } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { useStore } from "../lib/store";
import { Shell } from "../components/Shell";
import { useConfirm } from "../components/admin-ux";

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Your account — ACE Stores" }, { name: "robots", content: "noindex, nofollow" }];
}

interface SessionRow {
  token: string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Shared re-run helper: busy tag per action, one error line, sessions refetched
 *  after every mutation so the device list can't lie. */
function useAct(refreshSessions: () => Promise<void>) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(label: string, run: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await run();
      await refreshSessions();
    } catch (err) {
      setError(friendlyError(err, "That didn't go through. Try again in a moment."));
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, setError, act };
}

function ProfileSection({ user, supportEmail }: { user: { name: string; email: string }; supportEmail?: string }) {
  const [name, setName] = useState(() => user.name);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = name.trim();
    if (!next || next === user.name) return;
    setBusy(true);
    try {
      await authClient.updateUser({ name: next });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ac-profile" className="mt-8 panel rounded-2xl p-6">
      <h2 id="ac-profile" className="label-caps">profile</h2>
      <form className="mt-4" onSubmit={(e) => void save(e)}>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-dim">Name</span>
          <input
            className="field"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <p className="mt-2 text-[12.5px] text-dim">
          Email address: changes need a verification email, which we don't send yet — write{" "}
          {supportEmail ? (
            <a className="text-accent" href={`mailto:${supportEmail}`}>{supportEmail}</a>
          ) : (
            "us"
          )}{" "}
          and we'll move the account by hand.
        </p>
        <button
          type="submit"
          className="btn btn-primary mt-4"
          disabled={busy || !name.trim() || name === user.name}
          data-busy={busy || undefined}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

function SecuritySection({ sessions, currentToken, onAct, busy }: {
  sessions: SessionRow[] | null;
  currentToken?: string;
  onAct: (label: string, run: () => Promise<unknown>) => void;
  busy: string | null;
}) {
  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("current") ?? "");
    const newPassword = String(form.get("new") ?? "");
    await onAct("password", () =>
      authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }),
    );
    e.currentTarget.reset();
  }

  return (
    <section aria-labelledby="ac-security" className="mt-6 panel rounded-2xl p-6">
      <h2 id="ac-security" className="label-caps">security</h2>
      <form className="mt-4" onSubmit={(e) => void changePassword(e)}>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-dim">Current password</span>
          <input className="field" name="current" type="password" required autoComplete="current-password" />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[13px] text-dim">New password (8+ characters)</span>
          <input className="field" name="new" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <p className="mt-2 text-[12.5px] text-dim">
          Saving signs out every other device — they can sign back in.
        </p>
        <button type="submit" className="btn btn-primary mt-4" disabled={busy !== null} data-busy={busy === "password" || undefined}>
          {busy === "password" ? "Saving…" : "Change password"}
        </button>
      </form>

      <div className="mt-6 border-t border-hairline pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="label-caps">signed-in devices</h3>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy !== null}
            data-busy={busy === "revoke" || undefined}
            onClick={() => onAct("revoke", () => authClient.revokeOtherSessions())}
          >
            {busy === "revoke" ? "Signing out…" : "sign out everywhere else"}
          </button>
        </div>
        {sessions && (
          <ul className="mt-3 text-[13px] text-dim" aria-label="Active sessions">
            {sessions.map((s) => (
              <li key={s.token} className="border-b border-hairline py-2">
                <span className="truncate">{s.userAgent ?? "unknown device"}</span>
                <span className="tnum block text-[12px] text-[#808089]">
                  {s.ipAddress ? `from ${s.ipAddress} · ` : ""}
                  {s.token === currentToken ? "this device" : "other device"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DataSection({ user, store, supportEmail, hasPolicies, onAct, busy, onDelete }: {
  user: { id: string; name: string; email: string };
  store: { orders: { id: number; status: string; totalPrice: number; createdAt: string; items: unknown[] }[]; refreshOrders: () => Promise<unknown> };
  supportEmail?: string;
  hasPolicies: boolean;
  onAct: (label: string, run: () => Promise<unknown>) => void;
  busy: string | null;
  onDelete: () => void;
}) {
  const { orders } = store;
  return (
    <section aria-labelledby="ac-data" className="mt-6 panel rounded-2xl p-6">
      <h2 id="ac-data" className="label-caps">your data</h2>
      <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-dim">
        Everything we hold about you is your profile and your{" "}
        {orders.length === 1 ? "order" : "orders"} — download a copy any time, or delete the
        account outright.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy !== null}
          data-busy={busy === "export" || undefined}
          onClick={() =>
            onAct("export", async () => {
              await store.refreshOrders();
              const blob = new Blob(
                [JSON.stringify({ exportedAt: new Date().toISOString(), profile: user, orders }, null, 2)],
                { type: "application/json" },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "ace-stores-account.json";
              a.click();
              URL.revokeObjectURL(url);
            })
          }
        >
          {busy === "export" ? "Preparing…" : "download my data"}
        </button>
        <button
          type="button"
          className="btn btn-ghost text-danger"
          disabled={busy !== null}
          onClick={onDelete}
        >
          delete my account
        </button>
      </div>
      <p className="mt-3 text-[12.5px] text-dim">
        Deletion removes your sign-in immediately. If you've bought packs, the order records
        stay as accounting history — your name and email come off them.
      </p>
      <div className="mt-4 border-t border-hairline pt-4 text-[13.5px] text-dim">
        {supportEmail ? (
          <>Need a human? <a className="text-accent" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</>
        ) : (
          <>Need a human? The support address isn't published yet.</>
        )}
        {hasPolicies && (
          <p className="mt-2">
            <Link to="/policies" className="text-accent">store policies</Link>
          </p>
        )}
      </div>
    </section>
  );
}

/** Client-side by construction: every row here reads or mutates the browser's
 *  auth cookie, so there is no loader to get the cookie jar wrong. Deletion is
 *  the backend's job (POST /account/delete) because the cascade rule — orders
 *  kept, identity dropped — is business logic, not auth plumbing. */
export default function Account() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const navigate = useNavigate();
  const store = useStore();
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  useEffect(() => {
    if (!user) return;
    void settings().then(setConfig).catch(() => setConfig({}));
    void authClient.listSessions().then((r) => setSessions(r.data ?? null));
  }, [user]);

  async function refreshSessions() {
    const r = await authClient.listSessions();
    setSessions(r.data ?? []);
  }

  const { busy, error, act } = useAct(refreshSessions);

  async function deleteAccount() {
    setDeleteError(null);
    try {
      await api<{ ok: boolean }>("/account/delete", { method: "POST" });
      await authClient.signOut();
      navigate("/");
    } catch (err) {
      setDeleteError(friendlyError(err, "Deletion didn't go through. Try again in a moment."));
    }
  }

  if (isPending) {
    return (
      <Shell>
        <p className="label-caps py-16 text-center">reading session…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="panel mx-auto max-w-xl rounded-2xl px-6 py-16 text-center">
          <h1 className="font-display text-3xl font-extrabold text-ink">Sign in first.</h1>
          <p className="mx-auto mt-2 max-w-[48ch] text-[14px] text-dim">
            Your profile, security settings, and data controls live behind the account.
          </p>
          <Link to="/sign-in?next=/account" className="btn btn-accent mt-8">
            sign in
          </Link>
        </div>
      </Shell>
    );
  }

  const supportEmail = config?.support_email;
  const hasPolicies = Boolean(config?.policies_terms || config?.policies_privacy || config?.policies_refund);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Your account
        </h1>
        <p className="mt-2 text-[14.5px] text-dim">
          <span className="text-ink">{user.email}</span>
          {user.emailVerified ? "" : " · not verified"}
        </p>

        {(error ?? deleteError) && (
          <p className="mt-4 text-[13px] text-danger" role="alert">
            {error ?? deleteError}
          </p>
        )}
        {dialog}

        <ProfileSection user={user} supportEmail={supportEmail} />
        <SecuritySection
          sessions={sessions}
          currentToken={session?.session?.token}
          onAct={(label, run) => void act(label, run)}
          busy={busy}
        />
        <DataSection
          user={user}
          store={store}
          supportEmail={supportEmail}
          hasPolicies={hasPolicies}
          onAct={(label, run) => void act(label, run)}
          busy={busy}
          onDelete={() =>
            ask({
              title: "Delete this account?",
              body: "Your sign-in goes away immediately and every device is signed out. Order history, if any, stays as accounting records with your identity removed from it. This cannot be undone.",
              confirmLabel: "Delete account",
              danger: true,
              action: () => void deleteAccount(),
            })
          }
        />
      </div>
    </Shell>
  );
}
