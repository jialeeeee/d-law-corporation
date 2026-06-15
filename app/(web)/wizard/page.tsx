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
        <h3 style={{ marginTop: 0 }}>1 · Evidence &amp; timeline</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Upload all of your evidence — images, PDFs, Word documents, text or
          audio recordings. Agnes AI reads (or transcribes) each file, pulls out
          the key facts and dated events, and builds a single timeline ordered
          from earliest to latest. You choose which files to include; unclear
          files are flagged so you can re-upload a cleaner copy. Your uploads stay
          here even if you reload, and you can remove any file. Export the case
          data to carry into the hearing-script step.
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
