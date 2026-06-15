import Link from "next/link";
import { INDICATIVE_NOTE } from "@/lib/sct/ruleset";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "./(auth)/actions";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main>
      <h1>Justifi</h1>
      <p className="muted">
        Turn your own account into a clear, court-ready case for Singapore&apos;s
        Small Claims Tribunal.
      </p>

      <div className="card">
        {user ? (
          <p className="muted">
            Signed in as <strong>{user.email}</strong> ·{" "}
            <Link href="/wizard">Open the case wizard →</Link>
          </p>
        ) : (
          <p className="muted">
            <Link href="/login">Sign in</Link> or{" "}
            <Link href="/register">create an account</Link> to start your case.
          </p>
        )}
      </div>

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
      </div>

      <p className="notice">{INDICATIVE_NOTE}</p>

      {user ? (
        <form action={signOut}>
          <button type="submit" className="link-button">
            Sign out
          </button>
        </form>
      ) : null}
    </main>
  );
}
