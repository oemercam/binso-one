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
      `select u.user_id,u.email,coalesce(u.display_name,u.email) as display_name,u.role,(u.status='active') as active,
              u.auth_source,u.entra_object_id,u.entra_tenant_id,u.last_entra_sync_at,u.last_login_at,u.created_at
         from platform_operator_assignments u
        where u.auth_source='entra'
          and (not $1::boolean or exists(select 1 from platform_operator_passkeys k where k.user_id=u.user_id))
        order by lower(coalesce(u.display_name,u.email))`,[local]
    );
    return json({items:result.rows,source:local?"password_passkey":"Microsoft Entra ID"});
  }catch(error){return apiError(error);}
}

export async function POST(){
  if(operatorPasskeyLoginEnabled())return json({error:"operator_managed"},405);
  return json({error:"entra_managed",message:"Interne Binso-Benutzer und Rollen werden in Microsoft Entra ID verwaltet."},405);
}
