import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker/VPS deploys (Vercel ignores this).
  output: "standalone",
  // pdfkit reads font metrics from its package dir at runtime — keep it external.
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      // Placeholder photography until real product shots are uploaded (Cloudinary later).
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
