import "server-only";
import {createHash,createHmac,randomBytes,randomInt,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {query,withTransaction} from "@/lib/server/db";
import {sendMail} from "@/lib/server/email";
import {env} from "@/lib/server/env";
import {ApiError} from "@/lib/server/http";
import {verifyPassword} from "@/lib/server/password";
import {platformAudit} from "./audit";
import {prepareOperatorSession,setOperatorSessionCookie} from "./session";

const challengeCookie="binso_operator_email_challenge";
const challengePath="/api/operator/login";
const cookieOptions={path:challengePath,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const};
const durationMinutes=10;
const dummyHash="scrypt$"+ "0".repeat(32)+"$"+"0".repeat(128);
type Operator={user_id:string;email:string;password_hash:string|null};

const challengeHash=(value:string)=>createHash("sha256").update(value).digest("hex");

function codeHash(userId:string,challenge:string,code:string){
 if(!env.appEncryptionKey)throw new Error("APP_ENCRYPTION_KEY is required for operator email login.");
 return createHmac("sha256",env.appEncryptionKey).update(JSON.stringify(["operator-email-login",userId,challenge,code])).digest("hex");
}

export async function beginOperatorEmailLogin(email:string,password:string){
 const operator=(await query<Operator>("select user_id,email,password_hash from platform_operator_assignments where lower(email)=$1 and auth_source='email_code' and role='platform_admin' and status='active'",[email])).rows[0];
 const passwordValid=await verifyPassword(password,operator?.password_hash??dummyHash);
 if(!operator?.password_hash||!passwordValid)throw new ApiError(401,"invalid_credentials","E-Mail oder Passwort ist falsch.");

 const challenge=randomBytes(32).toString("base64url");
 const code=randomInt(0,1_000_000).toString().padStart(6,"0");
 const hash=codeHash(operator.user_id,challenge,code);
 const issued=await query(`update platform_operator_assignments
   set email_login_hash=$2,email_login_challenge_hash=$5,email_login_expires_at=now()+($4::int*interval '1 minute'),email_login_attempts=0
   where user_id=$1 and password_hash=$3 and auth_source='email_code' and role='platform_admin' and status='active'
     and (email_login_expires_at is null or email_login_expires_at <= now()+($4::int*interval '1 minute')-interval '60 seconds') returning user_id`,
   [operator.user_id,hash,operator.password_hash,durationMinutes,challengeHash(challenge)]);
 if(!issued.rows[0])throw new ApiError(429,"operator_code_wait","Bitte warte eine Minute, bevor du einen neuen Code anforderst.");

 let delivered=false;
 try{
  const text=`Dein Admin-Anmeldecode lautet ${code}. Er ist zehn Minuten gültig.`;
  delivered=(await sendMail({to:operator.email,subject:"Binso One – Admin-Anmeldecode",text,html:`<p>${text}</p>`})).delivered;
 }catch{
  delivered=false;
 }
 if(!delivered){
  await query("update platform_operator_assignments set email_login_hash=null,email_login_challenge_hash=null,email_login_expires_at=null where user_id=$1 and email_login_hash=$2",[operator.user_id,hash]);
  throw new ApiError(503,"mail_unavailable","Die Bestätigungs-E-Mail konnte nicht versendet werden. Bitte später erneut versuchen.");
 }
 const jar=await cookies();
 jar.set(challengeCookie,challenge,{...cookieOptions,maxAge:durationMinutes*60});
}

export async function finishOperatorEmailLogin(email:string,code:string){
 const jar=await cookies();
 const challenge=jar.get(challengeCookie)?.value;
 if(!challenge||!/^[A-Za-z0-9_-]{43}$/.test(challenge)||!/^\d{6}$/.test(code))return false;
 const session=await withTransaction(async client=>{
  const operator=(await client.query<{user_id:string;email:string;email_login_hash:string;email_login_attempts:number}>(`select user_id,email,email_login_hash,email_login_attempts
    from platform_operator_assignments
   where lower(email)=$1 and auth_source='email_code' and role='platform_admin' and status='active'
     and email_login_hash is not null and email_login_challenge_hash=$2 and email_login_expires_at>now()
   for update`,[email,challengeHash(challenge)])).rows[0];
  if(!operator)return null;

  const expected=Buffer.from(operator.email_login_hash,"hex");
  const actual=Buffer.from(codeHash(operator.user_id,challenge,code),"hex");
  const valid=expected.length===actual.length&&timingSafeEqual(expected,actual);
  const attempts=operator.email_login_attempts+1;
  await client.query("update platform_operator_assignments set email_login_attempts=$2,email_login_hash=case when $3 then null else email_login_hash end where user_id=$1",[operator.user_id,attempts,valid||attempts>=5]);
  if(!valid)return null;

  await client.query("update platform_operator_assignments set last_login_at=now() where user_id=$1",[operator.user_id]);
  await platformAudit({userId:operator.user_id,userEmail:operator.email,action:"operator.email_code_login",entityType:"platform_operator",entityId:operator.user_id},client);
  return prepareOperatorSession(operator.user_id,"email_code",client);
 });
 if(!session)return false;

 jar.set(challengeCookie,"",{...cookieOptions,maxAge:0});
 await setOperatorSessionCookie(session);
 return true;
}
