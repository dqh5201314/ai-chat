import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth-utils";

async function getAuthUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const payload = await verifyToken(token);
  return payload?.username || null;
}

// Cloudflare Pages: data is ephemeral, stored in memory
let memoryStore: any = null;

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: true, message: "未登录" }, { status: 401 });
  }

  return NextResponse.json({ data: memoryStore });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: true, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    memoryStore = body;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: true, message: "保存数据失败" }, { status: 500 });
  }
}
