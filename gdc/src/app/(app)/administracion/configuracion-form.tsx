"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actualizarConfiguracionSistema, type EstadoAdministracion } from "./actions";

type Configuracion = {
  tope_cuantia: number;
  modo_validacion_cuantia: string;
  plazo_admision_dias: number;
  umbral_inactividad_dias: number;
  plazo_excepcion_ejecutivo_dias: number;
  plazo_embargo_ejecutivo_dias: number;
} | null;

const ESTADO_INICIAL: EstadoAdministracion = {};
const MODO_LABEL: Record<string, string> = { bloquear: "Bloquear", alertar: "Solo alertar" };

export function ConfiguracionForm({ configuracion }: { configuracion: Configuracion }) {
  const [estado, formAction, pending] = useActionState(actualizarConfiguracionSistema, ESTADO_INICIAL);
  const [modo, setModo] = useState(configuracion?.modo_validacion_cuantia ?? "bloquear");

  if (!configuracion) {
    return <p className="text-sm text-muted-foreground">No se pudo cargar la configuración.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 md:max-w-lg">
      <div className="flex flex-col gap-1">
        <Label htmlFor="tope_cuantia">Tope de cuantía (Art. 14/52, B/.)</Label>
        <Input
          id="tope_cuantia"
          name="tope_cuantia"
          type="number"
          step="0.01"
          defaultValue={configuracion.tope_cuantia}
          required
        />
        <p className="text-xs text-muted-foreground">
          No aplica cuando el expediente está marcado como lanzamiento (RF-34).
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="modo_validacion_cuantia">Modo de validación</Label>
        <input type="hidden" name="modo_validacion_cuantia" value={modo} />
        <Select value={modo} onValueChange={(v) => v && setModo(v)}>
          <SelectTrigger id="modo_validacion_cuantia" className="w-full">
            <SelectValue placeholder="Modo">
              {(value: string | null) => MODO_LABEL[value ?? "bloquear"]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bloquear">Bloquear</SelectItem>
            <SelectItem value="alertar">Solo alertar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="plazo_admision_dias">
          Plazo de admisión (Art. 395, días hábiles)
        </Label>
        <Input
          id="plazo_admision_dias"
          name="plazo_admision_dias"
          type="number"
          defaultValue={configuracion.plazo_admision_dias}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="umbral_inactividad_dias">Umbral de inactividad (días sin movimiento)</Label>
        <Input
          id="umbral_inactividad_dias"
          name="umbral_inactividad_dias"
          type="number"
          defaultValue={configuracion.umbral_inactividad_dias}
          required
        />
        <p className="text-xs text-muted-foreground">
          Aplica a todos los tipos de proceso; un expediente puntual puede omitirlo con
          justificación (Panel del Juez).
        </p>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Procesos ejecutivos
      </p>

      <div className="flex flex-col gap-1">
        <Label htmlFor="plazo_excepcion_ejecutivo_dias">
          Término de excepción (días hábiles desde la notificación)
        </Label>
        <Input
          id="plazo_excepcion_ejecutivo_dias"
          name="plazo_excepcion_ejecutivo_dias"
          type="number"
          defaultValue={configuracion.plazo_excepcion_ejecutivo_dias}
          required
        />
        <p className="text-xs text-muted-foreground">
          Vencido este término, el expediente aparece en el Panel del Juez como apto para decretar
          el embargo.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="plazo_embargo_ejecutivo_dias">
          Límite para decretar el embargo (días hábiles desde la notificación)
        </Label>
        <Input
          id="plazo_embargo_ejecutivo_dias"
          name="plazo_embargo_ejecutivo_dias"
          type="number"
          defaultValue={configuracion.plazo_embargo_ejecutivo_dias}
          required
        />
        <p className="text-xs text-muted-foreground">
          Debe ser mayor que el término de excepción. Pasado este día, la alerta se marca en rojo.
        </p>
      </div>

      {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-status-confirmed">Configuración actualizada.</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Guardando…" : "Guardar configuración"}
      </Button>
    </form>
  );
}
