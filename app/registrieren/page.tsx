import {cookies} from 'next/headers';
import {env} from '@/lib/server/env';
import {registrationContext,registrationCookie} from '@/lib/server/registration';
import {Suspense} from "react";
import {RegistrationPage} from "@/components/registration/registration-page";
export default async function Register({searchParams}:{searchParams:Promise<{plan?:string|string[];billing?:string|string[]}>}){
 const [params,jar]=await Promise.all([searchParams,cookies()]);
 const plan=Array.isArray(params.plan)?params.plan[0]:params.plan;
 const billing=Array.isArray(params.billing)?params.billing[0]:params.billing;
 let initialContext:ReturnType<typeof registrationContext>|null=null;
 // Keep the session and pending-receipt lookup in the existing resumable flow.
 if(!jar.get(env.sessionCookieName)?.value&&!jar.get(registrationCookie)?.value){
  try{initialContext=registrationContext(plan||null,billing||null);}catch{/* The existing request presents invalid-context errors. */}
 }
 return <Suspense><RegistrationPage key={JSON.stringify([plan,billing])} initialContext={initialContext}/></Suspense>;
}
