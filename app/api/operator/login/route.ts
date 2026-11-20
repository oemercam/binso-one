import type {NextRequest} from "next/server";
import {env} from "@/lib/server/env";
import {ApiError,apiError,assertSameOrigin,json,readJson} from "@/lib/server/http";
import {enforceRateLimit} from "@/lib/server/rate-limit";
import {asObject,emailField,stringField} from "@/lib/server/validation";
import {beginOperatorEmailLogin,finishOperatorEmailLogin} from "@/lib/server/operator/email-login";

export async function POST(request:NextRequest){
 try{
  if(!env.operatorEmailLoginEnabled)throw new ApiError(404,"not_found","Nicht gefunden.");
  assertSameOrigin(request);
  await enforceRateLimit(request,"operator-email-login",15,15*60_000);
  const body=asObject(await readJson(request,4096));
  const email=emailField(body);
  if(body.step==="password"){
   const password=body.password;
   if(typeof password!=="string"||password.length<1||password.length>256)throw new ApiError(400,"invalid_field","Eine Angabe hat eine ungültige Länge.");
   await beginOperatorEmailLogin(email,password);
   return json({requiresEmailCode:true},202);
  }
  if(body.step!=="code")throw new ApiError(400,"action_invalid","Ungültige Aktion.");
  const code=stringField(body,"code",{min:6,max:6});
  if(!await finishOperatorEmailLogin(email,code))throw new ApiError(401,"invalid_code","Der Bestätigungscode ist ungültig oder abgelaufen.");
  return json({ok:true});
 }catch(error){return apiError(error);}
}
