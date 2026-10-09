import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import { StoreProvider } from "./lib/store";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { abs, pageMeta } from "./lib/seo";
import logoMain from "../assets/Logo/ACE Stores Logo/Ace Stores main.png";
import "./app.css";

export const links: Route.LinksFunction = () => [];

export function meta({}: Route.MetaArgs) {
  return pageMeta({
    title: "ACE Stores — video transition packs & audio assets",
    description:
      "Video transition packs and audio assets for editors and producers, made and sold by ACE. One price per pack, instant self-serve download to your library.",
    image: abs(logoMain),
  });
}

/** Brand entity, declared once, via the homepage's meta. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ACE Stores",
    url: abs("/"),
    parentOrganization: { "@type": "Organization", name: "ACE LLC" },
    logo: abs(logoMain),
    description:
      "ACE LLC's own video transition packs and audio assets, sold direct to editors and producers.",
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b0c10" />
        <Meta />
        <Links />
        {/* Self-referencing canonical — filter permutations must not compete
            with the clean catalog URL. */}
        <link rel="canonical" href={abs(pathname)} />
      </head>
      <body>
        <StoreProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-chrome focus:text-[12.5px] focus:font-bold focus:tracking-[0.08em] focus:text-ground focus:uppercase"
          >
            skip to content
          </a>
          <Nav />
          <main id="main" className="min-h-[70vh]">
            {children}
          </main>
          <Footer />
        </StoreProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // "Signal Print" was the replaced visual world (PRODUCT.md); keep the copy
  // in this store's voice.
  let message = "The store didn't load.";
  let details = "Something went wrong on our side. Try again in a moment.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Nothing on this shelf." : `That's a ${error.status}.`;
    details =
      error.status === 404
        ? "The page you asked for doesn't exist — it may have been renamed or removed."
        : error.statusText || details;
  } else if (error instanceof Error) {
    // A backend outage is the common case; say what to do about it.
    const unreachable = /fetch failed|Failed to fetch|ECONNREFUSED|NetworkError/i.test(error.message);
    if (unreachable) {
      message = "We can't reach the store backend.";
      details = "This is on our side, not yours. Reload in a moment — if it keeps happening, tell us.";
    } else if (import.meta.env.DEV) {
      details = error.message;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <svg viewBox="0 0 48 48" className="mx-auto w-12" aria-hidden>
        <path
          d="M8 30l10-10 8 8 6-6 8 8"
          fill="none"
          stroke="#3a3f4a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="38" cy="30" r="3" fill="#8b5cf6" />
      </svg>
      <h1 className="mt-6 font-display text-4xl font-extrabold text-ink">{message}</h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-[14px] text-dim">{details}</p>
      <Link to="/" className="btn btn-ghost mt-8">
        back to the store
      </Link>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="panel mt-10 overflow-x-auto p-4 text-left text-[12px] text-faint">
          <code>{error.stack}</code>
        </pre>
      )}
    </div>
  );
}
