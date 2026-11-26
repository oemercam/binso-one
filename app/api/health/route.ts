import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let firstHealthResponse = true;

export function GET() {
  if (firstHealthResponse) {
    firstHealthResponse = false;
    console.info(JSON.stringify({
      category: "runtime_startup",
      phase: "health_response",
      nodeUptimeMs: Math.round(process.uptime() * 1000),
    }));
  }
  return NextResponse.json(
    {
      status: "ok",
      service: "binso-one",
      version: process.env.npm_package_version ?? "0.11.0",
      release: process.env.BINSO_BUILD_SHA?.slice(0, 7) ?? "development",
      sha: process.env.BINSO_BUILD_SHA ?? "development",
      releaseProfile:process.env.BINSO_RELEASE_PROFILE??"production",
      uptimeSeconds: Math.round(process.uptime()),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
