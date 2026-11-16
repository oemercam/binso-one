import {authorizeRetention, runAuthRetention} from "@/lib/server/retention-job";

const headers = {"Cache-Control": "no-store"};

export async function POST(request: Request) {
  if (!await authorizeRetention(request.headers.get("authorization"))) {
    return Response.json({status: "unauthorized"}, {status: 401, headers});
  }
  try {
    const counts = await runAuthRetention();
    if (!counts) return Response.json({status: "in_progress"}, {
      status: 503, headers: {...headers, "Retry-After": "30"},
    });
    return Response.json({status: "ok", counts}, {headers});
  } catch {
    console.error("Scheduled authentication retention failed");
    return Response.json({status: "failed"}, {status: 503, headers});
  }
}
