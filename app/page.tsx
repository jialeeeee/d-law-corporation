import Link from "next/link";
import { INDICATIVE_NOTE } from "@/lib/sct/ruleset";

export default function Home() {
  return (
    <main>
      <h1>Justifi</h1>
      <p className="muted">
        Turn your own account into a clear, court-ready case for Singapore&apos;s
        Small Claims Tribunal.
      </p>

      <div className="card">
        <h2>Active features</h2>
        <ul>
          <li>
            <strong>Evidence organiser + audio transcription</strong> — extract
            structured facts from images and audio, flag non-English material.
          </li>
          <li>
            <strong>Hearing prep</strong> — turn your witness statement into a
            hearing script and rehearse with a mock Q&amp;A.
          </li>
        </ul>
        <p>
          <Link href="/wizard">Open the case wizard →</Link>
        </p>
      </div>

      <p className="notice">{INDICATIVE_NOTE}</p>
    </main>
  );
}
