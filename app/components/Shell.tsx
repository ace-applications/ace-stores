import type { ReactNode } from "react";

/** standard page container — width, gutters, vertical rhythm */
export function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">{children}</div>;
}