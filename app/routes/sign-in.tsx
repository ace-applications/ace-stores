import type { Route } from "./+types/sign-in";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { authClient } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Sign in — ACE Stores" }, { name: "robots", content: "noindex, nofollow" }];
}

const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === "true";

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/";
  const { data: session } = authClient.useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "in"
          ? await authClient.signIn.email({ email, password, rememberMe: true })
          : await authClient.signUp.email({ email, password, name });
      if (res.error) {
        setError(res.error.message ?? "Something went wrong.");
        return;
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16 pb-16 sm:px-6">
        <div className="panel-raised rounded-2xl p-8 text-center">
          <p className="label-caps">signed in</p>
          <p className="mt-3 font-display text-xl font-bold text-ink">{session.user.email}</p>
          <Link to="/" className="btn btn-ghost mt-6">
            back to the store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-16 pb-16 sm:px-6">
      <div className="panel-raised rounded-2xl p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          {mode === "in" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-[13.5px] text-dim">
          {mode === "in"
            ? "Your library and orders live behind your account."
            : "One account for orders, downloads, and your shelf."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <label className="block">
              <span className="label-caps">name</span>
              <input
                className="field mt-1.5 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}
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
          <label className="block">
            <span className="label-caps">password</span>
            <input
              type="password"
              className="field mt-1.5 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            {mode === "up" && <span className="label-caps mt-1 block">8 characters minimum</span>}
          </label>

          {error && (
            <p className="text-[13px] text-danger" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-accent w-full" disabled={busy}>
            {busy ? "…" : mode === "in" ? "sign in" : "create account"}
          </button>
        </form>

        {GOOGLE_ENABLED && (
          <button
            type="button"
            className="btn btn-ghost mt-3 w-full"
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
          >
            continue with google
          </button>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-hairline pt-5">
          <span className="label-caps">{mode === "in" ? "no account yet?" : "already have one?"}</span>
          <button
            type="button"
            className="font-chrome text-[12.5px] font-bold tracking-[0.08em] text-accent uppercase hover:text-ink"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError(null);
            }}
          >
            {mode === "in" ? "create one" : "sign in instead"}
          </button>
        </div>
      </div>
    </div>
  );
}
