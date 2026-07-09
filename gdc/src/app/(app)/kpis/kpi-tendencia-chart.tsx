"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function KpiTendenciaChart({ datos }: { datos: { mes: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={datos} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis hide allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="valor" fill="#1a2b44" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
