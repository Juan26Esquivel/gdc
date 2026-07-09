import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  icono: Icono,
  label,
  valor,
  variacion,
  destacado = false,
}: {
  icono: LucideIcon;
  label: string;
  valor: string | number;
  variacion?: string;
  destacado?: boolean;
}) {
  return (
    <Card className={destacado ? "bg-primary text-primary-foreground" : undefined}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Icono className={`size-5 ${destacado ? "" : "text-muted-foreground"}`} />
          {variacion && <span className="text-xs font-medium text-emerald-600">{variacion}</span>}
        </div>
        <div>
          <p className="text-2xl font-bold">{valor}</p>
          <p
            className={`text-xs font-medium uppercase tracking-wide ${destacado ? "text-primary-foreground/70" : "text-muted-foreground"}`}
          >
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
