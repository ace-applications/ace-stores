/**
 * One role check for the whole app. `role` arrives from Better Auth's admin
 * plugin via additionalFields and is not on the generated session type, so it
 * has to be read structurally.
 */
export function isAdmin(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  return (user as { role?: string | null }).role === "admin";
}
