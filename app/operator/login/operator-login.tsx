"use client";

import {LocalizedText} from "@/lib/client/locale";
import Link from "next/link";
import {OperatorEmailForm} from "./operator-email-form";
import {useSearchParams} from "next/navigation";
import {AuthWorkspace} from "@/components/auth-workspace";
import {Button, ErrorState} from "@/components/ui";

export default function OperatorLogin({emailLoginEnabled}:{emailLoginEnabled:boolean}){
  const search=useSearchParams();
  const denied=search.get("error")==="entra_access_denied";

  const next=search.get("next");
  const target=next==="/operator"||next?.startsWith("/operator/")&&!next.includes("\\")?next:"/operator";
  const startMicrosoft=()=>{
    const path=`/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(`/api/operator/sso/callback?next=${encodeURIComponent(target)}`)}`;
    window.location.assign(new URL(path,window.location.origin).toString());
  };


  return <AuthWorkspace showLocaleSwitcher={false}><section className="auth-card operator-login-card">
    <span className="eyebrow"><LocalizedText>{"ONE ADMIN"}</LocalizedText></span>
    <h1><LocalizedText>{"Admin Portal"}</LocalizedText></h1>
    {emailLoginEnabled&&<OperatorEmailForm target={target}/>}
    {!emailLoginEnabled&&<p><LocalizedText>{"Interner Zugang für Binso-Mitarbeitende über Microsoft Entra ID."}</LocalizedText></p>}
    <Button onClick={startMicrosoft}><LocalizedText>{"Mit Microsoft anmelden"}</LocalizedText></Button>
    {!emailLoginEnabled&&<p className="operator-login-note"><LocalizedText>{"Microsoft verwaltet Anmeldung, Microsoft Authenticator/MFA und Kontosicherheit. Zugriff erhalten nur im Binso-Entra-Tenant autorisierte Personen mit einer zugewiesenen Binso-One-App-Rolle."}</LocalizedText></p>}
    {denied&&<ErrorState className="auth-error"><LocalizedText>{"Microsoft-Anmeldung erfolgreich, aber deinem Konto ist keine gültige Binso-One-Adminrolle zugewiesen."}</LocalizedText></ErrorState>}
    <p className="auth-bottom"><Link href="/"><LocalizedText>{"Zurück zu Binso One"}</LocalizedText></Link></p>
  </section></AuthWorkspace>;
}
