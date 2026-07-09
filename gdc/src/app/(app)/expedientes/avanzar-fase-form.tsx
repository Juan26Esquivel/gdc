"use client";

import { useActionState } from "react";
import { avanzarFase, type EstadoAvanzarFase } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FASE_LABEL, siguienteFase, type FaseExpediente } from "@/lib/fases";

const ESTADO_INICIAL: EstadoAvanzarFase = {};

export function AvanzarFaseForm({
  expedienteId,
  faseActual,
}: {
  expedienteId: string;
  faseActual: FaseExpediente;
}) {
  const [estado, formAction, pending] = useActionState(avanzarFase, ESTADO_INICIAL);
  const proxima = siguienteFase(faseActual);

  if (!proxima) return null;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="expediente_id" value={expedienteId} />
      {proxima === "notificacion_demanda" && (
        <Input
          type="date"
          name="fecha_notificacion_demanda"
          required
          className="h-8 w-36"
        />
      )}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : `Avanzar a ${FASE_LABEL[proxima]}`}
      </Button>
      {estado.error && <p className="text-xs text-destructive">{estado.error}</p>}
    </form>
  );
}
