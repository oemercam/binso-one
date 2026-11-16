export const siteConfig = {
  name: "Binso One",
  description: "Die moderne Business-Plattform für Schweizer KMU.",
  publicOrigin: "https://one.binso.ch",
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://www.binso.ch",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const publicSeoRoutes = [
  "/", "/produkt", "/preise", "/impressum", "/datenschutz", "/agb",
  "/auftragsbearbeitung", "/unterauftragsbearbeiter",
] as const;
