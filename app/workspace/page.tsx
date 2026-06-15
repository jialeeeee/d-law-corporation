// The Hearing Prep workspace — the main authenticated app. Access is gated by
// the middleware (PROTECTED_PREFIXES includes /workspace); here we just resolve
// the signed-in user for display and mount the client app inside the store
// provider. Outside the (web) route group, so no extra chrome/banner.
import { getCurrentUser } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/lib/store/WorkspaceProvider";
import { HearingPrepApp } from "@/components/hearing-prep/HearingPrepApp";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  const appUser = user
    ? {
        name:
          (user.user_metadata as { full_name?: string } | undefined)?.full_name ??
          undefined,
        email: user.email ?? undefined,
      }
    : undefined;

  return (
    <WorkspaceProvider>
      <HearingPrepApp user={appUser} />
    </WorkspaceProvider>
  );
}
