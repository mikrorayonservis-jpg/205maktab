/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production serveri üçün: BUILD_STANDALONE=1 npm run build (docs/deployment/DEPLOYMENT.md)
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "sharp", "nodemailer", "mysql2"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  experimental: {
    // Yükləmələr route handler-lərdə ölçü limiti ilə yoxlanılır
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
