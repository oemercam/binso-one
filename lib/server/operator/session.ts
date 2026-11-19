import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {cookies,headers} from "next/headers";
import type {PoolClient} from "pg";
import {query} from "@/lib/server/db";
import {env} from "@/lib/server/env";
import type {OperatorRole} from "@/lib/permissions";
import {getEntraOperatorIdentity} from "@/lib/server/operator/entra";

export type OperatorSession={sessionId:string;userId:string;email:string;name:string;role:OperatorRole;entraObjectId:string|null;entraTenantId:string|null;authSource:string};
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
const ipHash=(value:string)=>createHash("sha256").update(value).digest("hex");

export async function prepareOperatorSession(userId:string, authSource:"entra"|"email_code", client?:PoolClient){
 const token=randomBytes(32).toString("base64url");
 const expiresAt=new Date(Date.now()+(authSource==="email_code"?Math.min(12,env.sessionTtlHours):env.sessionTtlHours)*60*60*1000);
 const h=await headers();
 const ua=(h.get("user-agent")||"").slice(0,500);
 const ip=(h.get("x-forwarded-for")?.split(",")[0]?.trim()||h.get("x-real-ip")||"unknown");
 const sql="insert into platform_auth_sessions(user_id,token_hash,expires_at,user_agent,ip_hash,auth_source) select user_id,$2,$3,$4,$5,$6 from platform_operator_assignments where user_id=$1 and auth_source=$6 and status='active' returning id";
 const params=[userId,tokenHash(token),expiresAt,ua,ipHash(ip),authSource];
 const result=client?await client.query<{id:string}>(sql,params):await query<{id:string}>(sql,params);
 const id=result.rows[0]?.id;
 if(!id)throw new Error("Operator assignment changed during sign-in.");
 return {token,expiresAt};
}

export async function setOperatorSessionCookie({token,expiresAt}:Awaited<ReturnType<typeof prepareOperatorSession>>){
 const jar=await cookies();
 // Microsoft returns through a cross-site navigation; Strict omits the new
 // session on the redirect to /operator. Lax permits that top-level GET while
 // keeping cross-site mutation requests excluded.
 jar.set(env.operatorSessionCookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});

}
export async function getOperatorSession():Promise<OperatorSession|null>{
 const jar=await cookies();const token=jar.get(env.operatorSessionCookieName)?.value;if(!token)return null;
 const result=await query<OperatorSession>(`select s.id as "sessionId",u.user_id as "userId",u.email,coalesce(u.display_name,u.email) as name,u.role,u.entra_object_id as "entraObjectId",u.entra_tenant_id as "entraTenantId",u.auth_source as "authSource" from platform_auth_sessions s join platform_operator_assignments u on u.user_id=s.user_id where s.token_hash=$1 and s.expires_at>now() and u.status='active' and (s.auth_source=u.auth_source or u.auth_source='legacy' and s.auth_source='entra')`,[tokenHash(token)]);
 const session=result.rows[0]||null;
 if(session?.authSource==='email_code'){
  if(!env.operatorEmailLoginEnabled||session.role!=='platform_admin')return null;
 }else if(session&&env.appMode==='production'){
  const identity=await getEntraOperatorIdentity();
  if(!identity||session.authSource!=='entra'||identity.tenantId!==session.entraTenantId||identity.objectId!==session.entraObjectId||identity.role!==session.role)return null;
 }
 if(session)void query(`update platform_auth_sessions set last_seen_at=now() where id=$1 and last_seen_at<now()-interval '5 minutes'`,[session.sessionId]).catch(()=>{});
 return session;
}
export async function requireOperatorSession(){
 const session=await getOperatorSession();
 if(!session){const {ApiError}=await import("@/lib/server/http");throw new ApiError(401,"unauthorized","Anmeldung erforderlich.");}
 return session;
}
export async function destroyOperatorSession(){const jar=await cookies();const token=jar.get(env.operatorSessionCookieName)?.value;if(token)await query("delete from platform_auth_sessions where token_hash=$1",[tokenHash(token)]);jar.delete(env.operatorSessionCookieName)}
