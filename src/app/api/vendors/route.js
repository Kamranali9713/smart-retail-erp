import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
export async function GET(){const a=await requirePermission("vendors","view");if(a.response)return a.response;return NextResponse.json(await prisma.vendor.findMany({include:{purchases:true,payments:true},orderBy:{createdAt:"desc"}}));}
export async function POST(req){const a=await requirePermission("vendors","create");if(a.response)return a.response;try{const b=await req.json();return NextResponse.json(await prisma.vendor.create({data:{name:b.name,contact:b.contact,email:b.email,address:b.address,status:b.status||"ACTIVE"}}),{status:201});}catch(e){return NextResponse.json({error:e.message},{status:400});}}
