"use client";

import {useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {startAuthentication,startRegistration,type PublicKeyCredentialCreationOptionsJSON,type PublicKeyCredentialRequestOptionsJSON} from '@simplewebauthn/browser';
import {LocalizedText} from '@/lib/client/locale';
import {AuthWorkspace} from '@/components/auth-workspace';
import {Button,ErrorState,Field,Input} from '@/components/ui';
import {PasswordInput} from '@/components/password-input';
import {authRequest} from '@/lib/client/auth-request';
import {clearClientSession} from '@/lib/client/backend';
import {safeAppPath} from '@/lib/navigation';

type Options=
 | {mode:'authenticate';options:PublicKeyCredentialRequestOptionsJSON}
 | {mode:'register';options:PublicKeyCredentialCreationOptionsJSON};
const errorFallback='Anmeldung nicht möglich.';

async function login(body:Record<string,unknown>){
 const response=await authRequest('/api/operator/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof result.message==='string'?result.message:errorFallback);
 return result;
}

export default function OperatorPasskeyLogin(){
 const pending=useRef(false);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [setup,setSetup]=useState(false);
 const [code,setCode]=useState('');
 const [options,setOptions]=useState<Options|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);

 const begin=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(pending.current)return;
  pending.current=true;
  setBusy(true);
  setError('');
  try{
   const prepared=await login({action:'begin',email,password,setupCode:setup?code:null});
   if(prepared.mode!=='register'&&prepared.mode!=='authenticate')throw new Error(errorFallback);
   setOptions(prepared);
   setPassword('');
   setCode('');
  }catch(cause){setError(cause instanceof Error?cause.message:errorFallback);}
  finally{pending.current=false;setBusy(false);}
 };

 const confirm=async()=>{
  if(!options||pending.current)return;
  pending.current=true;
  setBusy(true);
  setError('');
  try{
   const response=options.mode==='register'
    ?await startRegistration({optionsJSON:options.options})
    :await startAuthentication({optionsJSON:options.options});
   const result=await login({action:'verify',response});
   if(result.ok!==true)throw new Error(errorFallback);
   clearClientSession();
   const next=safeAppPath(new URLSearchParams(window.location.search).get('next'),'/operator');
   window.location.replace(next==='/operator'||next.startsWith('/operator/')?next:'/operator');
  }catch{
   setOptions(null);
   setError('Der Passkey konnte nicht bestätigt werden.');
  }finally{pending.current=false;setBusy(false);}
 };

 const passkeyAction=options?.mode==="register"?"Passkey einrichten":"Mit Passkey bestätigen";

 return <AuthWorkspace variant="login"><section className="auth-card operator-login-card" aria-labelledby="login-heading">
  <h1 id="login-heading"><LocalizedText>{options?'Passkey bestätigen':'Admin Portal'}</LocalizedText></h1>
  {options?<div className="auth-passkey">
   <Button onClick={()=>void confirm()} disabled={busy}><LocalizedText>{passkeyAction}</LocalizedText></Button>
   <button type="button" className="auth-inline-action" disabled={busy} onClick={()=>{setOptions(null);setError('')}}><LocalizedText>Zurück</LocalizedText></button>
  </div>:<form onSubmit={begin}>
   <Field label="E-Mail"><Input name="username" autoComplete="username" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></Field>
   <Field label="Passwort"><PasswordInput name="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></Field>
   {setup&&<Field label="Einrichtungscode"><Input name="setup-code" required autoComplete="off" spellCheck={false} value={code} onChange={event=>setCode(event.target.value)}/></Field>}
   {error&&<ErrorState className="auth-error"><LocalizedText>{error}</LocalizedText></ErrorState>}
   <Button type="submit" disabled={busy}><LocalizedText>{busy?'Wird geprüft…':'Weiter'}</LocalizedText></Button>
  </form>}
  {!options&&<button type="button" className="auth-inline-action" disabled={busy} onClick={()=>{setSetup(!setup);setError('');setCode('')}}><LocalizedText>{setup?'Zurück':'Passkey einrichten'}</LocalizedText></button>}
  <p className="auth-bottom"><Link href="/"><LocalizedText>Zurück zu Binso One</LocalizedText></Link></p>
 </section></AuthWorkspace>;
}
