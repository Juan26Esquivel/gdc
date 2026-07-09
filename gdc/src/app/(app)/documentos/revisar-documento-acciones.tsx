"use client";

import { useActionState, useState } from "react";
import { confirmarDocumento, dejarObservaciones, type EstadoRevisarDocumento } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ESTADO_INICIAL: EstadoRevisarDocumento = {};

export function RevisarDocumentoAcciones({ documentoId }: { documentoId: string }) {
  const [open, setOpen] = useState(false);
  const [estadoConfirmar, confirmarAction, pendingConfirmar] = useActionState(
    confirmarDocumento,
    ESTADO_INICIAL,
  );
  const [estadoObservar, observarAction, pendingObservar] = useActionState(
    dejarObservaciones,
    ESTADO_INICIAL,
  );

  const [manejado, setManejado] = useState(estadoObservar);
  if (estadoObservar !== manejado) {
    setManejado(estadoObservar);
    if (estadoObservar.ok) setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <form action={confirmarAction}>
        <input type="hidden" name="documento_id" value={documentoId} />
        <Button type="submit" size="sm" disabled={pendingConfirmar}>
          {pendingConfirmar ? "..." : "Confirmar"}
        </Button>
      </form>
      {estadoConfirmar.error && (
        <p className="text-xs text-destructive">{estadoConfirmar.error}</p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          Dejar observaciones
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observaciones para el Asistente</DialogTitle>
          </DialogHeader>
          <form action={observarAction} className="flex flex-col gap-4">
            <input type="hidden" name="documento_id" value={documentoId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="observaciones_juez">Observaciones</Label>
              <Textarea id="observaciones_juez" name="observaciones_juez" rows={5} required />
            </div>
            {estadoObservar.error && (
              <p className="text-sm text-destructive">{estadoObservar.error}</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pendingObservar}>
                {pendingObservar ? "Enviando…" : "Enviar a corrección"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
