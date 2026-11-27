import 'server-only';
import {createHash,createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {query,withTransaction} from '@/lib/server/db';
import {sendMail} from '@/lib/server/email';
import {env} from '@/lib/server/env';
import {ApiError} from '@/lib/server/http';
import {hashPassword,verifyPassword} from '@/lib/server/password';
import {platformAudit} from './audit';
import {prepareOperatorSession,setOperatorSessionCookie} from './session';

const cookieName='binso_operator_email_challenge';
const cookieOptions={path:'/api/operator/email-login',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const};
const opaque=/^[A-Za-z0-9_-]{43}$/;
const dummyHash='scrypt$'+'0'.repeat(32)+'$'+'0'.repeat(128);
const denied=()=>new ApiError(401,'invalid_credentials','E-Mail oder Passwort ist falsch.');
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
function digest(userId:string,challenge:string,code:string){
 if(!env.appEncryptionKey)throw Error('APP_ENCRYPTION_KEY is required for operator email login.');
 return createHmac('sha256',env.appEncryptionKey).update(JSON.stringify(['operator-email-login',userId,challenge,code])).digest('hex');
}

export async function setInitialOperatorPassword(token:string,password:string){
 if(!opaque.test(token))return false;
 const setupHash=sha(token);
 if(!(await query("select 1 from platform_operator_assignments where email_setup_hash=$1 and email_setup_expires_at>now() and status='active' and auth_source='entra'",[setupHash])).rowCount)return false;
 const passwordHash=await hashPassword(password);
 return withTransaction(async c=>{
  const account=(await c.query<{user_id:string;email:string}>(`
   update platform_operator_assignments set email_password_hash=$2,
    email_setup_hash=null,email_setup_expires_at=null,email_code_hash=null,email_challenge_hash=null,email_code_expires_at=null,email_code_attempts=0,updated_at=now()
   where email_setup_hash=$1 and email_setup_expires_at>now() and status='active' and auth_source='entra'
   returning user_id,email
  `,[setupHash,passwordHash])).rows[0];
  if(!account)return false;
  await c.query("delete from platform_auth_sessions where user_id=$1 and auth_source='password_email_code'",[account.user_id]);
  await platformAudit({userId:account.user_id,userEmail:account.email,action:'operator.email_password_set',entityType:'platform_operator',entityId:account.user_id},c);
  return true;
 });
}

export async function beginOperatorEmailLogin(email:string,password:string){
 const account=(await query<{user_id:string;email:string;email_password_hash:string}>(`
  select user_id,email,email_password_hash from platform_operator_assignments
   where lower(email)=$1 and status='active' and auth_source='entra' and email_password_hash is not null
 `,[email])).rows[0];
 const valid=await verifyPassword(password,account?.email_password_hash??dummyHash);
 if(!account||!valid)throw denied();
 const challenge=randomBytes(32).toString('base64url');
 const code=randomInt(0,1_000_000).toString().padStart(6,'0');
 const challengeHash=sha(challenge);
 const issued=await query(`
  update platform_operator_assignments set email_code_hash=$2,email_challenge_hash=$3,email_code_expires_at=now()+interval '10 minutes',email_code_attempts=0
   where user_id=$1 and email_password_hash=$4 and status='active' and auth_source='entra'
   and (email_code_expires_at is null or email_code_expires_at<=now()+interval '9 minutes')
 `,[account.user_id,digest(account.user_id,challenge,code),challengeHash,account.email_password_hash]);
 if(!issued.rowCount)throw new ApiError(429,'operator_code_wait','Bitte warte eine Minute, bevor du einen neuen Code anforderst.');
 let delivered=false;
 try{
  const text=`Dein Binso-One-Admin-Anmeldecode lautet ${code}. Er ist zehn Minuten gültig.`;
  delivered=(await sendMail({to:account.email,subject:'Binso One – Admin-Anmeldecode',text,html:`<p>${text}</p>`})).delivered;
 }catch{/* The challenge is invalidated below. */}
 if(!delivered){
  await query('update platform_operator_assignments set email_code_hash=null,email_challenge_hash=null,email_code_expires_at=null where user_id=$1 and email_challenge_hash=$2',[account.user_id,challengeHash]);
  throw new ApiError(503,'mail_unavailable','Der Anmeldecode konnte nicht gesendet werden. Bitte versuche es später erneut.');
 }
 (await cookies()).set(cookieName,challenge,{...cookieOptions,maxAge:600});
}

export async function finishOperatorEmailLogin(code:string){
 const jar=await cookies(),challenge=jar.get(cookieName)?.value;
 if(!challenge||!opaque.test(challenge)||!/^\d{6}$/.test(code))return false;
 const session=await withTransaction(async c=>{
  const account=(await c.query<{user_id:string;email:string;email_code_hash:string;email_code_attempts:number}>(`
   select user_id,email,email_code_hash,email_code_attempts from platform_operator_assignments
    where email_challenge_hash=$1 and email_code_hash is not null and email_code_expires_at>now()
    and status='active' and auth_source='entra' and email_password_hash is not null for update
  `,[sha(challenge)])).rows[0];
  if(!account)return null;
  const expected=Buffer.from(account.email_code_hash,'hex'),actual=Buffer.from(digest(account.user_id,challenge,code),'hex');
  const valid=expected.length===actual.length&&timingSafeEqual(expected,actual),attempts=account.email_code_attempts+1;
  await c.query('update platform_operator_assignments set email_code_attempts=$2,email_code_hash=case when $3 then null else email_code_hash end where user_id=$1',[account.user_id,attempts,valid||attempts>=5]);
  if(!valid)return null;
  await c.query('update platform_operator_assignments set last_login_at=now() where user_id=$1',[account.user_id]);
  await platformAudit({userId:account.user_id,userEmail:account.email,action:'operator.email_code_login',entityType:'platform_operator',entityId:account.user_id},c);
  return prepareOperatorSession(account.user_id,'password_email_code',c);
 });
 if(!session)return false;
 jar.set(cookieName,'',{...cookieOptions,maxAge:0});
 await setOperatorSessionCookie(session);
 return true;
}
