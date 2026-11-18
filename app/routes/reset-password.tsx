import type { Route } from "./+types/reset-password";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { authClient } from "../lib/api";
import { friendlyError } from "../lib/errors";

export function meta({}: Route.MetaArgs) {
  return [{ title: "New password — ACE Stores" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      setError("Those two don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) {
        setError(friendlyError(res.error, "That link didn't work. Ask for a fresh one."));
        return;
      }
      navigate("/sign-in", { replace: true });
    } catch (err) {
      setError(friendlyError(err, "That link didn't work. Ask for a fresh one."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-16 pb-16 sm:px-6">
      <div className="panel-raised rounded-2xl p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          New password
        </h1>
        {!token ? (
          <>
            <p className="mt-3 text-[14px] leading-relaxed text-dim">
              {linkError === "INVALID_TOKEN"
                ? "That link has expired or was already used."
                : "This page needs the link from the reset email."}
            </p>
            <Link to="/forgot-password" className="btn btn-ghost mt-6">
              ask for a fresh link
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="label-caps">new password</span>
              <input
                type="password"
                className="field mt-1.5 w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <span className="label-caps mt-1 block">8 characters minimum</span>
            </label>
            <label className="block">
              <span className="label-caps">repeat it</span>
              <input
                type="password"
                className="field mt-1.5 w-full"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            {error && (
              <p className="text-[13px] text-danger" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-accent w-full" disabled={busy}>
              {busy ? "…" : "set password"}
            </button>
            <p className="label-caps">other devices get signed out</p>
          </form>
        )}
      </div>
    </div>
  );
}
