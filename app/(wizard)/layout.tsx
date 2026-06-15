import type { ReactNode } from "react";
import { INDICATIVE_NOTE } from "@/lib/sct/ruleset";

// Wizard shell (P5). Owner: surface each active feature as a step/tab here.
export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      {children}
      <p className="notice" style={{ marginTop: "2rem" }}>
        {INDICATIVE_NOTE}
      </p>
    </main>
  );
}
