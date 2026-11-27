import {MAX_PASSWORD_LENGTH,PASSWORD_REQUIREMENTS} from '@/lib/password-policy';
import type {NextRequest} from 'next/server';
import {ApiError,apiError,assertSameOrigin,json,readJson} from '@/lib/server/http';
import {enforceRateLimit} from '@/lib/server/rate-limit';
import {asObject,emailField} from '@/lib/server/validation';
import {operatorEmailLoginEnabled,operatorEmailSetupEnabled} from '@/lib/server/operator/login-mode';
import {beginOperatorEmailLogin,finishOperatorEmailLogin,setInitialOperatorPassword} from '@/lib/server/operator/email-login';

export const runtime='nodejs';

export async function POST(request:NextRequest){
 try{
  const enabled=operatorEmailLoginEnabled();
  if(!enabled&&!operatorEmailSetupEnabled())throw new ApiError(404,'not_found','Nicht verfügbar.');
  assertSameOrigin(request);
  await enforceRateLimit(request,'operator-email-login',15,15*60_000);
  const body=asObject(await readJson(request,4096));
  if(body.action==='setup'&&(enabled||operatorEmailSetupEnabled())){
   if(typeof body.password!=='string')throw new ApiError(400,'invalid_password',PASSWORD_REQUIREMENTS);
   if(typeof body.token!=='string'||!await setInitialOperatorPassword(body.token,body.password))throw new ApiError(400,'setup_invalid','Der Einrichtungslink ist ungültig oder abgelaufen.');
   return json({ok:true});
  }
  if(!enabled)throw new ApiError(404,'not_found','Nicht verfügbar.');
  if(body.action==='begin'&&typeof body.password==='string'&&body.password.length>0&&body.password.length<=MAX_PASSWORD_LENGTH){
   await beginOperatorEmailLogin(emailField(body),body.password);
   return json({requiresEmailCode:true},202);
  }
  if(body.action==='verify'&&typeof body.code==='string'){
   if(!await finishOperatorEmailLogin(body.code))throw new ApiError(401,'invalid_code','Der Anmeldecode ist ungültig oder abgelaufen.');
   return json({ok:true});
  }
  throw new ApiError(400,'action_invalid','Anmeldung nicht möglich.');
 }catch(error){return apiError(error);}
}
