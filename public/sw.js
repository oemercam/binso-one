const CACHE = "binso-one-shell-v9";
const OFFLINE_URL = "/offline";
const SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/manifest-app.webmanifest",
  "/manifest-admin.webmanifest",
  "/manifest-portal.webmanifest",
  "/brand/logo-black.svg",
  "/brand/icon-black.svg",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(SHELL_ASSETS.map(path => cache.add(path))))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("binso-one-shell-") && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// A stalled radio/DNS connection must not leave an installed PWA blank forever.
// Keep personal documents network-only; the fallback is the public offline page.
async function fetchNavigation(request) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (request.signal.aborted) cancel();
  else request.signal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 8000);
  try {
    return await fetch(request, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", cancel);
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.headers?.has("Range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never proxy or cache Next.js build assets. They are content-hashed and
  // must always be resolved by the browser/HTTP cache for the active build.
  if (url.pathname.startsWith("/_next/")) return;

  // App/document navigations are always network-first; only use the offline
  // document when the network is genuinely unavailable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetchNavigation(request)
        .catch(async () => {
          const cached = await caches.open(CACHE).then(cache => cache.match(OFFLINE_URL)).catch(() => undefined);
          return cached || new Response("Keine Verbindung. Bitte lade die Seite erneut, sobald du wieder online bist.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
        })
    );
    return;
  }

  // Small stable public shell assets may use network-first caching.
  if (url.pathname.startsWith("/brand/") || (url.pathname !== OFFLINE_URL && SHELL_ASSETS.includes(url.pathname))) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(async response => {
          if (response.status === 200 && !response.redirected) {
            await caches.open(CACHE).then(cache => cache.put(request, response.clone())).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => (await caches.open(CACHE).then(cache => cache.match(request)).catch(() => undefined)) || Response.error())
    );
  }
});

self.addEventListener("message",event=>{if(event.origin!==self.location.origin||event.source?.type!=="window")return;if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});

// Generic lock-screen content only. Navigation always re-authenticates in the app.
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()??{}}catch{}event.waitUntil(self.registration.showNotification('Binso One',{body:typeof data.body==='string'?data.body:'Binso One',icon:'/brand/pwa-icon-192.png',tag:typeof data.tag==='string'?data.tag:'binso-notification',data:{url:'/benachrichtigungen'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow(new URL('/benachrichtigungen',self.location.origin).href))});
