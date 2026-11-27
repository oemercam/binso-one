import {NextRequest} from 'next/server';
import type {AuthenticationResponseJSON,RegistrationResponseJSON} from '@simplewebauthn/server';
import {ApiError,apiError,assertSameOrigin,json,readJson} from '@/lib/server/http';
import {enforceRateLimit} from '@/lib/server/rate-limit';
import {asObject,emailField} from '@/lib/server/validation';
import {operatorEmailLoginEnabled,operatorPasskeyLoginEnabled,operatorPasskeySetupEnabled} from '@/lib/server/operator/login-mode';
import {beginOperatorPasskeyLogin,finishOperatorPasskeyLogin} from '@/lib/server/operator/passkey-login';

export const runtime='nodejs';

export async function POST(request:NextRequest){
 try{
  if(operatorEmailLoginEnabled())throw new ApiError(404,'not_found','Nicht verfügbar.');
  const signIn=operatorPasskeyLoginEnabled();
  if(!signIn&&!operatorPasskeySetupEnabled())throw new ApiError(404,'not_found','Nicht verfügbar.');
  assertSameOrigin(request);
  await enforceRateLimit(request,'operator-passkey-login',12,15*60_000);
  const body=asObject(await readJson(request,65536));
  if(body.action==='verify'){
   const response=asObject(body.response);
   if(typeof response.id!=='string'||response.id.length<1||response.id.length>2048)throw new ApiError(400,'passkey_invalid','Der Passkey konnte nicht bestätigt werden.');
   await finishOperatorPasskeyLogin(response as unknown as AuthenticationResponseJSON|RegistrationResponseJSON,signIn);
   return json({ok:true,signedIn:signIn});
  }
  if(body.action!=='begin'||typeof body.password!=='string'||body.password.length>256||!body.password)throw new ApiError(400,'invalid_credentials','E-Mail oder Passwort ist falsch.');
  const email=emailField(body);
  const setupCode=typeof body.setupCode==='string'?body.setupCode:null;
  return json(await beginOperatorPasskeyLogin(email,body.password,setupCode));
 }catch(error){return apiError(error);}
}
