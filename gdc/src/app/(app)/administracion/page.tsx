import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogoProcesos } from "./catalogo-procesos";
import { ConfiguracionForm } from "./configuracion-form";
import { ReglasCierre } from "./reglas-cierre";

export default async function AdministracionPage() {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "administrador") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: tiposProceso }, { data: subtiposProceso }, { data: configuracion }] =
    await Promise.all([
      supabase.from("tipos_proceso").select("id, nombre, base_legal").order("id"),
      supabase
        .from("subtipos_proceso")
        .select(
          "id, tipo_proceso_id, nombre, plazo_audiencia_min_dias, plazo_audiencia_max_dias, plazo_audiencia_fondo_min_dias, plazo_audiencia_fondo_max_dias, base_legal",
        )
        .order("id"),
      supabase
        .from("configuracion_sistema")
        .select("tope_cuantia, modo_validacion_cuantia, plazo_admision_dias, umbral_inactividad_dias")
        .eq("id", 1)
        .single(),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Panel de control / Administración
        </p>
        <h1 className="font-heading text-xl font-semibold text-primary">
          Catálogo de Procesos y Configuración General
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Plazos procesales por tipo/subtipo de proceso y parámetros generales del sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Procesos y Plazos (RF-30, RF-23)</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogoProcesos
            tiposProceso={tiposProceso ?? []}
            subtiposProceso={subtiposProceso ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración General (RF-36)</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfiguracionForm configuracion={configuracion ?? null} />
        </CardContent>
      </Card>

      <ReglasCierre umbralInactividadDias={configuracion?.umbral_inactividad_dias ?? 30} />
    </div>
  );
}
