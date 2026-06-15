import type { ReactNode } from "react";

// Shell for the auth pages (route group `(auth)` — no URL segment).
// Donna (P5/UX): restyle the forms in login/ and register/ as you like.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
