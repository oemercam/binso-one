import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(file, imports = {}) {
  const source = await readFile(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  new Function('require', 'exports', outputText)(name => {
    assert.ok(name in imports, 'Unexpected dependency: ' + name);
    return imports[name];
  }, exports);
  return exports;
}
const config = await load('lib/config.ts');
const origin = 'https://one.binso.ch';
assert.equal(config.siteConfig.publicOrigin, origin);
const sitemap = (await load('app/sitemap.ts', { '@/lib/config': config })).default();
const robots = (await load('app/robots.ts', { '@/lib/config': config })).default();
assert.equal(robots.sitemap, origin + '/sitemap.xml');
assert.deepEqual(sitemap.map(entry => entry.url), config.publicSeoRoutes.map(path => new URL(path, origin).href));
assert.equal(new Set(sitemap.map(entry => entry.url)).size, sitemap.length);

let language = 'de';
const locale = await load('lib/server/locale.ts', {
  'next/headers': { cookies: async () => ({ get: () => ({ value: language }) }) },
  'server-only': {},
  '@/lib/locales': { asLocale: value => value, localeCookie: 'fixture', translateMessage: value => value },
});
const { publicPageMetadata } = await load('lib/public-metadata.ts', {
  '@/lib/config': config,
  '@/lib/server/locale': locale,
});
for (const path of config.publicSeoRoutes) {
  const file = path === '/' ? 'app/page.tsx' : 'app' + path + '/page.tsx';
  assert.match(await readFile(file, 'utf8'), /publicPageMetadata\(/);
  for (const selected of ['de', 'fr']) {
    language = selected;
    const data = await publicPageMetadata(path, { title: 'Test', description: 'Beschreibung' });
    const expected = path + (selected === 'de' ? '' : '?lang=fr');
    assert.equal(data.alternates.canonical, expected);
    assert.equal(data.openGraph.url, expected);
    assert.deepEqual(data.twitter.images, ['/opengraph-image?lang=' + selected]);
    assert.equal(data.robots.index, true);
  }
}
const layout = await readFile('app/layout.tsx', 'utf8');
assert.match(layout, /metadataBase = new URL\(siteConfig\.publicOrigin\)/);
assert.match(layout, /robots: \{ index: false, follow: false/);
console.log('SEO origin, sitemap, private defaults and localized preview URLs passed');
