import { and, desc, eq, type SQL } from "drizzle-orm";
import { db, resellers, transactions } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { TX_LABEL } from "@/lib/constants";
import { centsToCsv, csvResponse, toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const rid = new URL(req.url).searchParams.get("rid");
  const conds: SQL[] = [];
  if (user.role === "SUPPLIER" && user.supplierId) {
    conds.push(eq(transactions.supplierId, user.supplierId));
    if (rid) conds.push(eq(transactions.resellerId, rid));
  } else if (user.role === "RESELLER" && user.resellerId) {
    conds.push(eq(transactions.resellerId, user.resellerId));
  } else return new Response("Sem permissão", { status: 403 });
  const rows = await db
    .select({ t: transactions, name: resellers.name, store: resellers.storeName })
    .from(transactions)
    .innerJoin(resellers, eq(resellers.id, transactions.resellerId))
    .where(and(...conds))
    .orderBy(desc(transactions.createdAt))
    .limit(50000);
  const header = ["Data", "Revendedor", "Tipo", "Descrição", "Valor", "Saldo após"];
  const body = rows.map(({ t, name, store }) => [formatDateTime(t.createdAt), store || name, TX_LABEL[t.type], t.description, centsToCsv(t.amount), centsToCsv(t.balanceAfter)]);
  return csvResponse(`extrato-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, body));
}
