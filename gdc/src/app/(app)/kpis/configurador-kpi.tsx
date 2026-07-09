"use client";

import { useActionState, useEffect, useState } from "react";
import { crearKpi, editarKpi, type EstadoKpi } from "./actions";
import { ENTIDAD_BASE_LABEL, METRICA_LABEL, type EntidadBaseKpi, type MetricaKpi } from "@/lib/kpis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { alternarActivoKpi } from "./actions";

export type KpiEditable = {
  id: string;
  nombre: string;
  descripcion: string | null;
  entidad_base: EntidadBaseKpi;
  metrica: MetricaKpi;
  activo: boolean;
  umbral_optimo: number | null;
  umbral_alerta: number | null;
  umbral_critico: number | null;
};

const ESTADO_INICIAL: EstadoKpi = {};

export function ConfiguradorKpi({
  kpiEditar,
  onGuardado,
  onCancelar,
}: {
  kpiEditar: KpiEditable | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const modoEdicion = kpiEditar !== null;
  const accion = modoEdicion ? editarKpi : crearKpi;
  const [estado, formAction, pending] = useActionState(accion, ESTADO_INICIAL);
  const [entidadBase, setEntidadBase] = useState<string>(kpiEditar?.entidad_base ?? "expediente");
  const [metrica, setMetrica] = useState<string>(kpiEditar?.metrica ?? "conteo");
  const [activo, setActivo] = useState(kpiEditar?.activo ?? true);

  // onGuardado actualiza el estado del componente padre (KpisPanel): no puede
  // invocarse durante el render de este componente (dispara "Cannot update a
  // component while rendering a different component"), por eso va en un
  // useEffect en vez del patrón de "derivar estado durante el render" que
  // usan los diálogos que solo tocan su propio estado local.
  useEffect(() => {
    if (estado.ok) onGuardado();
  }, [estado.ok, onGuardado]);

  async function alConfirmarEstado(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    if (modoEdicion) await alternarActivoKpi(kpiEditar.id, nuevoActivo);
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border shadow-md">
      <div className="bg-primary p-6 text-primary-foreground">
        <h3 className="text-lg font-semibold">
          {modoEdicion ? "Editar KPI" : "Configurador de KPI"}
        </h3>
        <p className="mt-1 text-xs text-primary-foreground/70">
          {modoEdicion
            ? "Actualiza el indicador seleccionado del catálogo."
            : "Cree un nuevo indicador personalizado para el dashboard judicial."}
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4 p-6" key={kpiEditar?.id ?? "nuevo"}>
        {modoEdicion && <input type="hidden" name="id" value={kpiEditar.id} />}
        <div className="flex flex-col gap-1">
          <Label htmlFor="nombre" className="text-xs font-bold uppercase tracking-wide">
            Nombre del indicador
          </Label>
          <Input
            id="nombre"
            name="nombre"
            required
            defaultValue={kpiEditar?.nombre}
            placeholder="Ej. Tasa de admisión mensual"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="descripcion" className="text-xs font-bold uppercase tracking-wide">
            Descripción del propósito
          </Label>
          <Textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            defaultValue={kpiEditar?.descripcion ?? ""}
            placeholder="Defina qué mide este KPI y por qué es relevante..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-bold uppercase tracking-wide">Entidad base</Label>
            <input type="hidden" name="entidad_base" value={entidadBase} />
            <Select value={entidadBase} onValueChange={(v) => v && setEntidadBase(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Entidad">
                  {(value: string | null) =>
                    ENTIDAD_BASE_LABEL[(value ?? "expediente") as EntidadBaseKpi]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ENTIDAD_BASE_LABEL).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-bold uppercase tracking-wide">Métrica</Label>
            <input type="hidden" name="metrica" value={metrica} />
            <Select value={metrica} onValueChange={(v) => v && setMetrica(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Métrica">
                  {(value: string | null) => METRICA_LABEL[(value ?? "conteo") as MetricaKpi]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRICA_LABEL).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-bold uppercase tracking-wide">
            Umbrales de rendimiento (%)
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Solo aplican a KPIs de métrica &quot;Porcentaje de cumplimiento&quot;.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-bold text-status-confirmed">Óptimo</span>
              <Input
                type="number"
                name="umbral_optimo"
                defaultValue={kpiEditar?.umbral_optimo ?? 90}
                className="text-xs"
              />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-bold text-status-correction">Alerta</span>
              <Input
                type="number"
                name="umbral_alerta"
                defaultValue={kpiEditar?.umbral_alerta ?? 70}
                className="text-xs"
              />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-bold text-destructive">Crítico</span>
              <Input
                type="number"
                name="umbral_critico"
                defaultValue={kpiEditar?.umbral_critico ?? 50}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-semibold">Estado del KPI</span>
          <Switch checked={activo} onCheckedChange={alConfirmarEstado} disabled={pending} />
        </div>
        {!modoEdicion && <input type="hidden" name="activo" value={activo ? "true" : "false"} />}

        {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}

        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : modoEdicion ? "Guardar cambios" : "Guardar y sincronizar"}
          </Button>
          {modoEdicion && (
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar edición
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
