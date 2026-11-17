import {pilotEnabled} from '@/config/plan-access';
import {requireModuleEntitlement} from '@/lib/server/plan-access';
import {apiError,json} from '@/lib/server/http';
import {authorize} from '@/lib/server/rbac';
import {requireSession} from '@/lib/server/session';
import {withTenant} from '@/lib/server/db';
import {financeData,cashStatisticsData} from '@/lib/server/repositories/finance';
export async function GET(request:Request){
 try{const s=await requireSession();authorize(s,'accounting:read');if(pilotEnabled)await requireModuleEntitlement(s.organizationId,'buchhaltung');return json(await withTenant(s.organizationId,s.userId,async c=>({...(new URL(request.url).searchParams.get('view')==='cash'?{}:await financeData(c,s.organizationId)),cash:await cashStatisticsData(c,s.organizationId)}),{snapshot:true}));}
 catch(error){return apiError(error);}
}
