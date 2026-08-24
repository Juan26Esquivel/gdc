import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarioCliente } from "./calendario-cliente";

export default async function CalendarioPage() {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario?.rol === "administrador";

  const supabase = await createClient();
  const { data: audiencias } = await supabase
    .from("audiencias")
    .select(
      `id, tipo, motivo, fecha_programada, fecha_minima_calculada, fecha_limite_calculada, estado,
       expedientes(numero_expediente, tipos_proceso(nombre))`,
    )
    .order("fecha_programada", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Calendario de Audiencias</h1>
        <p className="text-sm text-muted-foreground">
          Expedientes con audiencia programada. Cada evento distingue el expediente y el tipo de
          audiencia.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Vista mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarioCliente audiencias={audiencias ?? []} esAdmin={esAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}
