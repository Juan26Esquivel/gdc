"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function BarrasCategoriaChart({ datos }: { datos: { categoria: string; cantidad: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, datos.length * 34)}>
      <BarChart data={datos} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="categoria" width={150} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="cantidad" fill="#1a2b44" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
