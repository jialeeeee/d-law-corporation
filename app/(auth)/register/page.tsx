import Link from "next/link";
import { register } from "../actions";

// Registration form. Server component → posts to the `register` server action.
// Field names (fullName, email, password, hidden next) are the contract — keep them.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <p className="auth-sub">
        Register to start organising your Small Claims case.
      </p>

      {error ? <p className="notice auth-error">{error}</p> : null}

      <form action={register} className="auth-form">
        {/* Preserve the originally requested page through registration too. */}
        <input type="hidden" name="next" value={next ?? ""} />
        <label>
          Full name <span className="auth-optional">(optional)</span>
          {/* Stored as user metadata → profiles.full_name via the signup trigger. */}
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            required
          />
        </label>
        <button type="submit" className="auth-submit">
          Create account
        </button>
      </form>

      <p className="auth-alt">
        Already have an account? <Link href={loginHref}>Sign in</Link>
      </p>
    </div>
  );
}
