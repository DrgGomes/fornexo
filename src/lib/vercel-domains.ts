import "server-only";

/** Integracao com a API da Vercel para domínios próprios dos fornecedores. */
const API = "https://api.vercel.com";

export function domainsConfigured() {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

async function call(path: string, init?: RequestInit) {
  const team = process.env.VERCEL_TEAM_ID ? `${path.includes("?") ? "&" : "?"}teamId=${process.env.VERCEL_TEAM_ID}` : "";
  const res = await fetch(`${API}${path}${team}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

export type DomainCheck = {
  verified: boolean;
  configured: boolean;
  apex: boolean;
  verification: { type: string; domain: string; value: string }[];
};

export async function addDomain(name: string): Promise<{ ok: true; apex: boolean } | { ok: false; error: string }> {
  const pid = process.env.VERCEL_PROJECT_ID!;
  const r = await call(`/v10/projects/${pid}/domains`, { method: "POST", body: JSON.stringify({ name }) });
  if (r.ok) return { ok: true, apex: r.body.apexName === name };
  const err = (r.body.error ?? {}) as { code?: string; message?: string };
  if (err.code === "domain_already_in_use" || err.code === "domain_taken") return { ok: false, error: "Esse domínio já está conectado em outro site da Vercel. Remova de lá antes ou use um subdomínio (ex: revenda.seudominio.com.br)." };
  if (err.code === "invalid_domain") return { ok: false, error: "Domínio inválido." };
  if (r.status === 409) {
    // ja esta neste projeto
    const g = await call(`/v9/projects/${pid}/domains/${name}`);
    if (g.ok) return { ok: true, apex: g.body.apexName === name };
  }
  return { ok: false, error: err.message ? `Não foi possível conectar: ${err.message}` : "Não foi possível conectar o domínio agora. Tente de novo em instantes." };
}

export async function removeDomain(name: string) {
  const pid = process.env.VERCEL_PROJECT_ID!;
  await call(`/v9/projects/${pid}/domains/${name}`, { method: "DELETE" }).catch(() => null);
}

export async function checkDomain(name: string): Promise<DomainCheck | null> {
  const pid = process.env.VERCEL_PROJECT_ID!;
  const [d, c] = await Promise.all([call(`/v9/projects/${pid}/domains/${name}`), call(`/v6/domains/${name}/config`)]);
  if (!d.ok) return null;
  if (d.body.verified === false) await call(`/v9/projects/${pid}/domains/${name}/verify`, { method: "POST" }).catch(() => null);
  return {
    verified: d.body.verified !== false,
    configured: c.ok ? c.body.misconfigured === false : false,
    apex: d.body.apexName === name,
    verification: Array.isArray(d.body.verification) ? (d.body.verification as DomainCheck["verification"]) : [],
  };
}

export function normalizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

export const DOMAIN_RE = /^(?=.{4,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/;
