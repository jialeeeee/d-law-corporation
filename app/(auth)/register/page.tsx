import Link from "next/link";
import { register } from "../actions";

// Functional (intentionally minimal) registration form. Donna: style this.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="card auth-card">
      <h1>Create your account</h1>
      <p className="muted">Register to create a case and upload your evidence.</p>
      {error ? <p className="notice auth-error">{error}</p> : null}

      <form action={register} className="auth-form">
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <button type="submit">Create account</button>
      </form>

      <p className="muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
