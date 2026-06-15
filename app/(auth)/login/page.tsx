import Link from "next/link";
import { login } from "../actions";
import { SubmitButton } from "../SubmitButton";

// Sign-in form. Server component → posts to the `login` server action.
// Field names (email, password, hidden next) are the contract — keep them.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;
  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register";

  return (
    <div className="auth-card">
      <h1>Welcome back</h1>
      <p className="auth-sub">Sign in to continue preparing your case.</p>

      {error ? <p className="notice auth-error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}

      <form action={login} className="auth-form">
        {/* Carries the originally requested page so middleware round-trips back. */}
        <input type="hidden" name="next" value={next ?? ""} />
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>
        <SubmitButton label="Sign in" pendingLabel="Signing in…" />
      </form>

      <p className="auth-alt">
        Don&apos;t have an account?{" "}
        <Link href={registerHref}>Create one</Link>
      </p>
    </div>
  );
}
