"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TablePagination } from "@/components/table-pagination";
import { usePaginacion } from "@/hooks/use-paginacion";
import type { Json } from "@/lib/supabase/database.types";

type Registro = {
  id: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: Json;
  created_at: string;
  usuario_id: string;
  usuarios: { nombre_completo: string } | null;
};

const POR_PAGINA = 10;

export function AuditoriaTabla({ registros }: { registros: Registro[] }) {
  const [seleccionado, setSeleccionado] = useState<Registro | null>(null);
  const { pagina, totalPaginas, setPagina, inicio, fin } = usePaginacion(
    registros.length,
    POR_PAGINA,
  );
  const registrosPagina = registros.slice(inicio, fin);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Entidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrosPagina.map((r) => (
            <TableRow key={r.id} onClick={() => setSeleccionado(r)} className="cursor-pointer">
              <TableCell className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString("es-PA")}
              </TableCell>
              <TableCell>{r.usuarios?.nombre_completo ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{r.accion}</TableCell>
              <TableCell className="text-xs uppercase text-muted-foreground">{r.entidad}</TableCell>
            </TableRow>
          ))}
          {registros.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                Sin registros de auditoría todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={setPagina}
        total={registros.length}
        porPagina={POR_PAGINA}
      />

      <Sheet open={seleccionado !== null} onOpenChange={(open) => !open && setSeleccionado(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Detalle del registro</SheetTitle>
            <SheetDescription>
              {seleccionado?.accion} · {seleccionado?.entidad}
            </SheetDescription>
          </SheetHeader>
          {seleccionado && (
            <div className="flex flex-col gap-3 p-4 pt-0 text-sm">
              <p>
                <span className="font-medium">Usuario:</span>{" "}
                {seleccionado.usuarios?.nombre_completo ?? "—"}
              </p>
              <p>
                <span className="font-medium">Fecha:</span>{" "}
                {new Date(seleccionado.created_at).toLocaleString("es-PA")}
              </p>
              <p>
                <span className="font-medium">Entidad:</span> {seleccionado.entidad}
                {seleccionado.entidad_id ? ` (${seleccionado.entidad_id})` : ""}
              </p>
              <div>
                <p className="mb-1 font-medium">Detalle</p>
                <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
                  {seleccionado.detalle ? JSON.stringify(seleccionado.detalle, null, 2) : "—"}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
