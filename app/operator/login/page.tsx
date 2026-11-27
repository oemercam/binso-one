import {redirect} from 'next/navigation';
import {operatorEmailLoginEnabled,operatorPasskeyLoginEnabled,operatorPasskeySetupEnabled,operatorEmailSetupEnabled} from '@/lib/server/operator/login-mode';
import MicrosoftLogin from './microsoft-login';
import OperatorPasskeyLogin from './passkey-login';

import OperatorEmailLogin from './email-login';

export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{passkey?:string;einrichten?:string;next?:string;lang?:string}>}){
 const params=await searchParams,emailLogin=operatorEmailLoginEnabled();
 if(params.einrichten==='1'&&(emailLogin||operatorEmailSetupEnabled()))return <OperatorEmailLogin setup emailLogin={emailLogin}/>;
 if(emailLogin){
  const target=new URLSearchParams({bereich:'admin'});
  if(typeof params.next==='string')target.set('next',params.next);
  if(typeof params.lang==='string')target.set('lang',params.lang);
  redirect('/login?'+target);
 }
 if(operatorPasskeyLoginEnabled())return <OperatorPasskeyLogin/>;
 if(operatorPasskeySetupEnabled()&&params.passkey==='einrichten')return <OperatorPasskeyLogin preparation/>;
 return <MicrosoftLogin/>;
}
