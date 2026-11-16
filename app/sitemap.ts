import type { MetadataRoute } from "next";
import { publicSeoRoutes, siteConfig } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSeoRoutes.map(path => ({ url: new URL(path, siteConfig.publicOrigin).href }));
}
