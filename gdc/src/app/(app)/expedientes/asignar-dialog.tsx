"use client";

import { useActionState, useState } from "react";
import { asignarExpediente, type EstadoAsignarExpediente } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Asistente = { id: string; nombre_completo: string };

const ESTADO_INICIAL: EstadoAsignarExpediente = {};

export function AsignarDialog({
  expedienteId,
  asistentes,
  asignadoActualId,
  asignadoActualNombre,
}: {
  expedienteId: string;
  asistentes: Asistente[];
  asignadoActualId: string | null;
  asignadoActualNombre: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [asistenteId, setAsistenteId] = useState(asignadoActualId ?? "");
  const [estado, formAction, pending] = useActionState(asignarExpediente, ESTADO_INICIAL);

  const [estadoManejado, setEstadoManejado] = useState(estado);
  if (estado !== estadoManejado) {
    setEstadoManejado(estado);
    if (estado.ok) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {asignadoActualNombre ?? "Sin asignar"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar expediente</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="expediente_id" value={expedienteId} />
          <input type="hidden" name="asistente_id" value={asistenteId} />
          <Select value={asistenteId} onValueChange={(v) => setAsistenteId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un Asistente">
                {(value: string | null) =>
                  asistentes.find((a) => a.id === value)?.nombre_completo ?? null
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {asistentes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nombre_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !asistenteId}>
              {pending ? "Asignando…" : "Asignar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
