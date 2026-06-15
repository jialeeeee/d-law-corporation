"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

const NOT_CONFIGURED =
  "Auth is not configured yet (set NEXT_PUBLIC_SUPABASE_* in .env.local).";
const MIN_PASSWORD = 8;

type Credentials = {
  email: string;
  password: string;
  fullName: string;
  next: string;
};

function readCredentials(formData: FormData): Credentials {
  const nextRaw = formData.get("next");
  return {
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
    // Optional display name (stored as user metadata → profiles.full_name).
    fullName: String(formData.get("fullName") ?? formData.get("name") ?? "").trim(),
    next: safeNext(nextRaw ? String(nextRaw) : null),
  };
}

/** Cheap server-side validation before we spend a Supabase call. */
function validate(email: string, password: string): string | null {
  if (!email || !email.includes("@") || email.length < 3) {
    return "Enter a valid email address.";
  }
  if (password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  return null;
}

/** Build a /login or /register URL carrying an error (and the next hop). */
function back(
  path: "/login" | "/register",
  error: string,
  next?: string,
): never {
  const params = new URLSearchParams({ error });
  if (next && next !== "/wizard") params.set("next", next);
  redirect(`${path}?${params.toString()}`);
}

export async function login(formData: FormData) {
  const { email, password, next } = readCredentials(formData);
  if (!isSupabaseConfigured) back("/login", NOT_CONFIGURED, next);

  const invalid = validate(email, password);
  if (invalid) back("/login", invalid, next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back("/login", error.message, next);

  revalidatePath("/", "layout");
  redirect(next);
}

export async function register(formData: FormData) {
  const { email, password, fullName, next } = readCredentials(formData);
  if (!isSupabaseConfigured) back("/register", NOT_CONFIGURED);

  const invalid = validate(email, password);
  if (invalid) back("/register", invalid);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Surfaces in auth.users.raw_user_meta_data → copied to profiles.full_name
      // by the on_auth_user_created trigger (see supabase/migrations).
      data: fullName ? { full_name: fullName } : undefined,
    },
  });
  if (error) back("/register", error.message);

  // When the project requires email confirmation, signUp returns no session.
  if (!data.session) {
    redirect(
      "/login?message=" +
        encodeURIComponent(
          "Check your email to confirm your account, then sign in.",
        ),
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
