"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registrarEvento, registrarAbonoEmbargo, type EstadoAccionExpediente } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TipoEvento } from "@/lib/catalogos";

const ESTADO_INICIAL: EstadoAccionExpediente = {};

const LABEL_ESTADO_MATRIMONIO: Record<string, string> = {
  en_tramite: "En trámite",
  celebrado: "Celebrado",
  retirado: "Retirado",
};

export type EventoHistorial = {
  id: string;
  tipoNombre: string;
  alimenta: string;
  fechaEvento: string;
  createdAt: string;
  detalle: string | null;
  registradoPorNombre: string | null;
};

function useRefrescarAlExito(ok: boolean | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (ok) router.refresh();
  }, [ok, router]);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventosTab({
  expedienteId,
  tiposEventoDisponibles,
  historial,
  umbralInactividadDias,
}: {
  expedienteId: string;
  tiposEventoDisponibles: TipoEvento[];
  historial: EventoHistorial[];
  umbralInactividadDias: number;
}) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const seleccionado = tiposEventoDisponibles.find((t) => t.id === seleccionadoId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Registrar nuevo evento</CardTitle>
          <p className="text-xs text-muted-foreground">
            Actualiza el estado real del expediente — esto alimenta el Panel del Juez en tiempo real.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo de evento</Label>
            <div className="flex flex-col gap-1.5">
              {tiposEventoDisponibles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSeleccionadoId(t.id)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-medium ${
                    seleccionadoId === t.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {t.nombre}
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    → {t.alimenta}
                  </span>
                </button>
              ))}
              {tiposEventoDisponibles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay tipos de evento disponibles para este tipo de proceso todavía.
                </p>
              )}
            </div>
          </div>

          {seleccionado?.codigo === "abono_embargo" ? (
            <FormularioAbono expedienteId={expedienteId} />
          ) : seleccionado ? (
            <FormularioEventoGenerico expedienteId={expedienteId} tipoEvento={seleccionado} />
          ) : null}

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
            <p className="font-semibold">
              Todo expediente necesita movimiento cada {umbralInactividadDias} días
            </p>
            <p className="mt-1 text-primary/80">
              Guardar este evento reinicia el contador de &quot;sin movimiento&quot; del Panel del
              Juez. El umbral es configurable por el Administrador.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de eventos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada evento reinicia el contador de &quot;sin movimiento&quot; y actualiza los paneles
            de alerta del Juez de forma automática.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            {historial.map((ev) => (
              <div key={ev.id} className="flex gap-3 border-l-2 border-border pb-5 pl-4 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{ev.tipoNombre}</p>
                    <p className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatearFechaHora(ev.createdAt)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ev.registradoPorNombre ?? "Sistema"}
                  </p>
                  {ev.detalle && <p className="mt-1 text-sm">{ev.detalle}</p>}
                  <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    Alimenta: {ev.alimenta}
                  </span>
                </div>
              </div>
            ))}
            {historial.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin eventos registrados todavía.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FormularioEventoGenerico({
  expedienteId,
  tipoEvento,
}: {
  expedienteId: string;
  tipoEvento: TipoEvento;
}) {
  const [estado, formAction, pending] = useActionState(registrarEvento, ESTADO_INICIAL);
  useRefrescarAlExito(estado.ok);

  return (
    <form action={formAction} className="flex flex-col gap-3" key={tipoEvento.id}>
      <input type="hidden" name="expediente_id" value={expedienteId} />
      <input type="hidden" name="tipo_evento_id" value={tipoEvento.id} />
      <input type="hidden" name="codigo_evento" value={tipoEvento.codigo} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fecha_evento">Fecha del evento</Label>
        <Input id="fecha_evento" name="fecha_evento" type="date" defaultValue={hoyISO()} required />
      </div>

      {tipoEvento.codigo === "correccion_fecha_registro" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nueva_fecha_registro">Nueva fecha de registro</Label>
          <Input id="nueva_fecha_registro" name="nueva_fecha_registro" type="date" required />
          <p className="text-xs text-muted-foreground">
            Esta fecha alimenta el semáforo de alertas del Panel del Juez.
          </p>
        </div>
      )}

      {tipoEvento.codigo === "override_umbral_inactividad" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="motivo_omision_umbral">Motivo (obligatorio)</Label>
          <Textarea id="motivo_omision_umbral" name="motivo_omision_umbral" rows={2} required />
        </div>
      )}

      {tipoEvento.codigo === "estado_matrimonio_actualizado" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estado_matrimonio">Nuevo estado</Label>
          <select
            id="estado_matrimonio"
            name="estado_matrimonio"
            required
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {Object.entries(LABEL_ESTADO_MATRIMONIO).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="detalle">
          Detalle {tipoEvento.codigo === "observacion_actualizada" ? "(obligatorio)" : "(opcional)"}
        </Label>
        <Textarea
          id="detalle"
          name="detalle"
          rows={3}
          required={tipoEvento.codigo === "observacion_actualizada"}
        />
      </div>

      {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar evento"}
      </Button>
    </form>
  );
}

function FormularioAbono({ expedienteId }: { expedienteId: string }) {
  const [estado, formAction, pending] = useActionState(registrarAbonoEmbargo, ESTADO_INICIAL);
  useRefrescarAlExito(estado.ok);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="expediente_id" value={expedienteId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="monto">Monto del abono (B/.)</Label>
        <Input id="monto" name="monto" type="number" step="0.01" min="0.01" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fecha">Fecha del abono</Label>
        <Input id="fecha" name="fecha" type="date" defaultValue={hoyISO()} required />
      </div>
      {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar abono"}
      </Button>
    </form>
  );
}
