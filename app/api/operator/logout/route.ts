import {assertSameOrigin} from "@/lib/server/http";
import {NextResponse,type NextRequest} from "next/server";
import {destroyOperatorSession,getOperatorSession} from "@/lib/server/operator/session";
import {microsoftLogoutUrl} from "@/lib/server/operator/entra";

export const runtime="nodejs";

export async function POST(request:NextRequest){
  assertSameOrigin(request);
  const session=await getOperatorSession();
  await destroyOperatorSession();
  return NextResponse.json({ok:true,microsoftLogoutUrl:session?.authSource==="email_code"?null:microsoftLogoutUrl()});
}
