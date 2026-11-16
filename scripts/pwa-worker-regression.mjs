import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const handlers = new Map()
const entries = new Map()
const deleted = []
let networkStatus = 503
let online = false
const origin = 'https://pwa.test'
const key = request => typeof request === 'string' ? request : request.url
const cache = {
  match: async request => entries.get(key(request)),
  put: async (request, response) => entries.set(key(request), response),
}
vm.runInNewContext(await readFile('public/sw.js', 'utf8'), {
  URL, Response, AbortController, AbortSignal, setTimeout, clearTimeout,
  self: {
    location: { origin },
    clients: { claim: async () => {} },
    addEventListener: (name, callback) => handlers.set(name, callback),
  },
  caches: {
    open: async () => cache,
    match: cache.match,
    keys: async () => ["another-feature-cache","binso-one-shell-v8"],
    delete: async name => deleted.push(name),
  },
  fetch: async () => {
    if (!online) throw new Error('Offline')
    return new Response('network response', { status: networkStatus })
  },
})

async function request(path, { mode = 'cors', headers = {}, method = 'GET' } = {}) {
  let response
  let background
  handlers.get('fetch')({
    request: {
      url: new URL(path, origin).href, method, mode, headers: new Headers(headers),
      signal: new AbortController().signal,
    },
    respondWith: promise => { response = promise },
    waitUntil: promise => { background = promise },
  })
  const result = await response
  await background
  return result
}

let activation
handlers.get('activate')({ waitUntil: promise => { activation = promise } })
await activation
assert.deepEqual(deleted, ["binso-one-shell-v8"], "Worker must remove its obsolete cache and preserve other caches")

const offline = await request('/uncached-page', { mode: 'navigate' })
assert.equal(offline.status, 503, 'An empty cache must still produce a valid offline response')
assert.match(await offline.text(), /Keine Verbindung/i)

for (const path of ["/api/dashboard","/_next/static/app.js"]) {
  assert.equal(await request(path), undefined, `Private route must bypass caching: ${path}`)
}
assert.equal(await request('/api/example', { method: 'POST' }), undefined)
assert.equal(await request('https://external.test/example.js'), undefined)
assert.equal(await request("/brand/logo.svg", { headers: { Range: 'bytes=0-9' } }), undefined)

online = true
networkStatus = 200
assert.equal((await request("/brand/logo.svg")).status, 200)
networkStatus = 503
await request("/brand/logo.svg")
online = false
assert.equal((await request("/brand/logo.svg")).status, 200, 'A failed refresh must preserve the last valid asset')
console.log('PWA worker regression checks passed')
