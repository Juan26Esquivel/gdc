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
import { AvatarIniciales } from "@/components/avatar-iniciales";
import { RolBadge } from "@/components/rol-badge";
import { TablePagination } from "@/components/table-pagination";
import { usePaginacion } from "@/hooks/use-paginacion";
import { DetalleUsuarioSheet } from "./detalle-usuario-sheet";
import type { RolGdc } from "@/lib/auth/current-user";

const POR_PAGINA = 10;

type Usuario = {
  id: string;
  auth_user_id: string;
  nombre_completo: string;
  rol: RolGdc;
  activo: boolean;
};

export function UsuariosTabla({
  usuarios,
  usuarioActualId,
}: {
  usuarios: Usuario[];
  usuarioActualId: string;
}) {
  const [seleccionado, setSeleccionado] = useState<Usuario | null>(null);
  const { pagina, totalPaginas, setPagina, inicio, fin } = usePaginacion(
    usuarios.length,
    POR_PAGINA,
  );
  const usuariosPagina = usuarios.slice(inicio, fin);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuariosPagina.map((u) => (
            <TableRow
              key={u.id}
              onClick={() => setSeleccionado(u)}
              className="cursor-pointer"
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <AvatarIniciales nombreCompleto={u.nombre_completo} />
                  {u.nombre_completo}
                </div>
              </TableCell>
              <TableCell>
                <RolBadge rol={u.rol} />
              </TableCell>
              <TableCell>{u.activo ? "Activo" : "Desactivado"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={setPagina}
        total={usuarios.length}
        porPagina={POR_PAGINA}
      />
      <DetalleUsuarioSheet
        usuario={seleccionado}
        esCuentaPropia={seleccionado?.id === usuarioActualId}
        open={seleccionado !== null}
        onOpenChange={(open) => {
          if (!open) setSeleccionado(null);
        }}
      />
    </>
  );
}
