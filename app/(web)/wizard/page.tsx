// P5 — case wizard. Step 1 (Evidence & documents) is live; later steps are
// placeholders for the other tracks to wire to their API routes.
import EvidenceUploader from "./EvidenceUploader";

export default function WizardPage() {
  return (
    <div>
      <h1>Case wizard</h1>
      <p className="muted">
        Work through each step to build your court-ready case. Start by adding
        your evidence — Justifi reads each file with Agnes AI and organises it
        for you.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>1 · Evidence &amp; documents</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Upload an image, PDF, Word document or text file and Justifi extracts
          the text for you. If a file is too blurry or unreadable, it&apos;s
          flagged so you can re-upload a cleaner copy.
        </p>
        <EvidenceUploader />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>2 · Hearing prep</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Paste your witness statement → <code>POST /api/hearing-script</code>,
          then rehearse with <code>POST /api/mock-qa</code>. (Coming from the
          court-appearance track.)
        </p>
      </div>
    </div>
  );
}
