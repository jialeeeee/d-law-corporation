import Link from "next/link";
import { login } from "../actions";

// Functional (intentionally minimal) sign-in form. Donna: this is yours to style.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <div className="card auth-card">
      <h1>Sign in</h1>
      {error ? <p className="notice auth-error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}

      <form action={login} className="auth-form">
        {/* Carries the originally requested page so middleware round-trips back. */}
        <input type="hidden" name="next" value={next ?? ""} />
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </form>

      <p className="muted">
        No account? <Link href="/register">Create one</Link>
      </p>
    </div>
  );
}
