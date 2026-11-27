import {execFileSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const [workload, archive, commit, digest] = process.argv.slice(2);
const profiles = {
  'binso-one': {
    postgres: 18, command: ['node', 'scripts/start-scanner-production.mjs'],
    live: '/api/health', ready: '/api/health/ready', routes: ['/', '/produkt', '/registrieren'],
    revision: 'json',
    env: {
      BINSO_SCANNER_SIDECAR: 'false', DATABASE_SSL: 'false', APP_ENCRYPTION_KEY: 'a'.repeat(64),
      GRAPH_TENANT_ID: 'fixture', GRAPH_CLIENT_ID: 'fixture',
      GRAPH_CLIENT_SECRET: 'fixture', GRAPH_SENDER_USER_ID: 'fixture',
      STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
      ...Object.fromEntries(['START', 'BUSINESS', 'PRO'].flatMap(plan =>
        ['MONTHLY', 'YEARLY'].map(cycle => ['STRIPE_PRICE_' + plan + '_' + cycle, 'price_fixture']))),
    },
  },
  'binso-website': {
    postgres: 17, command: ['node', 'server.js'],
    live: '/build-revision.txt', ready: '/api/health', routes: ['/', '/admin/login'],
    revision: 'text', expectedReadiness: [503, 'unavailable'], env: {ADMIN_AUTH_PROVIDER: 'password'},
  },
  'pasta-giuliano': {
    postgres: 17, command: ['sh', '/home/site/wwwroot/start.sh'],
    live: '/api/health/live', ready: '/api/health/ready', routes: ['/'],
    revision: 'header',
    env: {
      AZURE_MIGRATION_COMPLETE: 'true', AZURE_NATIVE_AUTH_ENABLED: 'true',
      AZURE_STORAGE_ACCOUNT: 'fixturestorage', AZURE_COMMUNICATION_ENDPOINT: 'https://fixture.communication.azure.com',
      AZURE_EMAIL_SENDER: 'fixture@example.invalid', AUTH_CODE_PEPPER: 'synthetic-only', CRON_SECRET: 'synthetic-only',
    },
  },
};
const profile = Object.hasOwn(profiles, workload) ? profiles[workload] : null;
if (!profile || !archive || !/^[a-f0-9]{40}$/.test(commit ?? '') || !/^[a-f0-9]{64}$/.test(digest ?? '')) {
  throw Error('Usage: node scripts/docker-release-smoke.mjs WORKLOAD ZIP COMMIT SHA256');
}

const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
if (hash.digest('hex') !== digest) throw Error('The release ZIP digest does not match.');

const id = 'release-smoke-' + randomUUID().slice(0, 12);
const db = id + '-db';
const extract = id + '-unzip';
const image = 'node:24-bookworm@sha256:e7add2a490bb17d97b485b8641bd88455fff7839ade0f5eba493c3508124d413';
const directory = '/home/site/wwwroot';
const dbUrl = 'postgresql://release_fixture:release_fixture@127.0.0.1:5432/release_fixture';
const env = {NODE_ENV: 'production', PORT: '3000', HOSTNAME: '0.0.0.0',
  DATABASE_URL: dbUrl, POSTGRES_URL: dbUrl, MIGRATION_DATABASE_URL: dbUrl, ...profile.env};
const docker = (...args) => execFileSync('docker', args, {encoding: 'utf8', timeout: 120000,
  stdio: ['ignore', 'pipe', 'pipe']}).trim();
const ignore = (...args) => { try { docker(...args); } catch {} };
const requestScript = `const response=await fetch('http://127.0.0.1:3000'+process.argv[1],{
  redirect:'manual',signal:AbortSignal.timeout(4000)});
  const text=await response.text();
  console.log(JSON.stringify({status:response.status,revision:response.headers.get('x-pasta-release'),
  text:process.argv[2]==='true'?text.slice(0,2048):undefined}));`;
const request = (path, readBody = false) =>
  JSON.parse(docker('exec', id, 'node', '--input-type=module', '-e', requestScript, path, String(readBody)));

async function waitFor(label, timeoutMs, probe) {
  const deadline = performance.now() + timeoutMs;
  let detail;
  do {
    try { const result = probe(); if (result) return result; }
    catch (error) { detail = error.message; }
    await delay(500);
  } while (performance.now() < deadline);
  throw Error(label + ' did not become available' + (detail ? ': ' + detail : '.'));
}

const samples = [];
function sample() {
  const stat = docker('stats', '--no-stream', '--format', '{{json .}}', id);
  const value = JSON.parse(stat);
  samples.push({cpu: value.CPUPerc, memory: value.MemUsage});
}

try {
  docker('volume', 'create', id);
  docker('run', '--rm', '--name', extract, '--network', 'none', '-v', id + ':' + directory,
    '--mount', 'type=bind,source=' + resolve(archive) + ',target=/tmp/release.zip,readonly',
    image, 'unzip', '-oq', '/tmp/release.zip', '-d', directory);
  docker('run', '-d', '--name', db, '--network', 'none',
    '-e', 'POSTGRES_USER=release_fixture', '-e', 'POSTGRES_PASSWORD=release_fixture',
    '-e', 'POSTGRES_DB=release_fixture', 'postgres:' + profile.postgres);
  await waitFor('Fixture PostgreSQL', 45000, () =>
    docker('exec', db, 'pg_isready', '-h', '127.0.0.1', '-U', 'release_fixture', '-d', 'release_fixture'));
  docker('create', '--name', id, '--network', 'container:' + db,
    '--cpus', '1', '--memory', '1750m', '--memory-swap', '1750m',
    '-v', id + ':' + directory + ':ro', '-w', directory,
    ...Object.entries(env).flatMap(([key, value]) => ['-e', key + '=' + value]),
    image, ...profile.command);
  const started = performance.now();
  docker('start', id);
  const live = await waitFor('Package start', 60000, () => {
    // Sample while the app is starting, and record the first successful probe before the next sample.
    if (!samples.length) sample();
    const result = request(profile.live, true);
    return result.status === 200 && result;
  });
  const startMs = Math.round(performance.now() - started);
  const startupResources = JSON.parse(docker('exec', id, 'node', '-e',
    "const fs=require('node:fs'); const read=name=>{try{return fs.readFileSync('/sys/fs/cgroup/'+name,'utf8')}catch{return ''}}; " +
    "const cpu=read('cpu.stat').match(/usage_usec ([0-9]+)/);const bytes=read('memory.peak').trim(); " +
    "console.log(JSON.stringify({cpuMicros:cpu?Number(cpu[1]):null,peakBytes:/^[0-9]+$/.test(bytes)?Number(bytes):null}))"));
  const revision = profile.revision === 'text' ? live.text.trim()
    : profile.revision === 'header' ? live.revision : JSON.parse(live.text).sha;
  if (revision !== commit) throw Error('The running package did not report the expected commit.');
  if (workload === 'pasta-giuliano') {
    docker('exec', id, 'sh', '-ec',
      'cd "$(readlink /proc/1/cwd)"; node --conditions=react-server cli/scripts/azure/migrate.js --apply');
  }
  const ready = request(profile.ready, true);
  // Website production readiness requires Azure managed identity. This offline fixture verifies fail-closed behavior.
  const [expectedStatus, expectedBody] = profile.expectedReadiness ?? [200, 'ready'];
  if (ready.status !== expectedStatus || JSON.parse(ready.text).status !== expectedBody) {
    throw Error('Unexpected package readiness response: HTTP ' + ready.status + ' ' + ready.text);
  }
  for (const path of profile.routes) {
    const response = request(path);
    if (response.status !== 200) throw Error('Smoke failed for ' + path + ': HTTP ' + response.status);
    sample();
  }
  console.log(JSON.stringify({workload, commit, sha256: digest, startMs, startupResources, samples, readiness: {status: ready.status, body: JSON.parse(ready.text).status}, smokePaths: profile.routes}, null, 2));
} catch (error) {
  try { console.error(docker('logs', '--tail', '25', id)); } catch {}
  throw error;
} finally {
  ignore('rm', '-f', id, db, extract);
  ignore('volume', 'rm', id);
}
