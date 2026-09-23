import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
export async function GET() { const a=await requirePermission("accounting","view"); if(a.response)return a.response; return NextResponse.json(await prisma.account.findMany({ orderBy:{type:"asc"} })); }
export async function POST(req) { const a=await requirePermission("accounting","create"); if(a.response)return a.response; try { const b=await req.json(); return NextResponse.json(await prisma.account.create({data:{name:b.name,type:b.type}}),{status:201}); } catch(e){return NextResponse.json({error:e.message},{status:400});} }
