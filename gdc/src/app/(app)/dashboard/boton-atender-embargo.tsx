"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { confirmarEmbargoDecretado, type EstadoAtenderEmbargo } from "./actions";

const ESTADO_INICIAL: EstadoAtenderEmbargo = {};

export function BotonAtenderEmbargo({ expedienteId }: { expedienteId: string }) {
  const [estado, formAction, pending] = useActionState(confirmarEmbargoDecretado, ESTADO_INICIAL);

  // Tras confirmar, la página se revalida y el expediente sale de la lista, así
  // que el estado de éxito casi no se alcanza a ver; el mensaje está por si la
  // revalidación tarda.
  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="expediente_id" value={expedienteId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : "Ya se decretó"}
      </Button>
      {estado.error && <p className="mt-1 text-xs text-destructive">{estado.error}</p>}
      {estado.ok && <p className="mt-1 text-xs text-status-confirmed">Confirmado.</p>}
    </form>
  );
}
