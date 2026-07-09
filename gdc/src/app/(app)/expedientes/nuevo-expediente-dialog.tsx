"use client";

import { useActionState, useMemo, useState } from "react";
import { crearExpediente, type EstadoCrearExpediente } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type Catalogo = { id: number; nombre: string };
type Subtipo = { id: number; tipo_proceso_id: number; nombre: string };

const ESTADO_INICIAL: EstadoCrearExpediente = {};

export function NuevoExpedienteDialog({
  tiposProceso,
  subtiposProceso,
}: {
  tiposProceso: Catalogo[];
  subtiposProceso: Subtipo[];
}) {
  const [open, setOpen] = useState(false);
  const [tipoProcesoId, setTipoProcesoId] = useState("");
  const [subtipoProcesoId, setSubtipoProcesoId] = useState("");
  const [esLanzamiento, setEsLanzamiento] = useState(false);
  const [estado, formAction, pending] = useActionState(crearExpediente, ESTADO_INICIAL);

  const subtiposDisponibles = useMemo(
    () => subtiposProceso.filter((s) => s.tipo_proceso_id === Number(tipoProcesoId)),
    [subtiposProceso, tipoProcesoId],
  );

  const [estadoManejado, setEstadoManejado] = useState(estado);
  if (estado !== estadoManejado) {
    setEstadoManejado(estado);
    if (estado.ok) {
      setOpen(false);
      setTipoProcesoId("");
      setSubtipoProcesoId("");
      setEsLanzamiento(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nuevo expediente</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear expediente</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero_expediente">Número de expediente</Label>
            <Input id="numero_expediente" name="numero_expediente" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo_proceso_id">Tipo de proceso</Label>
            <input type="hidden" name="tipo_proceso_id" value={tipoProcesoId} />
            <Select
              value={tipoProcesoId}
              onValueChange={(value) => {
                setTipoProcesoId(value ?? "");
                setSubtipoProcesoId("");
              }}
            >
              <SelectTrigger id="tipo_proceso_id" className="w-full">
                <SelectValue placeholder="Selecciona un tipo de proceso">
                  {(value: string | null) =>
                    tiposProceso.find((t) => String(t.id) === value)?.nombre ?? null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tiposProceso.map((tipo) => (
                  <SelectItem key={tipo.id} value={String(tipo.id)}>
                    {tipo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {subtiposDisponibles.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="subtipo_proceso_id">Subtipo</Label>
              <input type="hidden" name="subtipo_proceso_id" value={subtipoProcesoId} />
              <Select value={subtipoProcesoId} onValueChange={(v) => setSubtipoProcesoId(v ?? "")}>
                <SelectTrigger id="subtipo_proceso_id" className="w-full">
                  <SelectValue placeholder="Selecciona un subtipo">
                    {(value: string | null) =>
                      subtiposDisponibles.find((s) => String(s.id) === value)?.nombre ?? null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subtiposDisponibles.map((subtipo) => (
                    <SelectItem key={subtipo.id} value={String(subtipo.id)}>
                      {subtipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="cuantia">Cuantía (B/.)</Label>
            <Input
              id="cuantia"
              name="cuantia"
              type="number"
              step="0.01"
              min="0"
              disabled={esLanzamiento}
              placeholder="Déjalo vacío si es indeterminada"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="hidden" name="es_lanzamiento" value={esLanzamiento ? "on" : ""} />
            <Checkbox
              id="es_lanzamiento"
              checked={esLanzamiento}
              onCheckedChange={(checked) => setEsLanzamiento(checked === true)}
            />
            <Label htmlFor="es_lanzamiento">Es un lanzamiento (sin tope de cuantía)</Label>
          </div>
          {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
          {estado.advertencia && <p className="text-sm text-amber-600">{estado.advertencia}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !tipoProcesoId}>
              {pending ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
