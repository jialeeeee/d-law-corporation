// P5 — case wizard. Placeholder that lists the active feature steps.
// Owner (UX-leaning): wire each step to its API route as a tab/stepper.
export default function WizardPage() {
  return (
    <div>
      <h1>Case wizard</h1>
      <p className="muted">
        Work through each step to build your court-ready case. (Steps below are
        placeholders — wire them to their API routes.)
      </p>

      <div className="card">
        <h3>1 · Evidence &amp; audio</h3>
        <p className="muted">
          Upload images/audio → <code>POST /api/evidence</code> and{" "}
          <code>POST /api/transcribe</code>. Produces an image transcript,
          summary and timeline of dated events; flags non-English material and
          links each item to a fact.
        </p>
      </div>

      <div className="card">
        <h3>2 · Hearing prep</h3>
        <p className="muted">
          Paste your witness statement → <code>POST /api/hearing-script</code>,
          then rehearse with <code>POST /api/mock-qa</code>.
        </p>
      </div>
    </div>
  );
}
