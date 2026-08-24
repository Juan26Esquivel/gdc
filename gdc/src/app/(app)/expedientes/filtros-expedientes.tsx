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
import type { FaseProceso } from "@/lib/fases";

type TipoProceso = { id: number; nombre: string };

export function FiltrosExpedientes({
  tiposProceso,
  fasesProceso,
}: {
  tiposProceso: TipoProceso[];
  fasesProceso: FaseProceso[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") ?? "";
  const fase = searchParams.get("fase") ?? "";

  function actualizar(clave: string, valor: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    router.push(`/expedientes?${params.toString()}`);
  }

  // Cada tipo de proceso tiene su propio catálogo de fases (OT-02): al elegir
  // un tipo, solo se listan las fases de ese tipo; sin tipo elegido, se listan
  // todas para no bloquear el filtro por fase de entrada.
  const fasesDisponibles = tipo
    ? fasesProceso.filter((f) => f.tipo_proceso_id === Number(tipo))
    : fasesProceso;

  return (
    <div className="flex items-center gap-3">
      <Select
        value={tipo}
        onValueChange={(v) => {
          actualizar("tipo", v);
          actualizar("fase", null);
        }}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Tipo: Todos">
            {(value: string | null) =>
              tiposProceso.find((t) => String(t.id) === value)?.nombre ?? "Tipo: Todos"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tiposProceso.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={fase} onValueChange={(v) => actualizar("fase", v)}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Fase: Todas">
            {(value: string | null) =>
              fasesDisponibles.find((f) => f.id === value)?.nombre ?? "Fase: Todas"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fasesDisponibles.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(tipo || fase) && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/expedientes")}>
          Limpiar
        </Button>
      )}
    </div>
  );
}
