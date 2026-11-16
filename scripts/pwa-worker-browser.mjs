import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const engine = process.env.PWA_BROWSER ?? 'chromium'
const browserModule = process.env.BINSO_PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.BINSO_PLAYWRIGHT_MODULE).href
  : 'playwright'
const playwright = await import(browserModule)
const worker = await readFile('public/sw.js')
const expectedOffline = /Keine Verbindung/i
const privatePath = '/dashboard/pwa-fixture'
let account = 'alice'
let offline = false
let browser
const server = createServer((request, response) => {
  if (offline) {
    request.socket.destroy()
    return
  }
  if (request.url === '/sw.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' })
    response.end(worker)
    return
  }
  if (request.url === privatePath) {
    // Even cacheable-looking private HTML must stay outside Cache Storage.
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' })
    response.end('<!doctype html><h1>' + account + '</h1>')
    return
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end('<!doctype html><h1>Isolated PWA fixture</h1>')
})

try {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = 'http://127.0.0.1:' + server.address().port
  browser = await playwright[engine].launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(origin)
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }))
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  // Simulate browser storage eviction after the worker has taken control.
  await page.evaluate(async () => {
    for (const key of await caches.keys()) await caches.delete(key)
    await caches.open('independent-browser-feature')
  })
  offline = true
  const response = await page.goto(origin + '/unvisited-page')
  assert.equal(response?.status(), 503)
  assert.match(await page.locator('body').innerText(), expectedOffline)
  assert.equal(await page.evaluate(() => caches.has('independent-browser-feature')), true)

  offline = false
  await page.getByRole('link', { name: 'Erneut versuchen' }).click()
  await page.locator('h1').waitFor()
  assert.equal(await page.locator('h1').innerText(), 'Isolated PWA fixture')

  await page.goto(origin + privatePath)
  assert.equal(await page.locator('h1').innerText(), 'alice')
  const privateCacheKeys = await page.evaluate(async () => {
    const names = await caches.keys()
    return (await Promise.all(names.map(async name => (await (await caches.open(name)).keys())
      .map(request => new URL(request.url).pathname)))).flat()
  })
  assert.ok(!privateCacheKeys.includes(privatePath), 'Private HTML must not be saved in Cache Storage')

  offline = true
  await page.goto(origin + privatePath)
  assert.match(await page.locator('h1').innerText(), expectedOffline)
  account = 'bob'
  offline = false
  await page.getByRole('link', { name: 'Erneut versuchen' }).click()
  assert.equal(await page.locator('h1').innerText(), 'bob')
  const recovered = await page.goto(origin + '/reconnected')
  assert.equal(recovered?.status(), 200)
  assert.equal(await page.locator('h1').innerText(), 'Isolated PWA fixture')
  console.log(engine + ': real worker activation, empty-cache retry, reconnect and account isolation passed')
} finally {
  try {
    await browser?.close()
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve))
  }
}
