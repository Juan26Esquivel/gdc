"use client";

import { useActionState } from "react";
import { avanzarFase, type EstadoAvanzarFase } from "./actions";
import { esFaseDeAudiencia, esFaseDeNotificacion } from "@/lib/fases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ESTADO_INICIAL: EstadoAvanzarFase = {};

export type VentanaSugerida = { desde: string; hasta: string; ancla: string };

export function AvanzarFaseForm({
  expedienteId,
  proximaFase,
  ventanaSugerida,
}: {
  expedienteId: string;
  proximaFase: { nombre: string } | null;
  /** Ventana legal de la audiencia preliminar, ya calculada en días hábiles
   *  desde el vencimiento del término de contestación. Solo se pasa cuando la
   *  próxima fase es una audiencia y hay datos suficientes para calcularla. */
  ventanaSugerida?: VentanaSugerida | null;
}) {
  const [estado, formAction, pending] = useActionState(avanzarFase, ESTADO_INICIAL);

  if (!proximaFase) return null;

  const pideFechaNotificacion = esFaseDeNotificacion(proximaFase.nombre);
  const pideFechaAudiencia = esFaseDeAudiencia(proximaFase.nombre);

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="expediente_id" value={expedienteId} />
        {pideFechaNotificacion && (
          <Input
            type="date"
            name="fecha_notificacion_demanda"
            required
            className="h-8 w-36"
            title="Fecha real de la notificación"
          />
        )}
        {pideFechaAudiencia && (
          <Input
            type="date"
            name="fecha_audiencia"
            required
            className="h-8 w-36"
            min={ventanaSugerida?.desde}
            max={ventanaSugerida?.hasta}
            title={
              ventanaSugerida
                ? `Ventana legal: ${ventanaSugerida.desde} a ${ventanaSugerida.hasta}`
                : "Fecha programada de la audiencia"
            }
          />
        )}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "..." : `Avanzar a ${proximaFase.nombre}`}
        </Button>
      </form>

      {pideFechaAudiencia && ventanaSugerida && (
        <p className="text-[10px] text-muted-foreground">
          Puede celebrarse entre {ventanaSugerida.desde} y {ventanaSugerida.hasta} (días hábiles
          desde el vencimiento del término de contestación, {ventanaSugerida.ancla})
        </p>
      )}
      {pideFechaAudiencia && !ventanaSugerida && (
        <p className="text-[10px] text-muted-foreground">
          Sin ventana calculable: falta la fecha de notificación o los plazos del subtipo
        </p>
      )}
      {estado.error && <p className="text-xs text-destructive">{estado.error}</p>}
      {estado.advertencia && <p className="text-xs text-amber-700">{estado.advertencia}</p>}
    </div>
  );
}
