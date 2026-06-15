"use client";

// Submit button for the auth forms that shows a spinner + "…ing" label while the
// server action (login / register) is in flight, so the user sees the system is
// working. useFormStatus reads the pending state of the enclosing <form>.
import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="auth-submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span className="auth-spinner" aria-hidden /> {pendingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}
