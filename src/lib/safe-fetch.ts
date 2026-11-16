import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
}

async function assertPublicUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocolo");
  if (u.username || u.password) throw new Error("credenciais");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|metadata\..*)$/i.test(host)) throw new Error("host");
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("ip");
  return u;
}

/** Busca uma URL externa bloqueando enderecos internos (SSRF), com limite de redirecionamentos e tempo. */
export async function safeFetch(url: string, opts?: { timeoutMs?: number; maxRedirects?: number }) {
  let current = url;
  for (let i = 0; i <= (opts?.maxRedirects ?? 3); i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(opts?.timeoutMs ?? 15000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("redirecionamentos demais");
}
