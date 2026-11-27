import {redirect} from 'next/navigation';
import {operatorEmailLoginEnabled} from '@/lib/server/operator/login-mode';
import OperatorEmailLogin from '../operator/login/email-login';
import CustomerLogin from './customer-login';

export default async function LoginPage({searchParams}:{searchParams:Promise<{bereich?:string}>}){
 const emailLogin=operatorEmailLoginEnabled();
 if((await searchParams).bereich==='admin'){
  if(!emailLogin)redirect('/operator/login');
  return <OperatorEmailLogin setup={false} emailLogin/>;
 }
 return <CustomerLogin showOperatorEntry={emailLogin}/>;
}
