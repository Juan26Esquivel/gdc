"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AvatarIniciales } from "@/components/avatar-iniciales";
import { RolBadge } from "@/components/rol-badge";
import type { RolGdc } from "@/lib/auth/current-user";

export function DetalleUsuarioSheet({
  usuario,
  open,
  onOpenChange,
}: {
  usuario: { nombre_completo: string; rol: RolGdc; activo: boolean } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Detalles del Usuario</SheetTitle>
          <SheetDescription>Información de la cuenta y rol asignado</SheetDescription>
        </SheetHeader>
        {usuario && (
          <div className="flex flex-col gap-4 p-4 pt-0">
            <div className="flex items-center gap-3">
              <AvatarIniciales nombreCompleto={usuario.nombre_completo} className="size-14 text-base" />
              <div>
                <p className="font-heading text-lg font-semibold">{usuario.nombre_completo}</p>
                <RolBadge rol={usuario.rol} />
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
              <p className="font-medium">Estado</p>
              <p className="text-muted-foreground">{usuario.activo ? "Activo" : "Desactivado"}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Editar rol, desactivar o restablecer la cuenta estarán disponibles próximamente.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
