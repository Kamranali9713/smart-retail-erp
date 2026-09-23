import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { postTransaction } from "@/lib/accounting";
export async function POST(req){const a=await requirePermission("accounting","create");if(a.response)return a.response;try{const b=await req.json();const r=await prisma.$transaction(async tx=>postTransaction(tx,{accountId:b.accountId,type:b.type,amount:b.amount,description:b.description,refType:"MANUAL"}));return NextResponse.json(r,{status:201});}catch(e){return NextResponse.json({error:e.message},{status:400});}}
