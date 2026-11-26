import {NextRequest} from 'next/server';
import {ApiError,apiError,assertSameOrigin,json,readJson} from '@/lib/server/http';
import {enforceRateLimit} from '@/lib/server/rate-limit';
import {requireSession,sessionCompanies,switchSessionCompany} from '@/lib/server/session';

export async function GET(){
 try{
  const session=await requireSession();
  return json({currentCompanyId:session.organizationId,items:await sessionCompanies(session)});
 }catch(error){return apiError(error);}
}

export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);
  await enforceRateLimit(request,'company-switch',20,60_000);
  const session=await requireSession();
  const body=await readJson<{organizationId?:unknown}>(request,1024);
  const id=body?.organizationId;
  if(typeof id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))
   throw new ApiError(400,'company_invalid','Bitte eine gültige Firma auswählen.');
  await switchSessionCompany(session,id.toLowerCase());
  return json({ok:true});
 }catch(error){return apiError(error);}
}
