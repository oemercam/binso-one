'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {AuthWorkspace} from '@/components/auth-workspace';
import {hasValidNewPassword,MAX_PASSWORD_LENGTH,MIN_PASSWORD_LENGTH,PASSWORD_REQUIREMENTS} from '@/lib/password-policy';
import {PasswordInput} from '@/components/password-input';
import {Button,ErrorState,Field,Input} from '@/components/ui';
import {authRequest} from '@/lib/client/auth-request';
import {LocalizedText} from '@/lib/client/locale';

export default function OperatorEmailLogin({setup,emailLogin}:{setup:boolean;emailLogin:boolean}){
 const token=useRef(''),pending=useRef(false);
 const [step,setStep]=useState<'password'|'code'|'setup'|'ready'>(setup?'setup':'password');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!setup)return;
  const url=new URL(window.location.href);
  if(url.hash){
   token.current=url.hash.slice(1);
   url.hash='';
   window.history.replaceState(window.history.state,'',url);
  }
 },[setup]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(pending.current)return;
  const form=event.currentTarget,fields=new FormData(form);
  const password=String(fields.get('password')??'');
  if(step==='setup'&&password!==fields.get('confirmation')){
   setError('Die Passwörter stimmen nicht überein.');return;
  }
  if(step==='setup'&&!hasValidNewPassword(password)){setError(PASSWORD_REQUIREMENTS);return;}
  const body=step==='setup'?{action:'setup',token:token.current,password}
    :step==='password'?{action:'begin',email:fields.get('username'),password}
    :{action:'verify',code:fields.get('code')};
  pending.current=true;setBusy(true);setError('');
  try{
   const response=await authRequest('/api/operator/email-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw Error(typeof result.message==='string'?result.message:'Anmeldung nicht möglich.');
   form.reset();
   if(step==='setup'){token.current='';setStep('ready');}
   else if(step==='password')setStep('code');
   else window.location.replace('/operator');
  }catch(reason){setError(reason instanceof Error?reason.message:'Anmeldung nicht möglich.');}
  finally{pending.current=false;setBusy(false);}
 }
 const buttonLabel=busy?'Wird geprüft…':step==='password'?'Code anfordern':step==='setup'?'Passwort speichern':'Anmelden';
 return <AuthWorkspace variant="login" showLocaleSwitcher={false}><section className="auth-card operator-login-card" aria-labelledby="login-heading">
  <h1 id="login-heading"><LocalizedText>Interner Binso-Admin-Zugang</LocalizedText></h1>
  {step==='ready'?<>
   <p role="status"><LocalizedText>Passwort gespeichert.</LocalizedText></p>
   {emailLogin?<Button href="/operator/login"><LocalizedText>Zur Anmeldung</LocalizedText></Button>:<p><LocalizedText>Die Anmeldung per E-Mail-Code wird separat aktiviert.</LocalizedText></p>}
  </>:<form key={step} method="post" onSubmit={submit}>
   {step==='password'&&<Field label="E-Mail"><Input name="username" type="email" required autoComplete="username" maxLength={320}/></Field>}
   {step==='password'&&<Field label="Passwort"><PasswordInput name="password" required autoComplete="current-password" maxLength={MAX_PASSWORD_LENGTH}/></Field>}
   {step==='setup'&&<>
    <Field label="Neues Passwort" hint={PASSWORD_REQUIREMENTS}><PasswordInput name="password" required autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH}/></Field>
    <Field label="Passwort bestätigen"><PasswordInput name="confirmation" required autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH}/></Field>
   </>}
   {step==='code'&&<>
    <p><LocalizedText>Gib den sechsstelligen Code aus deiner E-Mail ein.</LocalizedText></p>
    <Field label="Anmeldecode"><Input name="code" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6}/></Field>
   </>}
   {error&&<ErrorState><LocalizedText>{error}</LocalizedText></ErrorState>}
   <Button type="submit" disabled={busy}><LocalizedText>{buttonLabel}</LocalizedText></Button>
   {step==='code'&&<Button type="button" variant="secondary" disabled={busy} onClick={()=>{setError('');setStep('password');}}><LocalizedText>Zurück</LocalizedText></Button>}
  </form>}
  <p className="auth-bottom"><Link href="/login"><LocalizedText>Zur Kundenanmeldung</LocalizedText></Link></p>
 </section></AuthWorkspace>;
}
