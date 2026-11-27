"use client";

import {AuthWorkspace} from "@/components/auth-workspace";

import {LocalizedText,useLocale} from "@/lib/client/locale";
import Link from "next/link";
import {FormEvent,useEffect,useRef,useState} from "react";
import {Button, Input, Field, ErrorState, Toast} from "@/components/ui";
import {PasswordInput} from '@/components/password-input';
import {authRequest} from '@/lib/client/auth-request';
import {clearClientSession} from "@/lib/client/backend";
import {safeAppPath} from "@/lib/navigation";

import {registrationText} from '@/lib/i18n';

type Stage="credentials"|"verify";

export default function Login(){
  const {locale}=useLocale();
  const pending=useRef(false);
  const lastAutoSubmittedCode=useRef("");
  const [rememberMe,setRememberMe]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [code,setCode]=useState("");
  const [stage,setStage]=useState<Stage>("credentials");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [resendRequested,setResendRequested]=useState(false);
  const [signedOut,setSignedOut]=useState(false);
  useEffect(()=>{
    let active=true;
    queueMicrotask(()=>{
      if(!active)return;
      try{
        if(new URLSearchParams(window.location.search).get("signedOut")==="1"&&window.sessionStorage.getItem("binso.logout-confirmed")==="1"){
          setSignedOut(true);
        }
      }catch{}
    });
    return()=>{active=false};
  },[]);
  const nextPath=()=>safeAppPath(new URLSearchParams(window.location.search).get("next"));

  const finish=(payload:Record<string,unknown>)=>{
    clearClientSession();
    const explicitNext=new URLSearchParams(window.location.search).get("next");
    const next=explicitNext?nextPath():safeAppPath(payload.next,nextPath());
    window.location.replace(next);
  };

  const loginRequest=async(email:string,password:string)=>{
    const response=await authRequest("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,rememberMe})});
    const payload=await response.json().catch(()=>({}));
    if(response.status===202){
      lastAutoSubmittedCode.current="";
      setCode("");
      setResendRequested(false);
      if(payload.requiresEmailVerification)setStage("verify");
      else throw new Error("Die Anmeldung konnte nicht eindeutig bestätigt werden.");
      return;
    }
    if(!response.ok){
      throw new Error(typeof payload?.message==="string"?payload.message:"Anmeldung nicht möglich.");
    }
    finish(payload);
  };

  const submitCredentials=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(pending.current)return;pending.current=true;setLoading(true);setError("");
    if(signedOut){setSignedOut(false);try{window.sessionStorage.removeItem("binso.logout-confirmed");}catch{}}
    const fields=new FormData(event.currentTarget);
    const submittedEmail=String(fields.get("username")??"");
    const submittedPassword=String(fields.get("password")??"");
    setEmail(submittedEmail);
    try{await loginRequest(submittedEmail,submittedPassword);setPassword("");}catch(error){setError(error instanceof Error?error.message:"Anmeldung nicht möglich.");}
    finally{pending.current=false;setLoading(false);}
  };

  const submitCode=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const submittedCode=String(new FormData(event.currentTarget).get("code")??"");
    if(pending.current||!/^\d{6}$/.test(submittedCode))return;
    lastAutoSubmittedCode.current=submittedCode;
    pending.current=true;setLoading(true);setError("");
    try{
      if(stage==="verify"){
        const response=await fetch("/api/auth/verify-email",{method:"POST",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json"},body:JSON.stringify({email,code:submittedCode,rememberMe})});
        const payload=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(typeof payload?.message==="string"?payload.message:"Code konnte nicht bestätigt werden.");
        finish(payload);return;
      }
      throw new Error("Anmeldung nicht möglich.");
    }catch(error){setError(error instanceof Error?error.message:"Code konnte nicht bestätigt werden.");}
    finally{pending.current=false;setLoading(false);}
  };

  const resend=async()=>{
    if(pending.current)return;pending.current=true;setLoading(true);setError("");setResendRequested(false);
    try{
      if(stage==="verify"){const response=await fetch("/api/auth/resend-verification",{method:"POST",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});if(!response.ok)throw new Error("Code konnte nicht erneut gesendet werden.");lastAutoSubmittedCode.current="";setCode("");setResendRequested(true);}

    }catch(error){setError(error instanceof Error?error.message:"Code konnte nicht erneut gesendet werden.");}
    finally{pending.current=false;setLoading(false);}
  };

  if(stage!=="credentials")return <AuthWorkspace variant="login"><section className="auth-card" aria-labelledby="login-heading">
    <h1 id="login-heading"><LocalizedText>{"E-Mail bestätigen"}</LocalizedText></h1>
    <p>{registrationText('loginCodeSent',locale,{email})}</p>
    {resendRequested&&<p className="auth-feedback" data-tone="info" role="status">{registrationText('deliveryUnconfirmed',locale)}</p>}
    <form method="post" onSubmit={submitCode}>
      <Field label={"6-stelliger Code"}><Input id="login-verification-code" name="code" type="text" required autoFocus maxLength={6} pattern="[0-9]{6}" enterKeyHint="done" value={code} onChange={event=>{
        const field=event.currentTarget;
        const nextCode=field.value.replace(/\D/g,"").slice(0,6);
        field.value=nextCode;
        setCode(nextCode);
        if(nextCode.length===6&&!pending.current&&nextCode!==lastAutoSubmittedCode.current)field.form?.requestSubmit();
      }} inputMode={"numeric"} autoComplete="one-time-code" placeholder={"000000"}/></Field>
      {error&&<ErrorState className="auth-error"><LocalizedText>{error}</LocalizedText></ErrorState>}
      <Button type="submit" disabled={loading||code.length!==6}><LocalizedText>{loading?"Wird geprüft…":"Anmeldung abschliessen"}</LocalizedText></Button>
    </form>
    <div className="auth-login-links">
      <button type="button" className="auth-inline-action" disabled={loading} onClick={()=>void resend()}><LocalizedText>{"Code erneut senden"}</LocalizedText></button>
      <button type="button" className="auth-inline-action" disabled={loading} onClick={()=>{setStage("credentials");setCode("");setError("");}}><LocalizedText>{"Zurück"}</LocalizedText></button>
    </div>
  </section></AuthWorkspace>;

  return <AuthWorkspace variant="login"><section className="auth-card" aria-labelledby="login-heading">
    <h1 id="login-heading"><LocalizedText>Anmelden</LocalizedText></h1>
    {signedOut&&<Toast title="Sitzung abgemeldet." inline/>}
    <form method="post" onSubmit={submitCredentials}>
      <Field label="E-Mail"><Input id="login-username" name="username" enterKeyHint="next" onKeyDown={event=>{if(event.key==="Enter"&&!event.nativeEvent.isComposing&&event.currentTarget.reportValidity()){event.preventDefault();event.currentTarget.form?.querySelector<HTMLInputElement>('#login-password')?.focus();}}} autoCapitalize="none" spellCheck={false} required value={email} onChange={e=>setEmail(e.target.value)} type="email" inputMode="email" autoComplete="username" placeholder="name@firma.ch"/></Field>
      <Field label="Passwort"><PasswordInput id="login-password" name="password" enterKeyHint="go" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></Field>
      <div className="auth-options"><label><Input type="checkbox" checked={rememberMe} onChange={event=>setRememberMe(event.target.checked)}/><LocalizedText>{"Angemeldet bleiben"}</LocalizedText></label></div>
      {error&&<ErrorState className="auth-error"><LocalizedText>{error}</LocalizedText></ErrorState>}
      <Button type="submit" disabled={loading}><LocalizedText>{loading?"Anmeldung läuft…":"Anmelden"}</LocalizedText></Button>
    </form>
    <div className="auth-login-links"><Link href="/passwort-vergessen"><LocalizedText>{"Passwort vergessen?"}</LocalizedText></Link></div>
    <p className="auth-bottom"><LocalizedText>{"Noch kein Konto? "}</LocalizedText><Link href="/registrieren"><LocalizedText>{"Konto erstellen"}</LocalizedText></Link></p>
  </section></AuthWorkspace>;
}
