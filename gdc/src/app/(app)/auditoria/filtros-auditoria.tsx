"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Usuario = { id: string; nombre_completo: string };

export function FiltrosAuditoria({
  usuarios,
  entidades,
}: {
  usuarios: Usuario[];
  entidades: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const usuario = searchParams.get("usuario") ?? "";
  const entidad = searchParams.get("entidad") ?? "";

  function actualizar(clave: string, valor: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    router.push(`/auditoria?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={usuario} onValueChange={(v) => actualizar("usuario", v)}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Usuario: Todos">
            {(value: string | null) =>
              usuarios.find((u) => u.id === value)?.nombre_completo ?? "Usuario: Todos"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {usuarios.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.nombre_completo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={entidad} onValueChange={(v) => actualizar("entidad", v)}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Entidad: Todas">
            {(value: string | null) => value ?? "Entidad: Todas"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {entidades.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(usuario || entidad) && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/auditoria")}>
          Limpiar
        </Button>
      )}
    </div>
  );
}
