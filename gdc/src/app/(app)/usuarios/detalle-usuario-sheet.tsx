"use client";

import { useActionState, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AvatarIniciales } from "@/components/avatar-iniciales";
import { RolBadge } from "@/components/rol-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROL_LABEL } from "@/lib/roles";
import type { RolGdc } from "@/lib/auth/current-user";
import {
  actualizarUsuario,
  alternarActivoUsuario,
  restablecerContrasenaUsuario,
  type EstadoCrearUsuario,
} from "./actions";

type Usuario = {
  id: string;
  auth_user_id: string;
  nombre_completo: string;
  rol: RolGdc;
  activo: boolean;
  email: string | null;
};

const ESTADO_INICIAL: EstadoCrearUsuario = {};

export function DetalleUsuarioSheet({
  usuario,
  esCuentaPropia,
  open,
  onOpenChange,
}: {
  usuario: Usuario | null;
  esCuentaPropia: boolean;
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
          <FormularioUsuario
            key={usuario.id}
            usuario={usuario}
            esCuentaPropia={esCuentaPropia}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FormularioUsuario({
  usuario,
  esCuentaPropia,
}: {
  usuario: Usuario;
  esCuentaPropia: boolean;
}) {
  const [rol, setRol] = useState<string>(usuario.rol);
  const [activo, setActivo] = useState(usuario.activo);
  const [errorActivo, setErrorActivo] = useState<string | null>(null);

  const [estadoEditar, formActionEditar, pendingEditar] = useActionState(
    actualizarUsuario,
    ESTADO_INICIAL,
  );
  const [estadoReset, formActionReset, pendingReset] = useActionState(
    restablecerContrasenaUsuario,
    ESTADO_INICIAL,
  );

  async function alCambiarActivo(nuevoActivo: boolean) {
    setErrorActivo(null);
    const resultado = await alternarActivoUsuario(usuario.id, nuevoActivo);
    if (resultado.error) {
      setErrorActivo(resultado.error);
      return;
    }
    setActivo(nuevoActivo);
  }

  return (
    <div className="flex flex-col gap-6 p-4 pt-0">
      <div className="flex items-center gap-3">
        <AvatarIniciales nombreCompleto={usuario.nombre_completo} className="size-14 text-base" />
        <div>
          <p className="font-heading text-lg font-semibold">{usuario.nombre_completo}</p>
          {usuario.email && (
            <p className="text-sm text-muted-foreground">{usuario.email}</p>
          )}
          <RolBadge rol={usuario.rol} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 p-3">
        <div>
          <p className="text-sm font-medium">Cuenta activa</p>
          <p className="text-xs text-muted-foreground">
            {activo ? "Puede iniciar sesión normalmente." : "No puede iniciar sesión."}
          </p>
        </div>
        <Switch
          checked={activo}
          onCheckedChange={alCambiarActivo}
          disabled={esCuentaPropia}
        />
      </div>
      {esCuentaPropia && (
        <p className="-mt-4 text-xs text-muted-foreground">No puedes desactivar tu propia cuenta.</p>
      )}
      {errorActivo && <p className="text-sm text-destructive">{errorActivo}</p>}

      <form action={formActionEditar} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={usuario.id} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="nombre_completo">Nombre completo</Label>
          <Input id="nombre_completo" name="nombre_completo" defaultValue={usuario.nombre_completo} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rol">Rol</Label>
          <input type="hidden" name="rol" value={rol} />
          <Select value={rol} onValueChange={(v) => v && setRol(v)}>
            <SelectTrigger id="rol" className="w-full">
              <SelectValue placeholder="Selecciona un rol">
                {(value: string | null) => (ROL_LABEL as Record<string, string>)[value ?? ""] ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="juez">Juez</SelectItem>
              <SelectItem value="asistente">Asistente</SelectItem>
              <SelectItem value="analista_datos">Analista de Datos</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {estadoEditar.error && <p className="text-sm text-destructive">{estadoEditar.error}</p>}
        {estadoEditar.ok && <p className="text-sm text-status-confirmed">Cambios guardados.</p>}
        <Button type="submit" disabled={pendingEditar}>
          {pendingEditar ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm font-medium">Restablecer contraseña</p>
        <p className="text-xs text-muted-foreground">
          Define una nueva contraseña temporal para esta cuenta.
        </p>
        <form action={formActionReset} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={usuario.id} />
          <input type="hidden" name="auth_user_id" value={usuario.auth_user_id} />
          <PasswordInput
            name="nueva_contrasena"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            minLength={8}
            required
          />
          {estadoReset.error && <p className="text-sm text-destructive">{estadoReset.error}</p>}
          {estadoReset.ok && <p className="text-sm text-status-confirmed">Contraseña restablecida.</p>}
          <Button type="submit" variant="outline" disabled={pendingReset}>
            {pendingReset ? "Restableciendo…" : "Restablecer contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
