"use client";

import { useActionState, useState } from "react";
import { generarDocumento, type EstadoGenerarDocumento } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Expediente = { id: string; numero_expediente: string };
type TipoDocumento = { id: number; nombre: string };

const ESTADO_INICIAL: EstadoGenerarDocumento = {};

export function GenerarDocumentoDialog({
  expedientes,
  tiposDocumento,
}: {
  expedientes: Expediente[];
  tiposDocumento: TipoDocumento[];
}) {
  const [open, setOpen] = useState(false);
  const [expedienteId, setExpedienteId] = useState("");
  const [tipoDocumentoId, setTipoDocumentoId] = useState("");
  const [estado, formAction, pending] = useActionState(generarDocumento, ESTADO_INICIAL);

  const [estadoManejado, setEstadoManejado] = useState(estado);
  if (estado !== estadoManejado) {
    setEstadoManejado(estado);
    if (estado.ok) {
      setOpen(false);
      setExpedienteId("");
      setTipoDocumentoId("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Generar documento</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar documento</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="expediente_id">Expediente</Label>
            <input type="hidden" name="expediente_id" value={expedienteId} />
            <Select value={expedienteId} onValueChange={(v) => setExpedienteId(v ?? "")}>
              <SelectTrigger id="expediente_id" className="w-full">
                <SelectValue placeholder="Selecciona un expediente">
                  {(value: string | null) =>
                    expedientes.find((e) => e.id === value)?.numero_expediente ?? null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {expedientes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.numero_expediente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo_documento_id">Tipo de documento</Label>
            <input type="hidden" name="tipo_documento_id" value={tipoDocumentoId} />
            <Select value={tipoDocumentoId} onValueChange={(v) => setTipoDocumentoId(v ?? "")}>
              <SelectTrigger id="tipo_documento_id" className="w-full">
                <SelectValue placeholder="Selecciona un tipo">
                  {(value: string | null) =>
                    tiposDocumento.find((t) => String(t.id) === value)?.nombre ?? null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tiposDocumento.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contenido_texto">Contenido</Label>
            <Textarea id="contenido_texto" name="contenido_texto" rows={8} required />
          </div>
          {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !expedienteId || !tipoDocumentoId}>
              {pending ? "Generando…" : "Generar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
