import type { EstadoPlazo } from "@/lib/plazo-audiencia";

const COLOR_BARRA: Record<EstadoPlazo["color"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const COLOR_TEXTO: Record<EstadoPlazo["color"], string> = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-700",
};

export function PlazoBar({ estado }: { estado: EstadoPlazo | null }) {
  if (!estado) {
    return <span className="text-xs text-muted-foreground">Sin audiencia programada</span>;
  }

  return (
    <div className="flex w-32 flex-col gap-1">
      <span className={`text-xs font-medium ${COLOR_TEXTO[estado.color]}`}>{estado.etiqueta}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${COLOR_BARRA[estado.color]}`}
          style={{ width: `${estado.porcentaje}%` }}
        />
      </div>
    </div>
  );
}
