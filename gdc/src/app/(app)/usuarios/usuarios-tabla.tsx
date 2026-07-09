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
import { DetalleUsuarioSheet } from "./detalle-usuario-sheet";
import type { RolGdc } from "@/lib/auth/current-user";

type Usuario = {
  id: string;
  nombre_completo: string;
  rol: RolGdc;
  activo: boolean;
};

export function UsuariosTabla({ usuarios }: { usuarios: Usuario[] }) {
  const [seleccionado, setSeleccionado] = useState<Usuario | null>(null);

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
          {usuarios.map((u) => (
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
      <DetalleUsuarioSheet
        usuario={seleccionado}
        open={seleccionado !== null}
        onOpenChange={(open) => {
          if (!open) setSeleccionado(null);
        }}
      />
    </>
  );
}
