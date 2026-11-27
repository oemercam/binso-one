import {NextResponse} from "next/server";
import {destroyOperatorSession} from "@/lib/server/operator/session";
import {operatorEmailLoginEnabled,operatorPasskeyLoginEnabled} from "@/lib/server/operator/login-mode";
import {microsoftLogoutUrl} from "@/lib/server/operator/entra";

export const runtime="nodejs";

export async function POST(){
  await destroyOperatorSession();
  return NextResponse.json({ok:true,microsoftLogoutUrl:(operatorEmailLoginEnabled()||operatorPasskeyLoginEnabled())?null:microsoftLogoutUrl()});
}
