"use client";

import { useActionState } from "react";
import { avanzarFase, type EstadoAvanzarFase } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ESTADO_INICIAL: EstadoAvanzarFase = {};

export function AvanzarFaseForm({
  expedienteId,
  proximaFase,
}: {
  expedienteId: string;
  proximaFase: { nombre: string } | null;
}) {
  const [estado, formAction, pending] = useActionState(avanzarFase, ESTADO_INICIAL);

  if (!proximaFase) return null;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="expediente_id" value={expedienteId} />
      {proximaFase.nombre === "Notificación de la demanda" && (
        <Input
          type="date"
          name="fecha_notificacion_demanda"
          required
          className="h-8 w-36"
        />
      )}
      {(proximaFase.nombre === "Audiencia preliminar" || proximaFase.nombre === "Audiencia de fondo") && (
        <Input type="date" name="fecha_audiencia" required className="h-8 w-36" />
      )}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : `Avanzar a ${proximaFase.nombre}`}
      </Button>
      {estado.error && <p className="text-xs text-destructive">{estado.error}</p>}
    </form>
  );
}
