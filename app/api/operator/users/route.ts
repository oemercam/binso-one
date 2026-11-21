import {requireOperatorSession} from "@/lib/server/operator/session";
import {authorizeOperator} from "@/lib/server/operator/rbac";
import {query} from "@/lib/server/db";
import {operatorPasskeyLoginEnabled} from "@/lib/server/operator/login-mode";
import {apiError,json} from "@/lib/server/http";

export const runtime="nodejs";

export async function GET(){
  try{
    const session=await requireOperatorSession();
    authorizeOperator(session,"operators:read");
    const local=operatorPasskeyLoginEnabled();
    const result=await query(
      `select user_id,email,coalesce(display_name,email) as display_name,role,(status='active') as active,
              auth_source,entra_object_id,entra_tenant_id,last_entra_sync_at,last_login_at,created_at
         from platform_operator_assignments
        where auth_source=$1
        order by lower(coalesce(display_name,email))`,[local?"password_passkey":"entra"]
    );
    return json({items:result.rows,source:local?"password_passkey":"Microsoft Entra ID"});
  }catch(error){return apiError(error);}
}

export async function POST(){
  if(operatorPasskeyLoginEnabled())return json({error:"operator_managed"},405);
  return json({error:"entra_managed",message:"Interne Binso-Benutzer und Rollen werden in Microsoft Entra ID verwaltet."},405);
}
