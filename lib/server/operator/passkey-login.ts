import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {generateAuthenticationOptions,generateRegistrationOptions,verifyAuthenticationResponse,verifyRegistrationResponse,type AuthenticationResponseJSON,type RegistrationResponseJSON} from '@simplewebauthn/server';
import {withTransaction,query} from '@/lib/server/db';
import {ApiError} from '@/lib/server/http';
import {passkeyRelyingParty} from '@/lib/server/passkeys';
import {verifyPassword} from '@/lib/server/password';
import {platformAudit} from './audit';
import {prepareOperatorSession,setOperatorSessionCookie} from './session';

const cookieName='binso_operator_passkey';
const cookieOptions={path:'/api/operator/login',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const};
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const fakeHash='scrypt$'+'0'.repeat(32)+'$'+'0'.repeat(128);
const invalid=()=>new ApiError(401,'invalid_credentials','E-Mail oder Passwort ist falsch.');
const invalidPasskey=()=>new ApiError(400,'passkey_invalid','Der Passkey konnte nicht bestätigt werden.');
type Account={user_id:string;email:string;passkey_password_hash:string|null;version:string};
type Challenge={user_id:string;challenge:string;purpose:'authenticate'|'register';assignment_version:string};
type Credential={credential_id:string;public_key:Buffer;counter:string};

export async function beginOperatorPasskeyLogin(email:string,password:string,setupCode:string|null){
 const account=(await query<Account>(`select user_id,email,passkey_password_hash,updated_at::text as version
  from platform_operator_assignments where lower(email)=$1 and status='active' and auth_source='entra' and passkey_password_hash is not null`,[email])).rows[0];
 const valid=await verifyPassword(password,account?.passkey_password_hash??fakeHash);
 if(!account?.passkey_password_hash||!valid)throw invalid();
 const {rpID}=passkeyRelyingParty();
 const prepared=await withTransaction(async c=>{
  const locked=await c.query(`select 1 from platform_operator_assignments where user_id=$1 and status='active'
   and auth_source='entra' and passkey_password_hash is not null and updated_at::text=$2 for update`,[account.user_id,account.version]);
  if(!locked.rowCount)throw invalid();
  const keys=(await c.query<{credential_id:string}>('select credential_id from platform_operator_passkeys where user_id=$1',[account.user_id])).rows;
  const mode=keys.length?'authenticate':'register';
  if(mode==='register'){
   const safeCode=setupCode&&/^[A-Za-z0-9_-]{43}$/.test(setupCode)?setupCode:null;
   const ready=await c.query(`select 1 from platform_operator_assignments where user_id=$1
    and passkey_setup_hash=$2 and passkey_setup_expires_at>now()`,[account.user_id,safeCode?hash(safeCode):null]);
   if(!ready.rowCount)throw new ApiError(403,'operator_setup_required','Für den ersten Passkey benötigst du einen gültigen Einrichtungscode.');
  }
  const options=mode==='authenticate'
   ? await generateAuthenticationOptions({rpID,userVerification:'required',allowCredentials:keys.map(key=>({id:key.credential_id}))})
   : await generateRegistrationOptions({rpID,rpName:'Binso One Admin',userName:account.email,userID:Buffer.from(hash('operator:'+account.user_id),'hex'),attestationType:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'},supportedAlgorithmIDs:[-7,-257]});
  const token=randomBytes(32).toString('base64url');
  await c.query('delete from platform_operator_passkey_challenges where user_id=$1 or expires_at<=now()',[account.user_id]);
  await c.query(`insert into platform_operator_passkey_challenges(token_hash,user_id,challenge,purpose,assignment_version,expires_at)
   values($1,$2,$3,$4,$5,now()+interval '5 minutes')`,[hash(token),account.user_id,options.challenge,mode,account.version]);
  return {token,mode,options};
 });
 (await cookies()).set(cookieName,prepared.token,{...cookieOptions,maxAge:300});
 return {mode:prepared.mode,options:prepared.options};
}

export async function finishOperatorPasskeyLogin(response:AuthenticationResponseJSON|RegistrationResponseJSON,signIn:boolean){
 const jar=await cookies(),token=jar.get(cookieName)?.value;
 if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))throw invalidPasskey();
 jar.set(cookieName,'',{...cookieOptions,maxAge:0});
 // Consume the challenge independently so failed proofs cannot be retried.
 const challenge=(await query<Challenge>(`delete from platform_operator_passkey_challenges where token_hash=$1
  and expires_at>now() returning user_id,challenge,purpose,assignment_version`,[hash(token)])).rows[0];
 if(!challenge)throw invalidPasskey();
 const {rpID,origin}=passkeyRelyingParty();
 const session=await withTransaction(async c=>{
  const account=(await c.query<Account>(`select user_id,email,passkey_password_hash,updated_at::text as version
   from platform_operator_assignments where user_id=$1 and status='active' and auth_source='entra' and passkey_password_hash is not null for update`,[challenge.user_id])).rows[0];
  if(!account||account.version!==challenge.assignment_version)throw invalidPasskey();
  const expected={expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true};
  if(challenge.purpose==='register'){
   const ready=await c.query(`select 1 from platform_operator_assignments where user_id=$1
     and passkey_setup_hash is not null and passkey_setup_expires_at>now()
     and not exists(select 1 from platform_operator_passkeys where user_id=$1)`,[account.user_id]);
   if(!ready.rowCount)throw invalidPasskey();
   const result=await verifyRegistrationResponse({response:response as RegistrationResponseJSON,...expected,supportedAlgorithmIDs:[-7,-257]}).catch(()=>{throw invalidPasskey()});
   if(!result.verified)throw invalidPasskey();
   const {credential}=result.registrationInfo;
   await c.query('insert into platform_operator_passkeys(credential_id,user_id,public_key,counter) values($1,$2,$3,$4)',[credential.id,account.user_id,Buffer.from(credential.publicKey),credential.counter]);
   await c.query('update platform_operator_assignments set passkey_setup_hash=null,passkey_setup_expires_at=null,updated_at=now() where user_id=$1',[account.user_id]);
   await platformAudit({userId:account.user_id,userEmail:account.email,action:'operator.passkey_registered',entityType:'platform_operator',entityId:account.user_id},c);
  }else{
   const key=(await c.query<Credential>('select credential_id,public_key,counter from platform_operator_passkeys where credential_id=$1 and user_id=$2 for update',[response.id,account.user_id])).rows[0];
   if(!key)throw invalidPasskey();
   const result=await verifyAuthenticationResponse({response:response as AuthenticationResponseJSON,...expected,credential:{id:key.credential_id,publicKey:new Uint8Array(key.public_key),counter:Number(key.counter)}}).catch(()=>{throw invalidPasskey()});
   if(!result.verified)throw invalidPasskey();
   await c.query('update platform_operator_passkeys set counter=$2,last_used_at=now() where credential_id=$1',[key.credential_id,result.authenticationInfo.newCounter]);
  }
  if(!signIn)return null;
  await c.query('update platform_operator_assignments set last_login_at=now() where user_id=$1',[account.user_id]);
  await platformAudit({userId:account.user_id,userEmail:account.email,action:'operator.password_passkey_login',entityType:'platform_operator',entityId:account.user_id},c);
  return prepareOperatorSession(account.user_id,'password_passkey',c);
 });
 if(session)await setOperatorSessionCookie(session);
}
