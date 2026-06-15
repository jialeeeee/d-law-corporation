import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

// Top navigation bar with auth state. Server component: resolves the signed-in
// user server-side, then shows their name + a Sign out button when logged in,
// or the Log in / Sign up entry points otherwise. Sign out posts to the
// `signOut` server action (app/(auth)/actions.ts), which clears the Supabase
// session and redirects to /login. Degrades to the logged-out view when auth
// isn't configured (getCurrentUser returns null).
export default async function SiteHeader() {
  const user = await getCurrentUser();
  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const displayName = fullName || user?.email || "";

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-brand">
          <span aria-hidden>⚖️</span> Dlaw
        </Link>

        <nav className="site-actions">
          {user ? (
            <>
              {displayName ? (
                <span className="site-user" title={displayName}>
                  {displayName}
                </span>
              ) : null}
              <form action={signOut}>
                <button type="submit" className="btn-signout">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="site-link">
                Log in
              </Link>
              <Link href="/register" className="btn-cta">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
