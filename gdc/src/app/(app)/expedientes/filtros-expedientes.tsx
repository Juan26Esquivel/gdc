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
import { FASE_LABEL, ORDEN_FASES } from "@/lib/fases";

type TipoProceso = { id: number; nombre: string };

export function FiltrosExpedientes({ tiposProceso }: { tiposProceso: TipoProceso[] }) {
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

  return (
    <div className="flex items-center gap-3">
      <Select value={tipo} onValueChange={(v) => actualizar("tipo", v)}>
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
              value ? FASE_LABEL[value as keyof typeof FASE_LABEL] : "Fase: Todas"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ORDEN_FASES.map((f) => (
            <SelectItem key={f} value={f}>
              {FASE_LABEL[f]}
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
