import { NextResponse, type NextRequest } from "next/server";
import { isAppHost, supplierByDomain } from "@/lib/domain-lookup";
import { homeFor, SESSION_COOKIE, verifySession } from "@/lib/session-token";

const RULES: { prefix: string; role: "ADMIN" | "SUPPLIER" | "RESELLER" }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/f", role: "SUPPLIER" },
  { prefix: "/print", role: "SUPPLIER" },
  { prefix: "/r", role: "RESELLER" },
];

/** Paginas publicas do fornecedor servidas na raiz do dominio proprio dele. */
const SHOWCASE_PATHS = /^\/(?:cadastro|catalogo|p\/[^/]+)?$/;
/** Paginas da plataforma que nao fazem sentido no dominio do fornecedor. */
const PLATFORM_ONLY = /^\/(?:admin|setup|aguardando|bloqueado)(?:\/|$)/;

/** URL absoluta no mesmo endereco que o visitante abriu (dominio do fornecedor ou da plataforma). */
function at(req: NextRequest, path: string) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return new URL(path, req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : req.nextUrl.protocol.replace(":", ""));
  return new URL(path, `${proto}://${host}`);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // Dominio proprio de fornecedor
  if (!isAppHost(host)) {
    const hit = await supplierByDomain(host);
    if (hit) {
      const headers = new Headers(req.headers);
      headers.set("x-fx-domain-slug", hit.slug);
      const vPrefix = `/v/${hit.slug}`;
      if (pathname === vPrefix || pathname.startsWith(vPrefix + "/")) {
        return NextResponse.redirect(at(req, (pathname.slice(vPrefix.length) || "/") + search), 308);
      }
      if (pathname.startsWith("/v/") || PLATFORM_ONLY.test(pathname)) return NextResponse.redirect(at(req, "/"));
      if (SHOWCASE_PATHS.test(pathname)) {
        return NextResponse.rewrite(new URL(vPrefix + (pathname === "/" ? "" : pathname) + search, req.url), { request: { headers } });
      }
      const res = await guard(req, pathname, search);
      return res ?? NextResponse.next({ request: { headers } });
    }
  }

  return (await guard(req, pathname, search)) ?? NextResponse.next();
}

async function guard(req: NextRequest, pathname: string, search: string) {
  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (!rule) return null;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = at(req, "/entrar");
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (session.role !== rule.role) return NextResponse.redirect(at(req, homeFor(session.role)));
  return null;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|api/).*)"],
};
