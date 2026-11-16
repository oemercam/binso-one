import {retentionIsCurrent} from "@/lib/server/retention-job";

export const dynamic = "force-dynamic";

export async function GET() {
  const current = await retentionIsCurrent().catch(() => false);
  return Response.json({status: current ? "current" : "overdue"}, {
    status: current ? 200 : 503, headers: {"Cache-Control": "no-store"},
  });
}
