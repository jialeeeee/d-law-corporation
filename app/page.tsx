import SiteHeader from "@/components/SiteHeader";
import HomeContent from "./HomeContent";

// Server wrapper: renders the auth-aware header (which resolves the signed-in
// user server-side) above the client home content.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <HomeContent />
    </>
  );
}
