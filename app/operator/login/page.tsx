import {operatorPasskeyLoginEnabled,operatorPasskeySetupEnabled} from '@/lib/server/operator/login-mode';
import MicrosoftLogin from './microsoft-login';
import OperatorPasskeyLogin from './passkey-login';

export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{passkey?:string}>}){
 if(operatorPasskeyLoginEnabled())return <OperatorPasskeyLogin/>;
 if(operatorPasskeySetupEnabled()&&(await searchParams).passkey==='einrichten')return <OperatorPasskeyLogin preparation/>;
 return <MicrosoftLogin/>;
}
