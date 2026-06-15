// P5 — case wizard. Step 1 (Evidence & documents) + Step 2 (Hearing prep).
import EvidenceUploader from "./EvidenceUploader";
import HearingPrep from "./HearingPrep";

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
          files are flagged so you can re-upload a cleaner copy.
        </p>
        <EvidenceUploader />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>2 · Hearing prep</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Agnes turns your evidence timeline into a court-ready hearing script,
          then lets you practise against questions from both the Tribunal
          Magistrate and the opposing party.
        </p>
        <HearingPrep />
      </div>
    </div>
  );
}
