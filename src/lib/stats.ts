import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { daysAgoSP, spDateKey } from "./format";
import type { DayPoint } from "@/components/charts/area-chart";

/** Serie diaria (fuso SP) de faturamento e pedidos nao cancelados. */
export async function dailySeries(opts: { supplierId: string; resellerId?: string; days: number }): Promise<DayPoint[]> {
  const from = daysAgoSP(opts.days - 1);
  const rows = await db.execute<{ day: string; revenue: string; orders: string }>(sql`
    select to_char((created_at at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD') as day,
           coalesce(sum(total),0) as revenue, count(*) as orders
    from orders
    where supplier_id = ${opts.supplierId}
      ${opts.resellerId ? sql`and reseller_id = ${opts.resellerId}` : sql``}
      and status <> 'CANCELED' and created_at >= ${from}
    group by 1`);
  const map = new Map(rows.rows.map((r) => [r.day, r]));
  const out: DayPoint[] = [];
  for (let i = opts.days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = spDateKey(d);
    const r = map.get(key);
    out.push({ label: `${key.slice(8, 10)}/${key.slice(5, 7)}`, revenue: Number(r?.revenue ?? 0), orders: Number(r?.orders ?? 0) });
  }
  return out;
}
