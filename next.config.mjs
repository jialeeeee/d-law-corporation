/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep server-only secrets (AGNES_KEY) out of the client bundle.
  // Do NOT add AGNES_KEY here or to any NEXT_PUBLIC_* variable.
  reactStrictMode: true,
};

export default nextConfig;
