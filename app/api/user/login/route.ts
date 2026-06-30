import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/app/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const validUsername = process.env.LOGIN_USERNAME || "dqh";
    const validPassword = process.env.LOGIN_PASSWORD || "dqh060831";

    if (username !== validUsername || password !== validPassword) {
      return NextResponse.json(
        { error: true, message: "用户名或密码错误" },
        { status: 401 },
      );
    }

    const token = signToken(username);

    return NextResponse.json({ token, username });
  } catch (e) {
    return NextResponse.json(
      { error: true, message: "请求格式错误" },
      { status: 400 },
    );
  }
}
