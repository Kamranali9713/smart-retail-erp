import { NextResponse } from "next/server";

export function jsonError(message, status = 400, details = undefined) {
  const payload = { error: message };
  if (details && process.env.NODE_ENV !== "production") payload.details = details;
  return NextResponse.json(payload, { status });
}

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

export async function safeJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
