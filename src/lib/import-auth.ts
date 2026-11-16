import "server-only";
import { eq } from "drizzle-orm";
import { db, suppliers } from "@/db";
import { supplierAccess } from "./auth";
import { hashToken } from "./importer";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

/** Autentica a extensao pelo token (Bearer). So libera fornecedor ativo com o importador habilitado. */
export async function supplierFromToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token.startsWith("fxi_") || token.length < 20) return { error: json({ error: "Extensão não conectada. Baixe novamente no painel, em Importados." }, 401) };
  const s = await db.query.suppliers.findFirst({ where: eq(suppliers.importTokenHash, hashToken(token)) });
  if (!s) return { error: json({ error: "Conexão inválida ou substituída. Baixe a extensão novamente em Importados." }, 401) };
  if (!supplierAccess(s).ok) return { error: json({ error: "Conta do fornecedor indisponível." }, 403) };
  if (!s.importerEnabled) return { error: json({ error: "O importador não está liberado para esta conta. Fale com o suporte." }, 403) };
  return { supplier: s };
}
