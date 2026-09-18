"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TablePagination } from "@/components/table-pagination";
import { usePaginacion } from "@/hooks/use-paginacion";
import { actualizarPlazosSubtipo, type EstadoAdministracion } from "./actions";

const POR_PAGINA = 10;

type TipoProceso = { id: number; nombre: string; base_legal: string | null };
type SubtipoProceso = {
  id: number;
  tipo_proceso_id: number;
  nombre: string;
  plazo_contestacion_dias: number | null;
  plazo_audiencia_min_dias: number | null;
  plazo_audiencia_max_dias: number | null;
  plazo_audiencia_fondo_min_dias: number | null;
  plazo_audiencia_fondo_max_dias: number | null;
  base_legal: string | null;
};

const ESTADO_INICIAL: EstadoAdministracion = {};

function rangoODash(min: number | null, max: number | null) {
  if (min === null && max === null) return "—";
  return `${min ?? "?"}–${max ?? "?"} días`;
}

export function CatalogoProcesos({
  tiposProceso,
  subtiposProceso,
}: {
  tiposProceso: TipoProceso[];
  subtiposProceso: SubtipoProceso[];
}) {
  const [editando, setEditando] = useState<SubtipoProceso | null>(null);
  const { pagina, totalPaginas, setPagina, inicio, fin } = usePaginacion(
    subtiposProceso.length,
    POR_PAGINA,
  );
  const subtiposPagina = subtiposProceso.slice(inicio, fin);

  const nombreTipo = (tipoId: number) =>
    tiposProceso.find((t) => t.id === tipoId)?.nombre ?? "?";

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo de proceso</TableHead>
            <TableHead>Subtipo</TableHead>
            <TableHead>Contestación</TableHead>
            <TableHead>Audiencia preliminar</TableHead>
            <TableHead>Audiencia de fondo</TableHead>
            <TableHead>Base legal</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subtiposPagina.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{nombreTipo(s.tipo_proceso_id)}</TableCell>
              <TableCell className="font-medium">{s.nombre}</TableCell>
              <TableCell>
                {s.plazo_contestacion_dias === null ? "—" : `${s.plazo_contestacion_dias} días`}
              </TableCell>
              <TableCell>
                {rangoODash(s.plazo_audiencia_min_dias, s.plazo_audiencia_max_dias)}
              </TableCell>
              <TableCell>
                {rangoODash(s.plazo_audiencia_fondo_min_dias, s.plazo_audiencia_fondo_max_dias)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {s.base_legal ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => setEditando(s)}>
                  <Pencil className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {subtiposProceso.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Sin subtipos configurados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={setPagina}
        total={subtiposProceso.length}
        porPagina={POR_PAGINA}
      />

      <Sheet open={editando !== null} onOpenChange={(open) => !open && setEditando(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar plazos — {editando?.nombre}</SheetTitle>
            <SheetDescription>
              {editando ? nombreTipo(editando.tipo_proceso_id) : ""}
              {editando?.base_legal ? ` · ${editando.base_legal}` : ""}
            </SheetDescription>
          </SheetHeader>
          {editando && <FormularioPlazos subtipo={editando} onGuardado={() => setEditando(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FormularioPlazos({
  subtipo,
  onGuardado,
}: {
  subtipo: SubtipoProceso;
  onGuardado: () => void;
}) {
  const [estado, formAction, pending] = useActionState(actualizarPlazosSubtipo, ESTADO_INICIAL);

  // onGuardado actualiza el estado del componente padre (cierra el panel): no
  // puede invocarse durante el render, por eso va en un useEffect (mismo
  // patrón usado en kpis/configurador-kpi.tsx).
  useEffect(() => {
    if (estado.ok) onGuardado();
  }, [estado.ok, onGuardado]);

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4 pt-0">
      <input type="hidden" name="id" value={subtipo.id} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="plazo_contestacion_dias">Término de contestación (días hábiles)</Label>
        <Input
          id="plazo_contestacion_dias"
          name="plazo_contestacion_dias"
          type="number"
          defaultValue={subtipo.plazo_contestacion_dias ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          La ventana de la audiencia preliminar se cuenta desde que VENCE este término, no desde la
          notificación. Sin este dato no hay ventana calculable.
        </p>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Audiencia preliminar (días hábiles desde el vencimiento de la contestación)
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="plazo_audiencia_min_dias">Mínimo (días)</Label>
          <Input
            id="plazo_audiencia_min_dias"
            name="plazo_audiencia_min_dias"
            type="number"
            defaultValue={subtipo.plazo_audiencia_min_dias ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="plazo_audiencia_max_dias">Máximo (días)</Label>
          <Input
            id="plazo_audiencia_max_dias"
            name="plazo_audiencia_max_dias"
            type="number"
            defaultValue={subtipo.plazo_audiencia_max_dias ?? ""}
          />
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Audiencia de fondo (días hábiles desde la preliminar)
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="plazo_audiencia_fondo_min_dias">Mínimo (días)</Label>
          <Input
            id="plazo_audiencia_fondo_min_dias"
            name="plazo_audiencia_fondo_min_dias"
            type="number"
            defaultValue={subtipo.plazo_audiencia_fondo_min_dias ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="plazo_audiencia_fondo_max_dias">Máximo (días)</Label>
          <Input
            id="plazo_audiencia_fondo_max_dias"
            name="plazo_audiencia_fondo_max_dias"
            type="number"
            defaultValue={subtipo.plazo_audiencia_fondo_max_dias ?? ""}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Deja un campo vacío si ese plazo no está confirmado todavía (ver Decisiones Abiertas en
        REQUERIMIENTOS_GDC.md).
      </p>

      {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
