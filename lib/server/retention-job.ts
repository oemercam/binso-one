import "server-only";
import {createRemoteJWKSet, jwtVerify} from "jose";
import {query, withTransaction} from "@/lib/server/db";
import {platformAudit} from "@/lib/server/operator/audit";

const action = "auth.retention.completed";
const batchLimit = 1000;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function identity() {
  if (process.env.RETENTION_JOB_ENABLED !== "true") return null;
  const tenant = process.env.RETENTION_ENTRA_TENANT_ID ?? "";
  const audience = process.env.RETENTION_ENTRA_AUDIENCE ?? "";
  const caller = process.env.RETENTION_ENTRA_CALLER_ID ?? "";
  const principal = process.env.RETENTION_ENTRA_PRINCIPAL_ID ?? "";
  if (![tenant, audience, caller, principal].every(value => uuid.test(value))) return null;
  return {tenant, audience, caller, principal};
}

export async function authorizeRetention(authorization: string | null) {
  const expected = identity();
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_.-]{1,8192})$/i);
  if (!expected || !match) return false;
  try {
    let keys = keySets.get(expected.tenant);
    if (!keys) {
      keys = createRemoteJWKSet(new URL(
        `https://login.microsoftonline.com/${expected.tenant}/discovery/v2.0/keys`,
      ), {timeoutDuration: 5000});
      keySets.set(expected.tenant, keys);
    }
    const {payload} = await jwtVerify(match[1], keys, {
      algorithms: ["RS256"],
      audience: expected.audience,
      issuer: `https://login.microsoftonline.com/${expected.tenant}/v2.0`,
      requiredClaims: ["exp", "iat", "nbf"],
      clockTolerance: 10,
    });
    return payload.ver === "2.0" && payload.tid === expected.tenant &&
      payload.azp === expected.caller && payload.oid === expected.principal &&
      payload.scp === undefined && Array.isArray(payload.roles) &&
      payload.roles.includes("Retention.Run");
  } catch {
    return false;
  }
}

export async function runAuthRetention() {
  return withTransaction(async client => {
    const lock = await client.query<{acquired: boolean}>(
      "select pg_try_advisory_xact_lock(839145, 1) as acquired",
    );
    if (!lock.rows[0]?.acquired) return null;
    const codes = await client.query(`with batch as (
      select id from auth_email_codes
      where consumed_at < now() - interval '7 days' or expires_at < now() - interval '7 days'
      order by expires_at,id limit $1 for update skip locked
    ) delete from auth_email_codes target using batch where target.id=batch.id`, [batchLimit]);
    const sessions = await client.query(`with batch as (
      select id from auth_sessions where expires_at < now() - interval '30 days'
      order by expires_at,id limit $1 for update skip locked
    ) delete from auth_sessions target using batch where target.id=batch.id`, [batchLimit]);
    const operatorSessions = await client.query(`with batch as (
      select id from platform_auth_sessions where expires_at < now() - interval '30 days'
      order by expires_at,id limit $1 for update skip locked
    ) delete from platform_auth_sessions target using batch where target.id=batch.id`, [batchLimit]);
    const mfa = await client.query(`with batch as (
      select id from app_users where mfa_pending_expires_at < now()
      order by mfa_pending_expires_at,id limit $1 for update skip locked
    ) update app_users target set mfa_pending_secret_enc=null,mfa_pending_expires_at=null
      from batch where target.id=batch.id`, [batchLimit]);
    const counts = {
      emailCodes: codes.rowCount ?? 0,
      sessions: sessions.rowCount ?? 0,
      operatorSessions: operatorSessions.rowCount ?? 0,
      pendingMfa: mfa.rowCount ?? 0,
    };
    await platformAudit({action, entityType: "maintenance", metadata: counts}, client);
    return counts;
  });
}

export async function retentionIsCurrent() {
  if (!identity()) return false;
  const result = await query<{current: boolean}>(`select exists (
    select 1 from platform_audit_events
    where created_at >= now() - interval '36 hours' and action=$1
  ) as current`, [action]);
  return result.rows[0]?.current === true;
}
