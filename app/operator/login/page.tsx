import {operatorEmailLoginEnabled,operatorPasskeyLoginEnabled,operatorPasskeySetupEnabled,operatorEmailSetupEnabled} from '@/lib/server/operator/login-mode';
import MicrosoftLogin from './microsoft-login';
import OperatorPasskeyLogin from './passkey-login';

import OperatorEmailLogin from './email-login';

export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{passkey?:string;einrichten?:string}>}){
 const emailLogin=operatorEmailLoginEnabled();
 if(emailLogin||operatorEmailSetupEnabled()&&(await searchParams).einrichten==='1')
  return <OperatorEmailLogin setup={(await searchParams).einrichten==='1'} emailLogin={emailLogin}/>;
 if(operatorPasskeyLoginEnabled())return <OperatorPasskeyLogin/>;
 if(operatorPasskeySetupEnabled()&&(await searchParams).passkey==='einrichten')return <OperatorPasskeyLogin preparation/>;
 return <MicrosoftLogin/>;
}
