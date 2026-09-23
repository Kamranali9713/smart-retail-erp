import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountSchema, validate } from "@/lib/validation";

export async function GET(){
  const s=await getServerSession(authOptions);
  if(!hasPermission(s,"accounting","view"))return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json(await prisma.account.findMany({orderBy:[{type:"asc"},{name:"asc"}]}));
}

export async function POST(req){
  const s=await getServerSession(authOptions);
  if(!hasPermission(s,"accounting","create"))return NextResponse.json({error:"Forbidden"},{status:403});
  try {
    const body=validate(accountSchema,await req.json());
    const row=await prisma.account.create({data:{name:body.name,type:body.type,balance:0}});
    await prisma.auditLog.create({data:{userId:s.user.id,action:"CREATE",module:"accounting",entityId:row.id,metadata:{name:row.name,type:row.type}}});
    return NextResponse.json(row,{status:201});
  } catch(e) { return NextResponse.json({error:e.message||"Unable to create account",issues:e.issues},{status:e.status||400}); }
}
