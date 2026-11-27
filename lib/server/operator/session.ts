import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {cookies,headers} from "next/headers";
import {query} from "@/lib/server/db";
import {env} from "@/lib/server/env";
import type {OperatorRole} from "@/lib/permissions";
import type {PoolClient} from "pg";
import {operatorEmailLoginEnabled,operatorPasskeyLoginEnabled} from "./login-mode";
import {getEntraOperatorIdentity} from "@/lib/server/operator/entra";

export type OperatorSession={sessionId:string;userId:string;email:string;name:string;role:OperatorRole;entraObjectId:string|null;entraTenantId:string|null;authSource:string};
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
const ipHash=(value:string)=>createHash("sha256").update(value).digest("hex");

export async function prepareOperatorSession(userId:string,authSource:"entra"|"password_passkey"|"password_email_code",client?:PoolClient){
 const token=randomBytes(32).toString("base64url");
 const expiresAt=new Date(Date.now()+env.sessionTtlHours*60*60*1000);
 const h=await headers();
 const ua=(h.get("user-agent")||"").slice(0,500);
 const ip=(h.get("x-forwarded-for")?.split(",")[0]?.trim()||h.get("x-real-ip")||"unknown");
 const result=client
  ? await client.query<{id:string}>(`insert into platform_auth_sessions(user_id,token_hash,expires_at,user_agent,ip_hash,auth_source) values($1,$2,$3,$4,$5,$6) returning id`,[userId,tokenHash(token),expiresAt,ua,ipHash(ip),authSource])
  : await query<{id:string}>(`insert into platform_auth_sessions(user_id,token_hash,expires_at,user_agent,ip_hash) values($1,$2,$3,$4,$5) returning id`,[userId,tokenHash(token),expiresAt,ua,ipHash(ip)]);
 return {id:result.rows[0].id,token,expiresAt};
}

export async function setOperatorSessionCookie(session:{token:string;expiresAt:Date}){
 const jar=await cookies();
 jar.set(env.operatorSessionCookieName,session.token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:session.expiresAt});
}

export async function createOperatorSession(input:{userId:string;email:string;name:string;role:OperatorRole}){
 const session=await prepareOperatorSession(input.userId,"entra");
 await setOperatorSessionCookie(session);
 return session.id;
}
export async function getOperatorSession():Promise<OperatorSession|null>{
 const emailCode=operatorEmailLoginEnabled(),local=emailCode||operatorPasskeyLoginEnabled();
 const identity=!local&&env.appMode==='production'?await getEntraOperatorIdentity():null;
 if(!local&&env.appMode==='production'&&!identity)return null;
 const jar=await cookies();const token=jar.get(env.operatorSessionCookieName)?.value;if(!token)return null;
 const result=await query<OperatorSession>(`select s.id as "sessionId",u.user_id as "userId",u.email,coalesce(u.display_name,u.email) as name,u.role,u.entra_object_id as "entraObjectId",u.entra_tenant_id as "entraTenantId",s.auth_source as "authSource" from platform_auth_sessions s join platform_operator_assignments u on u.user_id=s.user_id where s.token_hash=$1 and s.expires_at>now() and u.status='active'${emailCode?" and s.auth_source='password_email_code' and u.auth_source='entra' and u.email_password_hash is not null":local?" and s.auth_source='password_passkey' and u.auth_source='entra' and u.passkey_password_hash is not null":" and s.auth_source='entra'"}`,[tokenHash(token)]);
 const session=result.rows[0]||null;
 if(session&&!local&&env.appMode==='production'&&(!identity||session.authSource!=='entra'||identity.tenantId!==session.entraTenantId||identity.objectId!==session.entraObjectId||identity.role!==session.role))return null;
 if(session)void query(`update platform_auth_sessions set last_seen_at=now() where id=$1 and last_seen_at<now()-interval '5 minutes'`,[session.sessionId]).catch(()=>{});
 return session;
}
export async function requireOperatorSession(){
 const session=await getOperatorSession();
 if(!session){const {ApiError}=await import("@/lib/server/http");throw new ApiError(401,"unauthorized","Anmeldung erforderlich.");}
 if(env.appMode==="production"&&!operatorEmailLoginEnabled()&&!operatorPasskeyLoginEnabled()){
  const identity=await getEntraOperatorIdentity();
  if(!identity||session.authSource!=="entra"||identity.tenantId!==session.entraTenantId||identity.objectId!==session.entraObjectId||identity.role!==session.role){
   await destroyOperatorSession();
   const {ApiError}=await import("@/lib/server/http");
   throw new ApiError(401,"entra_reauthentication_required","Microsoft Entra Anmeldung oder Berechtigung ist nicht mehr gültig.");
  }
 }
 return session;
}
export async function destroyOperatorSession(){const jar=await cookies();const token=jar.get(env.operatorSessionCookieName)?.value;if(token)await query("delete from platform_auth_sessions where token_hash=$1",[tokenHash(token)]);jar.delete(env.operatorSessionCookieName)}
