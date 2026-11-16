import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {exportJWK, generateKeyPair, SignJWT} from 'jose';
import {moduleUrl} from './data-test-modules.mjs';

const db = new PGlite();
const testDb = {
  query: (sql, values) => db.query(sql, values),
  withTransaction: work => db.transaction(async transaction => work({
    async query(sql, values) {
      const result = await transaction.query(sql, values);
      return {...result, rowCount: result.affectedRows};
    },
  })),
};
const dbSymbol = Symbol.for('binso.retention.test.db');
globalThis[dbSymbol] = testDb;
const dbUrl = moduleUrl(`export const {query, withTransaction} = globalThis[Symbol.for(${JSON.stringify(Symbol.keyFor(dbSymbol))})]`);
const auditUrl = moduleUrl((await readFile('lib/server/operator/audit.ts', 'utf8'))
  .replace('import "server-only";', '').replace('"@/lib/server/db"', JSON.stringify(dbUrl)));
const job = await import(moduleUrl((await readFile('lib/server/retention-job.ts', 'utf8'))
  .replace('import "server-only";', '')
  .replace('"jose"', JSON.stringify(import.meta.resolve('jose')))
  .replace('"@/lib/server/db"', JSON.stringify(dbUrl))
  .replace('"@/lib/server/operator/audit"', JSON.stringify(auditUrl))));

const tenant = '00000000-0000-4000-8000-000000000001';
const audience = '00000000-0000-4000-8000-000000000002';
const caller = '00000000-0000-4000-8000-000000000003';
const principal = '00000000-0000-4000-8000-000000000004';
const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`;
Object.assign(process.env, {
  RETENTION_JOB_ENABLED: 'true',
  RETENTION_ENTRA_TENANT_ID: tenant,
  RETENTION_ENTRA_AUDIENCE: audience,
  RETENTION_ENTRA_CALLER_ID: caller,
  RETENTION_ENTRA_PRINCIPAL_ID: principal,
});
const {publicKey, privateKey} = await generateKeyPair('RS256');
const jwk = {...await exportJWK(publicKey), alg: 'RS256', kid: 'test'};
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
  assert.equal(String(url), `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`);
  return Response.json({keys: [jwk]});
};

try {
  const token = (claims = {}, expiry = '5 minutes') => new SignJWT({
    ver: '2.0', tid: tenant, azp: caller, oid: principal, roles: ['Retention.Run'],
    iss: issuer, aud: audience, ...claims,
  }).setProtectedHeader({alg: 'RS256', kid: 'test'})
    .setIssuedAt().setNotBefore('0 seconds').setExpirationTime(expiry).sign(privateKey);
  assert.equal(await job.authorizeRetention(null), false);
  const authorized = await token();
  assert.equal(await job.authorizeRetention(`Bearer ${authorized}`), true);
  for (const claims of [{aud: caller}, {iss: 'https://other.invalid'}, {tid: caller},
    {oid: caller}, {azp: principal}, {roles: []}, {scp: 'retention'}, {ver: '1.0'}]) {
    assert.equal(await job.authorizeRetention(`Bearer ${await token(claims)}`), false);
  }
  assert.equal(await job.authorizeRetention(`Bearer ${await token({}, '-30 seconds')}`), false);

  await db.exec(`
    create table auth_email_codes(id int primary key, consumed_at timestamptz, expires_at timestamptz);
    create table auth_sessions(id int primary key, expires_at timestamptz);
    create table platform_auth_sessions(like auth_sessions including all);
    create table app_users(id int primary key, mfa_pending_secret_enc text, mfa_pending_expires_at timestamptz);
    create table platform_audit_events(actor_user_id text, actor_email text, action text, tenant_id text,
      entity_type text, entity_id text, metadata jsonb, detail text, created_at timestamptz default now());
    insert into auth_email_codes select n,null,now()-interval '8 days' from generate_series(1,1001) n;
    insert into auth_email_codes values(1002,now()-interval '8 days',now()+interval '1 day'),
      (1003,null,now()-interval '6 days');
    insert into auth_sessions values(1,now()-interval '31 days'),(2,now()-interval '29 days');
    insert into platform_auth_sessions select * from auth_sessions;
    insert into app_users values(1,'expired',now()-interval '1 hour'),(2,'active',now()+interval '1 hour');
  `);
  assert.equal(await job.retentionIsCurrent(), false);
  assert.deepEqual(await job.runAuthRetention(), {emailCodes: 1000, sessions: 1, operatorSessions: 1, pendingMfa: 1});
  assert.equal(await job.retentionIsCurrent(), true);
  assert.deepEqual(await job.runAuthRetention(), {emailCodes: 2, sessions: 0, operatorSessions: 0, pendingMfa: 0});
  assert.deepEqual((await db.query('select id from auth_email_codes')).rows, [{id: 1003}]);
  assert.deepEqual((await db.query('select id from app_users where mfa_pending_secret_enc is not null')).rows, [{id: 2}]);
  await db.exec("update platform_audit_events set created_at=now()-interval '37 hours'");
  assert.equal(await job.retentionIsCurrent(), false);
  await db.exec("insert into auth_email_codes values(1004,null,now()-interval '8 days'); alter table platform_audit_events drop column detail");
  await assert.rejects(job.runAuthRetention(), /detail/);
  assert.deepEqual((await db.query('select id from auth_email_codes where id=1004')).rows, [{id: 1004}]);
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis[dbSymbol];
  await db.close();
}

console.log('Retention job: signed identity, batch limits, expiry boundaries, freshness and audit rollback passed.');
