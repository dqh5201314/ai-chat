import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth-utils";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "chat-backup.json");

function getAuthUser(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const payload = verifyToken(token);
  return payload?.username || null;
}

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: true, message: "未登录" }, { status: 401 });
  }

  try {
    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json({ data: null });
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return NextResponse.json({ data: JSON.parse(raw) });
  } catch (e) {
    return NextResponse.json({ error: true, message: "读取数据失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: true, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: true, message: "保存数据失败" }, { status: 500 });
  }
}
