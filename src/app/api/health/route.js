import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "ok",
      service: "smart-retail-erp",
      version: process.env.npm_package_version || "1.0.0",
      uptimeSeconds: Math.floor(process.uptime()),
      responseMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "degraded",
      database: "error",
      error: process.env.NODE_ENV === "production" ? "Database unavailable" : error.message,
      responseMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
