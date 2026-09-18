"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Barra "Anterior · Página X de Y · Siguiente" para tablas paginadas en
 * cliente (ver use-paginacion.ts). No se muestra si todo cabe en una sola
 * página.
 */
export function TablePagination({
  pagina,
  totalPaginas,
  onCambiar,
  total,
  porPagina,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  total: number;
  porPagina: number;
}) {
  if (totalPaginas <= 1) return null;

  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-2 border-t border-border px-2 pt-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiar(pagina + 1)}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
