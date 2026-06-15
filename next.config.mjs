/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep server-only secrets (AGNES_KEY) out of the client bundle.
  // Do NOT add AGNES_KEY here or to any NEXT_PUBLIC_* variable.
  reactStrictMode: true,

  // Evidence text extraction (F2) uses pdf-parse + mammoth, which depend on
  // pdfjs-dist. These are Node-only CommonJS libraries that crash if webpack
  // bundles them into the server build ("Object.defineProperty called on
  // non-object"). Mark them external so Next require()s them at runtime instead.
  serverExternalPackages: ["pdf-parse", "mammoth", "pdfjs-dist"],

  experimental: {
    // The workspace is persisted via a Server Action that receives the whole
    // case state — including the text extracted from every uploaded file. The
    // default 1 MB Server Action body cap is exceeded after a few documents,
    // which made the save (and the next upload) fail. Give it real headroom.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
