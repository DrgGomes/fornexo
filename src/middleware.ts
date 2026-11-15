import { NextResponse, type NextRequest } from "next/server";
import { homeFor, SESSION_COOKIE, verifySession } from "@/lib/session-token";

const RULES: { prefix: string; role: "ADMIN" | "SUPPLIER" | "RESELLER" }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/f", role: "SUPPLIER" },
  { prefix: "/print", role: "SUPPLIER" },
  { prefix: "/r", role: "RESELLER" },
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (!rule) return NextResponse.next();

  if (!session) {
    const url = new URL("/entrar", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (session.role !== rule.role) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/f/:path*", "/f", "/print/:path*", "/r/:path*", "/r"],
};
