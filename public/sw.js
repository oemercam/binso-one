const CACHE = "binso-one-shell-v10";
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
  if (url.origin !== self.location.origin || /^\/(?:api|\.auth)(?:\/|$)/.test(url.pathname)) return;

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
          return cached || offlineResponse();
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
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL('/benachrichtigungen',self.location.origin);
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(client=>{const url=new URL(client.url);return url.origin===target.origin&&url.pathname===target.pathname;});
  if(existing){try{await existing.focus();return;}catch{}}
  await self.clients.openWindow(target.href);
 })());
});

function offlineResponse() {
  return new Response("<!doctype html><html lang=\"de-CH\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Keine Verbindung | Binso One</title><style>:root{color-scheme:light dark}body{min-height:90vh;margin:0;display:grid;place-items:center;font:1rem system-ui,sans-serif}main{max-width:28rem;padding:2rem;text-align:center}img{background:white;border-radius:12px;padding:6px}a{display:inline-block;padding:.8rem 1rem;border:1px solid;border-radius:.5rem;color:inherit}</style><main><img alt=\"\" width=\"64\" height=\"64\" src=\"data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIzNzAgNDMwIDI4MCAzNDAiIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iQmluc28iPg0KICA8cGF0aCBmaWxsPSIjMDAwIiBkPSJNNjEyLjYxLDUxOC4xNWgtMTE2LjM2Yy01LjczLDAtMTAuMzcsNC42NC0xMC4zNywxMC4zN3YyNy40YzAsMi42OSwxLjA1LDUuMjgsMi45Miw3LjIybDEwLjE0LDEwLjQ2YzEuOTUsMi4wMSw0LjY0LDMuMTUsNy40NCwzLjE1aDQ4LjE0YzUuNzMsMCwxMC4zNyw0LjY0LDEwLjM3LDEwLjM3djk1LjQ1YzAsNS43My00LjY0LDEwLjM3LTEwLjM3LDEwLjM3aC05NS45MmMtNS43MywwLTEwLjM3LTQuNjQtMTAuMzctMTAuMzd2LTQ3LjkxYzAtMi43NS0xLjA5LTUuMzktMy4wNC03LjMzbC0xMC40Ny0xMC40N2MtMS45NC0xLjk0LTQuNTgtMy4wNC03LjMzLTMuMDRoLTI2Ljg4Yy01LjczLDAtMTAuMzcsNC42NC0xMC4zNywxMC4zN3Y2NmMwLDUuNzMsNC42NCwxMC4zNywxMC4zNywxMC4zN2gzMi40OGM1LjczLDAsMTAuMzcsNC42NCwxMC4zNywxMC4zN3YzMC42N2MwLDUuNzMsNC42NCwxMC4zNywxMC4zNywxMC4zN2gxNTguODdjNS43MywwLDEwLjM3LTQuNjQsMTAuMzctMTAuMzd2LTIxMy4wNWMwLTUuNzMtNC42NC0xMC4zNy0xMC4zNy0xMC4zN1oiLz4NCiAgPHBhdGggZmlsbD0iIzAwMCIgZD0iTTQwMC41Nyw1OTMuMjloMzUuMzJjMi43NSwwLDUuMzksMS4wOSw3LjMzLDMuMDRsMjIuODEsMjIuODFjMS45NCwxLjk0LDMuMDQsNC41OCwzLjA0LDcuMzN2MzUuNTdjMCw1LjczLDQuNjQsMTAuMzcsMTAuMzcsMTAuMzdoNTQuNDNjNS43MywwLDEwLjM3LTQuNjQsMTAuMzctMTAuMzd2LTU0LjQzYzAtNS43My00LjY0LTEwLjM3LTEwLjM3LTEwLjM3aC0zNS41N2MtMi43NSwwLTUuMzktMS4wOS03LjMzLTMuMDRsLTIyLjU3LTIyLjU3Yy0xLjk0LTEuOTQtMy4wNC00LjU4LTMuMDQtNy4zM3YtMTA2LjM4YzAtNS43My00LjY0LTEwLjM3LTEwLjM3LTEwLjM3aC01NC40M2MtNS43MywwLTEwLjM3LDQuNjQtMTAuMzcsMTAuMzd2MTI0Ljk5YzAsNS43Myw0LjY0LDEwLjM3LDEwLjM3LDEwLjM3WiIvPg0KPC9zdmc+DQo=\"><h1>Keine Verbindung</h1><p>Prüfe deine Internetverbindung und versuche es erneut.</p><a href=\"\">Erneut versuchen</a></main></html>", {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  })
}
