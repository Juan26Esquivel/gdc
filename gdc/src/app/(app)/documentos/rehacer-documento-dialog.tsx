"use client";

import { useActionState, useState } from "react";
import { rehacerDocumento, type EstadoGenerarDocumento } from "./actions";
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

const ESTADO_INICIAL: EstadoGenerarDocumento = {};

export function RehacerDocumentoDialog({
  documentoId,
  contenidoActual,
  observaciones,
}: {
  documentoId: string;
  contenidoActual: string;
  observaciones: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [estado, formAction, pending] = useActionState(rehacerDocumento, ESTADO_INICIAL);

  const [manejado, setManejado] = useState(estado);
  if (estado !== manejado) {
    setManejado(estado);
    if (estado.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Rehacer</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rehacer documento</DialogTitle>
        </DialogHeader>
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Observaciones del Juez:</p>
          <p>{observaciones}</p>
        </div>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="documento_id" value={documentoId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="contenido_texto">Contenido corregido</Label>
            <Textarea
              id="contenido_texto"
              name="contenido_texto"
              rows={8}
              defaultValue={contenidoActual}
              required
            />
          </div>
          {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Reenviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
