"use client";

import { useActionState, useState } from "react";
import { crearUsuario, type EstadoCrearUsuario } from "./actions";
import { ROL_LABEL } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ESTADO_INICIAL: EstadoCrearUsuario = {};

export function NuevoUsuarioDialog() {
  const [open, setOpen] = useState(false);
  const [rol, setRol] = useState("");
  const [estado, formAction, pending] = useActionState(crearUsuario, ESTADO_INICIAL);

  // Patrón de "derivar estado durante el render" (no useEffect) para reaccionar
  // al éxito de la Server Action sin provocar renders en cascada. El formulario
  // no se resetea manualmente: al cerrarse el diálogo, Base UI desmonta su
  // contenido, por lo que los campos (no controlados) vuelven a quedar vacíos.
  const [estadoManejado, setEstadoManejado] = useState(estado);
  if (estado !== estadoManejado) {
    setEstadoManejado(estado);
    if (estado.ok) {
      setOpen(false);
      setRol("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nuevo usuario</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre_completo">Nombre completo</Label>
            <Input id="nombre_completo" name="nombre_completo" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña temporal</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rol">Rol</Label>
            <input type="hidden" name="rol" value={rol} />
            <Select value={rol} onValueChange={(value) => setRol(value ?? "")}>
              <SelectTrigger id="rol" className="w-full">
                <SelectValue placeholder="Selecciona un rol">
                  {(value: string | null) =>
                    (ROL_LABEL as Record<string, string>)[value ?? ""] ?? null
                  }
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
          {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !rol}>
              {pending ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
