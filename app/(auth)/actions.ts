"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/login?error=" + encodeURIComponent("Auth is not configured yet (set NEXT_PUBLIC_SUPABASE_* in .env.local)."));
  }
  const { email, password } = readCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/", "layout");
  redirect("/wizard");
}

export async function register(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/register?error=" + encodeURIComponent("Auth is not configured yet (set NEXT_PUBLIC_SUPABASE_* in .env.local)."));
  }
  const { email, password } = readCredentials(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect("/register?error=" + encodeURIComponent(error.message));
  }
  // If the project requires email confirmation, no session is returned yet.
  if (!data.session) {
    redirect("/login?message=" + encodeURIComponent("Check your email to confirm your account, then sign in."));
  }
  revalidatePath("/", "layout");
  redirect("/wizard");
}
