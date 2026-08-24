"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  agregarDiaNoHabil,
  eliminarDiaNoHabil,
  type EstadoAdministracion,
} from "./actions";

const ESTADO_INICIAL: EstadoAdministracion = {};

export type DiaNoHabil = { fecha: string; descripcion: string };

function formatearFechaLarga(fecha: string) {
  // Se fuerza UTC: las fechas llegan como "YYYY-MM-DD" (medianoche UTC) y en
  // Panamá (UTC-5) el formateo local las correría un día hacia atrás.
  return new Date(`${fecha}T00:00:00.000Z`).toLocaleDateString("es-PA", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function DiasNoHabiles({ dias }: { dias: DiaNoHabil[] }) {
  const [estadoAlta, accionAlta, altaPendiente] = useActionState(agregarDiaNoHabil, ESTADO_INICIAL);
  const [estadoBaja, accionBaja, bajaPendiente] = useActionState(
    eliminarDiaNoHabil,
    ESTADO_INICIAL,
  );

  const porAnio = new Map<number, DiaNoHabil[]>();
  for (const dia of dias) {
    const anio = Number(dia.fecha.slice(0, 4));
    porAnio.set(anio, [...(porAnio.get(anio) ?? []), dia]);
  }
  const anios = [...porAnio.keys()].sort((a, b) => a - b);
  const anioActual = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Base de todo cálculo de términos en días hábiles: el plazo de admisión (Art. 395), el término
        de contestación y los plazos de audiencia. Los sábados y domingos ya se excluyen
        automáticamente — aquí solo van los feriados, días de duelo y receso judicial.
      </p>

      {!anios.includes(anioActual) && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
          No hay ningún día no hábil cargado para {anioActual}. Los plazos que se calculen sobre este
          año van a salir más cortos que el término legal real, sin ningún aviso en las pantallas.
        </p>
      )}

      <form action={accionAlta} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" required className="w-40" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="descripcion">Descripción</Label>
          <Input
            id="descripcion"
            name="descripcion"
            maxLength={120}
            required
            placeholder="Ej. Viernes Santo, Martes de Carnaval, Receso judicial"
          />
        </div>
        <Button type="submit" disabled={altaPendiente}>
          {altaPendiente ? "Agregando…" : "Agregar día"}
        </Button>
      </form>

      {estadoAlta.error && <p className="text-sm text-destructive">{estadoAlta.error}</p>}
      {estadoAlta.ok && <p className="text-sm text-status-confirmed">Día agregado.</p>}
      {estadoBaja.error && <p className="text-sm text-destructive">{estadoBaja.error}</p>}
      {estadoBaja.ok && <p className="text-sm text-status-confirmed">Día eliminado.</p>}

      {dias.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay días no hábiles cargados todavía.</p>
      )}

      {anios.map((anio) => (
        <div key={anio} className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {anio} · {porAnio.get(anio)!.length} días
          </p>
          <div className="flex flex-col divide-y divide-border">
            {porAnio.get(anio)!.map((dia) => (
              <div key={dia.fecha} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{formatearFechaLarga(dia.fecha)}</p>
                  <p className="truncate text-xs text-muted-foreground">{dia.descripcion}</p>
                </div>
                <form action={accionBaja} className="shrink-0">
                  <input type="hidden" name="fecha" value={dia.fecha} />
                  <Button type="submit" variant="outline" size="sm" disabled={bajaPendiente}>
                    Quitar
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
