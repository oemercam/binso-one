"use client";

import {LocalizedText} from "@/lib/client/locale";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {AuthWorkspace} from "@/components/auth-workspace";
import {Button, ErrorState} from "@/components/ui";

export default function OperatorLogin(){
  const search=useSearchParams();
  const denied=search.get("error")==="entra_access_denied";

  const startMicrosoft=()=>{
    const next=search.get("next");
    const target=next?.startsWith("/operator")?next:"/operator";
    const path=`/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(`/api/operator/sso/callback?next=${encodeURIComponent(target)}`)}`;
    window.location.assign(new URL(path,window.location.origin).toString());
  };


  return <AuthWorkspace showLocaleSwitcher={false} variant="login"><section className="auth-card operator-login-card" aria-labelledby="login-heading">
    <h1 id="login-heading"><LocalizedText>{"Interner Binso-Admin-Zugang"}</LocalizedText></h1>
    <p><LocalizedText>{"Interner Zugang für Binso-Mitarbeitende über Microsoft Entra ID."}</LocalizedText></p>
    {denied&&<ErrorState className="auth-error"><LocalizedText>{"Microsoft-Anmeldung erfolgreich, aber deinem Konto ist keine gültige Binso-One-Adminrolle zugewiesen."}</LocalizedText></ErrorState>}
    <Button onClick={startMicrosoft}><LocalizedText>{"Mit Microsoft anmelden"}</LocalizedText></Button>
    <p className="auth-bottom"><Link href="/login"><LocalizedText>{"Zur Kundenanmeldung"}</LocalizedText></Link></p>
  </section></AuthWorkspace>;
}
