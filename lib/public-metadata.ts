import type { Metadata } from "next";
import { siteConfig, type publicSeoRoutes } from "@/lib/config";
import { localizeMetadata } from "@/lib/server/locale";


type PublicSeoRoute = typeof publicSeoRoutes[number];

export function publicPageMetadata(path: PublicSeoRoute, details: {
  title: string;
  description: string;
}): Promise<Metadata> {
  const { title, description } = details;
  const socialTitle = path === "/" ? title : title + " | " + siteConfig.name;
  return localizeMetadata({
    title: path === "/" ? { absolute: title } : title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website", title: socialTitle, description, url: path, siteName: siteConfig.name,
    },
    twitter: { card: "summary_large_image", title: socialTitle, description },
  }, path);
}
