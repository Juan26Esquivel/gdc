"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  programarAudienciaEspecial,
  reprogramarAudiencia,
  type EstadoAccionExpediente,
} from "./actions";

const ESTADO_INICIAL: EstadoAccionExpediente = {};

const LABEL_TIPO: Record<string, string> = {
  preliminar: "Preliminar",
  fondo: "De fondo",
  especial: "Especial",
};

const LABEL_ESTADO: Record<string, string> = {
  programada: "Programada",
  celebrada: "Celebrada",
  suspendida: "Suspendida",
  continuada: "Continuada",
  terminada_por_incomparecencia: "Terminada por incomparecencia",
};

export type AudienciaVista = {
  id: string;
  tipo: string;
  fechaProgramada: string;
  estado: string;
  motivo: string | null;
};

function formatearFecha(fecha: string) {
  return new Date(`${fecha.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("es-PA", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AudienciasExpediente({
  expedienteId,
  audiencias,
  esAdmin,
}: {
  expedienteId: string;
  audiencias: AudienciaVista[];
  esAdmin: boolean;
}) {
  const [estadoReprog, accionReprog, reprogPendiente] = useActionState(
    reprogramarAudiencia,
    ESTADO_INICIAL,
  );
  const [estadoEspecial, accionEspecial, especialPendiente] = useActionState(
    programarAudienciaEspecial,
    ESTADO_INICIAL,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audiencias</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {audiencias.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin audiencias programadas todavía.</p>
        )}

        {audiencias.map((a) => (
          <div key={a.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-semibold">{LABEL_TIPO[a.tipo] ?? a.tipo}</p>
              <p className="text-sm">{formatearFecha(a.fechaProgramada)}</p>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {LABEL_ESTADO[a.estado] ?? a.estado}
              </span>
            </div>
            {a.motivo && <p className="text-xs text-muted-foreground">Motivo: {a.motivo}</p>}
            {esAdmin && a.estado === "programada" && (
              <form action={accionReprog} className="mt-1 flex flex-wrap items-end gap-2">
                <input type="hidden" name="audiencia_id" value={a.id} />
                <input type="hidden" name="expediente_id" value={expedienteId} />
                <Input
                  type="date"
                  name="nueva_fecha"
                  required
                  className="h-8 w-36"
                  defaultValue={a.fechaProgramada.slice(0, 10)}
                />
                <Button type="submit" size="sm" variant="outline" disabled={reprogPendiente}>
                  {reprogPendiente ? "..." : "Reprogramar"}
                </Button>
              </form>
            )}
          </div>
        ))}

        {estadoReprog.error && <p className="text-sm text-destructive">{estadoReprog.error}</p>}
        {estadoReprog.advertencia && (
          <p className="text-sm text-amber-700">{estadoReprog.advertencia}</p>
        )}
        {estadoReprog.ok && !estadoReprog.advertencia && (
          <p className="text-sm text-status-confirmed">Audiencia reprogramada.</p>
        )}

        {esAdmin && (
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">Programar audiencia especial</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Art. 262 y 263 de la Ley 402: se convoca por un incidente concreto (exclusión o
              rescisión de secuestro, separación del depositario, reclamaciones o rescisión de
              embargo, acumulación de procesos, excepciones de previo pronunciamiento, o cualquier
              cuestión que no pudo decidirse en la preliminar). No tiene ventana de plazo
              parametrizable, por eso se fija directamente.
            </p>
            <form action={accionEspecial} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="expediente_id" value={expedienteId} />
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="fecha_programada">Fecha</Label>
                  <Input
                    id="fecha_programada"
                    name="fecha_programada"
                    type="date"
                    required
                    className="w-40"
                  />
                </div>
                <div className="flex min-w-60 flex-1 flex-col gap-1">
                  <Label htmlFor="motivo">Motivo (obligatorio)</Label>
                  <Input
                    id="motivo"
                    name="motivo"
                    maxLength={300}
                    required
                    placeholder="Ej. Solicitud de rescisión de embargo (Art. 262 núm. 7)"
                  />
                </div>
              </div>
              {estadoEspecial.error && (
                <p className="text-sm text-destructive">{estadoEspecial.error}</p>
              )}
              {estadoEspecial.ok && (
                <p className="text-sm text-status-confirmed">Audiencia especial programada.</p>
              )}
              <Button type="submit" disabled={especialPendiente} className="w-fit">
                {especialPendiente ? "Programando…" : "Programar audiencia especial"}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
