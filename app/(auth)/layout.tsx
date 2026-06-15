import type { ReactNode } from "react";
import Link from "next/link";

// Shell for the auth pages (route group `(auth)` — no URL segment).
// Full-height, centered, with the shared brand header above the form card.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <Link href="/" className="auth-brand">
        <span className="logo" aria-hidden>
          ⚖️
        </span>
        <span className="wordmark">Dlaw</span>
        <span className="tagline">Small Claims Tribunal helper</span>
      </Link>

      {children}

      <p className="auth-note">
        Information only — not legal advice. The official CJTS pre-filing
        assessment and the Tribunal are the authority.
      </p>
    </div>
  );
}
