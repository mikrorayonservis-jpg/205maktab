import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dashboard", "/journal", "/grades", "/attendance", "/homework", "/schedule", "/profile", "/notifications", "/editorial", "/reports", "/official-journal", "/login", "/register", "/reset-password", "/verify-email", "/forgot-password"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
