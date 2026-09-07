import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { StoreProvider } from "./lib/store";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import "./app.css";

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b0c10" />
        <Meta />
        <Links />
      </head>
      <body>
        <StoreProvider>
          <Nav />
          <main className="min-h-[70vh]">{children}</main>
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
  let message = "Static on the line.";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "No signal here." : `Signal fault ${error.status}`;
    details =
      error.status === 404
        ? "The page you requested doesn't exist on this shelf."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
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
