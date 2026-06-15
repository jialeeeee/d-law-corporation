// Auth helpers shared by server actions, route handlers, and protected pages.
// SERVER-ONLY. See agent.md §5a: ownership is enforced in app code (Prisma
// bypasses Supabase RLS), so resolve the user here and scope queries by its id.
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Sanitise a post-auth redirect target so `?next=` can't be used for an
 * open redirect. Only same-origin, absolute *paths* are allowed (must start
 * with a single "/"; no "//host", no "scheme://", no backslashes).
 */
export function safeNext(
  next: string | null | undefined,
  fallback = "/workspace",
): string {
  if (!next) return fallback;
  const value = next.trim();
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return fallback;
  }
  return value;
}

/**
 * Resolve the signed-in user or redirect to /login (preserving where they were
 * headed via ?next=). Use at the top of any protected server component, server
 * action, or route handler. The returned user's `id` is the value every
 * Case/Evidence query MUST filter by.
 */
export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login" + (next ? "?next=" + encodeURIComponent(next) : ""));
  }
  return user;
}
