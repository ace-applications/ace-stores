import type { Route } from "./+types/forgot-password";
import { useState } from "react";
import { Link } from "react-router";
import { authClient } from "../lib/api";
import { friendlyError } from "../lib/errors";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Reset your password — ACE Stores" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (res.error) {
        setError(friendlyError(res.error, "That didn't send. Try again."));
        return;
      }
      // same answer for every address — an account's existence is not ours to leak
      setSent(true);
    } catch (err) {
      setError(friendlyError(err, "That didn't send. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-16 pb-16 sm:px-6">
      <div className="panel-raised rounded-2xl p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Reset password
        </h1>
        {sent ? (
          <>
            <p className="mt-3 text-[14px] leading-relaxed text-dim">
              If that address has an account, the reset link is on its way. It works once and
              expires in an hour.
            </p>
            <Link to="/sign-in" className="btn btn-ghost mt-6">
              back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-[13.5px] text-dim">
              We&apos;ll mail a one-time link to set a new password.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="label-caps">email</span>
                <input
                  type="email"
                  className="field mt-1.5 w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              {error && (
                <p className="text-[13px] text-danger" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-accent w-full" disabled={busy}>
                {busy ? "…" : "send the link"}
              </button>
            </form>
            <div className="mt-6 border-t border-hairline pt-5">
              <Link to="/sign-in" className="font-chrome text-[12.5px] font-bold tracking-[0.08em] text-accent uppercase hover:text-ink">
                back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
