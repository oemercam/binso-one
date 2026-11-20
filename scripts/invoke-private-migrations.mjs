import {execFileSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';

const [input, ...extra] = process.argv.slice(2);
if (!input || extra.length) throw new Error('Provide one migration archive or --probe');

const slotScm = 'https://binso-admin-prod-db-migrations-fka9gjcycqezgffv.scm.switzerlandnorth-01.azurewebsites.net';
const args = ['account', 'get-access-token', '--resource-type', 'arm', '--query', 'accessToken', '-o', 'tsv', '--only-show-errors'];
const windows = process.platform === 'win32';
const executable = windows ? 'cmd.exe' : 'az';
const command = windows ? ['/d', '/c', 'az.cmd', ...args] : args;
const token = execFileSync(executable, command, {encoding: 'utf8'}).trim();
if (!token) throw new Error('Azure authentication is required');

const id = randomUUID().replaceAll('-', '');
const base = slotScm + '/api/vfs/data/private-migrations/' + id;
const headers = {Authorization: 'Bearer ' + token};

function request(suffix, options = {}) {
  return fetch(base + suffix, {
    ...options,
    headers: {...headers, ...options.headers},
    redirect: 'error',
    signal: AbortSignal.timeout(90_000),
  });
}

async function put(suffix, body, type) {
  const response = await request(suffix, {method: 'PUT', body, headers: {'Content-Type': type}});
  if (!response.ok) throw new Error('Migration slot upload returned HTTP ' + response.status);
  await response.body?.cancel();
}

const probe = input === '--probe';
let digest = null;
if (!probe) {
  const bundle = await readFile(input);
  digest = createHash('sha256').update(bundle).digest('hex');
  await put('.tar.gz', bundle, 'application/gzip');
}
console.log('Private migration job ' + id);

try {
  await put('.json', JSON.stringify({probe, digest}), 'application/json');
} catch (error) {
  if (error.name !== 'TimeoutError') throw error;
  // An accepted request may outlive the response. Poll the same ID without re-submitting.
}

const deadline = Date.now() + 12 * 60_000;
while (Date.now() < deadline) {
  await sleep(4_000);
  let response;
  try {
    response = await request('.result.json');
  } catch (error) {
    if (error.name === 'TimeoutError' || error instanceof TypeError) continue;
    throw error;
  }
  if (response.status === 404 || response.status === 429 || response.status >= 500) {
    await response.body?.cancel();
    continue;
  }
  if (!response.ok) throw new Error('Migration result lookup returned HTTP ' + response.status);
  const result = await response.json();
  if (result.status !== 'success' || result.stage !== (probe ? 'managed_identity' : 'migration')) {
    const stage = /^[a-z_]+$/.test(String(result.stage)) ? result.stage : 'unknown';
    throw new Error('Private migration job ' + id + ' failed at ' + stage);
  }

  try {
    const cleanup = await request('.result.json', {method: 'DELETE', headers: {'If-Match': '*'}});
    if (!cleanup.ok && cleanup.status !== 404) console.warn('Migration result receipt was retained');
    await cleanup.body?.cancel();
  } catch {
    console.warn('Migration result receipt was retained');
  }
  console.log(probe ? 'Private network and managed identity verified' : 'Private PostgreSQL migrations completed');
  process.exit(0);
}

throw new Error('No result for private migration job ' + id + '. Check this job before retrying.');
