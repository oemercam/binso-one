import {operatorPasskeyLoginEnabled} from '@/lib/server/operator/login-mode';
import MicrosoftLogin from './microsoft-login';
import OperatorPasskeyLogin from './passkey-login';

export const dynamic='force-dynamic';

export default function Page(){
 return operatorPasskeyLoginEnabled()?<OperatorPasskeyLogin/>:<MicrosoftLogin/>;
}
