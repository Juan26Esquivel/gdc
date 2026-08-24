"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ORDEN_COLORES_SEMAFORO,
  LABEL_COLOR_SEMAFORO,
  type ColorSemaforo,
} from "@/lib/semaforo";

const ESTILO_LEGEND: Record<ColorSemaforo, string> = {
  verde: "bg-emerald-100 text-emerald-800",
  amarillo: "bg-yellow-100 text-yellow-800",
  ambar: "bg-orange-100 text-orange-800",
  rojo: "bg-red-100 text-red-800",
  negro: "bg-zinc-900 text-zinc-50",
};

const ESTILO_BADGE: Record<ColorSemaforo, string> = {
  verde: "bg-emerald-100 text-emerald-700",
  amarillo: "bg-yellow-100 text-yellow-800",
  ambar: "bg-orange-100 text-orange-800",
  rojo: "bg-red-100 text-red-700",
  negro: "bg-zinc-900 text-zinc-50",
};

export type FilaSemaforo = {
  id: string;
  numeroExpediente: string;
  tipoProcesoId: number;
  tipoNombre: string;
  subtipoNombre: string | null;
  faseNombre: string | null;
  fechaRegistro: string;
  color: ColorSemaforo;
  meses: number;
};

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-PA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function TarjetaSemaforo({
  filas,
  tipos,
}: {
  filas: FilaSemaforo[];
  tipos: { id: number; nombre: string }[];
}) {
  const [tipoFiltro, setTipoFiltro] = useState<number | null>(null);

  const conteoPorColor = useMemo(() => {
    const conteo: Record<ColorSemaforo, number> = {
      verde: 0,
      amarillo: 0,
      ambar: 0,
      rojo: 0,
      negro: 0,
    };
    for (const fila of filas) conteo[fila.color]++;
    return conteo;
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    const filtradas = tipoFiltro ? filas.filter((f) => f.tipoProcesoId === tipoFiltro) : filas;
    return [...filtradas].sort((a, b) => b.meses - a.meses).slice(0, 15);
  }, [filas, tipoFiltro]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas por tiempo en el sistema</CardTitle>
        <p className="text-xs text-muted-foreground">
          Verde ≤3 meses · Amarillo ≤6 · Ámbar ≤9 · Rojo ≤12 · Negro &gt;12 (sobre la fecha de
          registro, expedientes activos)
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ORDEN_COLORES_SEMAFORO.map((color) => (
            <div key={color} className={`rounded-md p-3 ${ESTILO_LEGEND[color]}`}>
              <p className="text-[11px] font-semibold">{LABEL_COLOR_SEMAFORO[color]}</p>
              <p className="font-heading text-xl font-semibold">{conteoPorColor[color]}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTipoFiltro(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              tipoFiltro === null ? "border-foreground bg-foreground text-background" : "border-border"
            }`}
          >
            Todos los tipos
          </button>
          {tipos.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipoFiltro(t.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                tipoFiltro === t.id ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº expediente</TableHead>
              <TableHead>Tipo de proceso</TableHead>
              <TableHead>Fase actual</TableHead>
              <TableHead>Fecha de registro</TableHead>
              <TableHead>Tiempo en el sistema</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filasFiltradas.map((fila) => (
              <TableRow key={fila.id}>
                <TableCell>
                  <Link
                    href={`/expedientes/${fila.id}`}
                    className="font-mono text-xs underline underline-offset-2"
                  >
                    {fila.numeroExpediente}
                  </Link>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{fila.tipoNombre}</p>
                  {fila.subtipoNombre && (
                    <p className="text-xs text-muted-foreground">{fila.subtipoNombre}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{fila.faseNombre ?? "—"}</TableCell>
                <TableCell className="text-sm">{formatearFecha(fila.fechaRegistro)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILO_BADGE[fila.color]}`}
                  >
                    {fila.meses} {fila.meses === 1 ? "mes" : "meses"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Sin expedientes activos para este filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
