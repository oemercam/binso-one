import {getLocaleCatalogue} from '@/lib/server/locale-catalogue';
import {FontPreload} from "@/components/font-preload";
import {cookies} from "next/headers";
import {LocaleProvider} from "@/lib/client/locale";
import {asLocale,localeCookie,localeTags} from "@/lib/locales/config";
import type { Metadata, Viewport } from "next";
import "./binso-ui.css";
import {AppShellLayout} from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import {initializeTheme} from "@/lib/theme";
import {ThemeRuntime} from "@/components/theme-runtime";
import { siteConfig } from "@/lib/config";
import { PrivacyConsent } from "@/components/privacy-consent";
import {FreshAuthenticationDialog} from '@/components/fresh-authentication-dialog';

import {pilotEnabled} from '@/config/plan-access';

const metadataBase = new URL(siteConfig.publicOrigin);

export const metadata: Metadata = {
  metadataBase,
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  category: "business",
  authors: [{ name: "Binso GmbH", url: "https://binso.ch" }],
  creator: "Binso GmbH",
  publisher: "Binso GmbH",
  robots: { index: false, follow: false, noarchive: true },
  manifest: "/manifest.webmanifest",
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  appleWebApp: {
    capable: true,
    title: "Binso One",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/brand/pwa-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/pwa-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale=asLocale((await cookies()).get(localeCookie)?.value);
  return (
    <html lang={localeTags[locale]} suppressHydrationWarning data-binso-pilot={pilotEnabled?"1":undefined}>
      <head><FontPreload/><script id="binso-theme-init" dangerouslySetInnerHTML={{__html:`(${initializeTheme.toString()})();`}} /></head>
      <body>
        <LocaleProvider initialLocale={locale} initialCatalogue={getLocaleCatalogue(locale)}>
        <ThemeRuntime />
        <div id="binso-page-content"><AppShellLayout>{children}</AppShellLayout></div>
        <PrivacyConsent />
        <FreshAuthenticationDialog />
        <PwaRegister />
        <WebVitalsReporter />
        </LocaleProvider>
      </body>
    </html>
  );
}
