"use client";

import { useState } from "react";
import { Pencil, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ENTIDAD_BASE_LABEL, METRICA_LABEL, type ResultadoKpi } from "@/lib/kpis";
import { ConfiguradorKpi, type KpiEditable } from "./configurador-kpi";
import { KpiTendenciaChart } from "./kpi-tendencia-chart";
import { eliminarKpi } from "./actions";

export type KpiConValor = KpiEditable & { resultado: ResultadoKpi };

function estadoUmbral(kpi: KpiConValor): "optimo" | "alerta" | "critico" | null {
  const { valorActual } = kpi.resultado;
  if (valorActual === null || kpi.metrica !== "porcentaje_cumplimiento") return null;
  if (kpi.umbral_optimo !== null && valorActual >= kpi.umbral_optimo) return "optimo";
  if (kpi.umbral_alerta !== null && valorActual >= kpi.umbral_alerta) return "alerta";
  if (kpi.umbral_critico !== null && valorActual < kpi.umbral_critico) return "critico";
  return null;
}

// Tailwind necesita ver las clases completas de forma literal para generarlas
// (igual que en estado-badge.tsx) — por eso el mapa completo en vez de interpolar.
const COLOR_UMBRAL: Record<string, string> = {
  optimo: "text-status-confirmed",
  alerta: "text-status-correction",
  critico: "text-destructive",
};
const COLOR_UMBRAL_DEFAULT = "text-primary";

export function KpisPanel({ kpis, puedeEditar }: { kpis: KpiConValor[]; puedeEditar: boolean }) {
  const [kpiEditando, setKpiEditando] = useState<KpiEditable | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);

  const activos = kpis.filter((k) => k.activo);

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este KPI? Esta acción no se puede deshacer.")) return;
    await eliminarKpi(id);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <section className="flex flex-col gap-4 lg:col-span-8">
        <div className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
              <BarChart3 className="size-4" />
              Catálogo de Indicadores
            </h3>
            <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
              {kpis.length} KPI{kpis.length === 1 ? "" : "S"} CONFIGURADO{kpis.length === 1 ? "" : "S"}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del KPI</TableHead>
                <TableHead>Entidad / Métrica</TableHead>
                <TableHead>Valor actual</TableHead>
                <TableHead>Estado</TableHead>
                {puedeEditar && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((kpi) => (
                <TableRow key={kpi.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-primary">{kpi.nombre}</span>
                      {kpi.descripcion && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {kpi.descripcion}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs uppercase text-primary">
                        {ENTIDAD_BASE_LABEL[kpi.entidad_base]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {METRICA_LABEL[kpi.metrica]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {kpi.resultado.valorActual === null
                      ? "Sin datos"
                      : `${kpi.resultado.valorActual}${kpi.resultado.unidad === "%" ? "%" : kpi.resultado.unidad === "días" ? " días" : ""}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${kpi.activo ? "bg-status-confirmed" : "bg-muted-foreground"}`}
                      />
                      <span
                        className={`text-xs font-bold ${kpi.activo ? "text-status-confirmed" : "text-muted-foreground"}`}
                      >
                        {kpi.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                  {puedeEditar && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setKpiEditando(kpi);
                          setCreandoNuevo(false);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => borrar(kpi.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {kpis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={puedeEditar ? 5 : 4} className="text-center text-sm text-muted-foreground">
                    Ningún KPI configurado todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-sm border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-primary">Simulación de Visualización</h4>
            <span className="text-[11px] font-bold text-muted-foreground">DATOS EN TIEMPO REAL</span>
          </div>
          {activos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay KPIs activos todavía para visualizar.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activos.map((kpi) => (
                <KpiVisualizacionCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
          )}
        </div>
      </section>

      {puedeEditar && (
        <aside className="lg:col-span-4">
          <div className="sticky top-4">
            {kpiEditando || creandoNuevo ? (
              <ConfiguradorKpi
                key={kpiEditando?.id ?? "nuevo"}
                kpiEditar={kpiEditando}
                onGuardado={() => {
                  setKpiEditando(null);
                  setCreandoNuevo(false);
                }}
                onCancelar={() => {
                  setKpiEditando(null);
                  setCreandoNuevo(false);
                }}
              />
            ) : (
              <Button className="w-full" onClick={() => setCreandoNuevo(true)}>
                Nuevo indicador
              </Button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function KpiVisualizacionCard({ kpi }: { kpi: KpiConValor }) {
  const estado = estadoUmbral(kpi);
  const color = estado ? COLOR_UMBRAL[estado] : COLOR_UMBRAL_DEFAULT;
  const { valorActual } = kpi.resultado;

  if (kpi.metrica === "porcentaje_cumplimiento") {
    const pct = valorActual ?? 0;
    const circunferencia = 251.2;
    const offset = circunferencia * (1 - pct / 100);
    return (
      <div className="flex items-center gap-6 rounded-xl border border-border bg-muted/20 p-6">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform">
            <circle
              className="text-border"
              cx="48"
              cy="48"
              r="40"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
            />
            <circle
              className={color}
              cx="48"
              cy="48"
              r="40"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circunferencia}
              strokeDashoffset={valorActual === null ? circunferencia : offset}
            />
          </svg>
          <span className="absolute text-xl font-bold text-primary">
            {valorActual === null ? "—" : `${valorActual}%`}
          </span>
        </div>
        <div>
          <h5 className="mb-1 text-xs font-semibold uppercase text-primary">{kpi.nombre}</h5>
          <p className="text-xs text-muted-foreground">
            {ENTIDAD_BASE_LABEL[kpi.entidad_base]} · {METRICA_LABEL[kpi.metrica]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-6">
      <div className="mb-2 flex items-start justify-between">
        <h5 className="text-xs font-semibold uppercase text-primary">{kpi.nombre}</h5>
        <span className="rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
          Últimos 6 meses
        </span>
      </div>
      <p className="mb-2 text-2xl font-bold tracking-tight text-primary">
        {valorActual === null ? "Sin datos" : `${valorActual}${kpi.resultado.unidad === "días" ? " días" : ""}`}
      </p>
      <KpiTendenciaChart datos={kpi.resultado.serieMensual} />
    </div>
  );
}
