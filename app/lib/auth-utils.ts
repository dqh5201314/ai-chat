import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nextchat-secret-key-dqh-2024";

export interface JwtPayload {
  username: string;
}

export function signToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
