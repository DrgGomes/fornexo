"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/lib/format";

export type DayPoint = { label: string; revenue: number; orders: number };

export function RevenueChart({ data, color = "#4f46e5", height = 240 }: { data: DayPoint[]; color?: string; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fx-rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f0f0f2" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            tickFormatter={(v: number) => (v >= 100000 ? `${Math.round(v / 100000)}k` : `${Math.round(v / 100)}`)}
          />
          <Tooltip
            cursor={{ stroke: "#e4e4e7" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as DayPoint;
              return (
                <div className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg">
                  <p className="font-medium text-zinc-300">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold">{brl(p.revenue)}</p>
                  <p className="text-zinc-400">{p.orders} pedidos</p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={2} fill="url(#fx-rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
