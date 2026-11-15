import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "fx_session";
export const SESSION_DAYS = 30;

export type SessionPayload = { sub: string; role: "ADMIN" | "SUPPLIER" | "RESELLER" };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET ausente ou curto demais");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as SessionPayload["role"] };
  } catch {
    return null;
  }
}

export function homeFor(role: SessionPayload["role"]) {
  return role === "ADMIN" ? "/admin" : role === "SUPPLIER" ? "/f" : "/r";
}
