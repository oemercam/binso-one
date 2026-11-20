"use client";

import {useState,type FormEvent} from "react";
import {Button,ErrorState,Field,Input} from "@/components/ui";
import {authRequest} from "@/lib/client/auth-request";
import {LocalizedText} from "@/lib/client/locale";

export function OperatorEmailForm({target}:{target:string}){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [code,setCode]=useState("");
 const [codeRequested,setCodeRequested]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setBusy(true);
  setError("");
  try{
   const body=codeRequested?{step:"code",email,code}:{step:"password",email,password};
   const response=await authRequest("/api/operator/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const result=await response.json().catch(()=>null);
   if(!response.ok||!(codeRequested?result?.ok===true:result?.requiresEmailCode===true)){
    throw new Error(result?.message??"Anmeldung fehlgeschlagen.");
   }
   if(codeRequested){
    window.location.replace(target);
   }else{
    setPassword("");
    setCodeRequested(true);
   }
  }catch(error){
   setError(error instanceof Error?error.message:"Anmeldung fehlgeschlagen.");
  }finally{setBusy(false);}
 }

 return <form onSubmit={submit}>
  <Field label="E-Mail"><Input type="email" autoComplete="username" required value={email} readOnly={codeRequested} onChange={event=>setEmail(event.target.value)}/></Field>
  {codeRequested?
   <Field label="E-Mail-Code"><Input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value)}/></Field>:
   <Field label="Passwort"><Input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></Field>}
  {error&&<ErrorState>{error}</ErrorState>}
  <Button type="submit" disabled={busy}><LocalizedText>{codeRequested?"Anmelden":"Code anfordern"}</LocalizedText></Button>
  {codeRequested&&<Button type="button" variant="secondary" disabled={busy} onClick={()=>{setCodeRequested(false);setCode("");setError("");}}><LocalizedText>{"Neuen Code anfordern"}</LocalizedText></Button>}
 </form>;
}
