"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { eliminarExpediente } from "./actions";

export function EliminarExpedienteBoton({
  expedienteId,
  numeroExpediente,
}: {
  expedienteId: string;
  numeroExpediente: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    setEliminando(true);
    setError(null);
    const resultado = await eliminarExpediente(expedienteId);
    setEliminando(false);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    setOpen(false);
    setConfirmacion("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setConfirmacion("");
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Eliminar expediente" />}>
        <Trash2 className="size-4 text-destructive" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar expediente {numeroExpediente}</DialogTitle>
          <DialogDescription>
            Esta acción es irreversible: se eliminan también sus fases, asignaciones, audiencias y
            documentos asociados. Cada eliminación queda registrada en el módulo de Auditoría.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 px-4 pb-2">
          <p className="text-sm">
            Escribe <span className="font-mono font-semibold">{numeroExpediente}</span> para
            confirmar.
          </p>
          <Input value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={confirmacion !== numeroExpediente || eliminando}
            onClick={confirmar}
          >
            {eliminando ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
