"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "@/components/estado-badge";
import { TablePagination } from "@/components/table-pagination";
import { usePaginacion } from "@/hooks/use-paginacion";
import type { Enums } from "@/lib/supabase/database.types";

type Documento = {
  id: string;
  estado: Enums<"estado_documento">;
  expedientes: { id: string; numero_expediente: string } | null;
  tipos_documento: { nombre: string } | null;
  generado_por_usuario: { nombre_completo: string } | null;
  confirmado_por_usuario: { nombre_completo: string } | null;
};

const POR_PAGINA = 10;

export function DocumentosTabla({ documentos }: { documentos: Documento[] }) {
  const { pagina, totalPaginas, setPagina, inicio, fin } = usePaginacion(
    documentos.length,
    POR_PAGINA,
  );
  const documentosPagina = documentos.slice(inicio, fin);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expediente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Generado por</TableHead>
            <TableHead>Confirmado por</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentosPagina.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.expedientes?.numero_expediente}</TableCell>
              <TableCell>{doc.tipos_documento?.nombre}</TableCell>
              <TableCell>
                <EstadoBadge estado={doc.estado} />
              </TableCell>
              <TableCell>{doc.generado_por_usuario?.nombre_completo}</TableCell>
              <TableCell>{doc.confirmado_por_usuario?.nombre_completo ?? "—"}</TableCell>
              <TableCell>
                {doc.expedientes?.id && (
                  <Link
                    href={`/expedientes/${doc.expedientes.id}/documentos`}
                    className="text-sm underline"
                  >
                    Ver expediente
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
          {documentosPagina.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Sin documentos generados todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={setPagina}
        total={documentos.length}
        porPagina={POR_PAGINA}
      />
    </>
  );
}
