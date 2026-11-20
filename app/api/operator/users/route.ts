import {requireOperatorSession} from "@/lib/server/operator/session";
import {authorizeOperator} from "@/lib/server/operator/rbac";
import {query} from "@/lib/server/db";
import {apiError,json} from "@/lib/server/http";

export const runtime="nodejs";

export async function GET(){
  try{
    const session=await requireOperatorSession();
    authorizeOperator(session,"operators:read");
    const result=await query(
      `select user_id,email,coalesce(display_name,email) as display_name,role,(status='active') as active,
              auth_source,entra_object_id,entra_tenant_id,last_entra_sync_at,created_at
         from platform_operator_assignments
        where auth_source in ('entra','email_code')
        order by lower(coalesce(display_name,email))`
    );
    return json({items:result.rows,source:"platform_operator_assignments"});
  }catch(error){return apiError(error);}
}

export async function POST(){
  return json({error:"operator_provisioning_required",message:"Benutzer können hier nicht angelegt werden."},405);
}
