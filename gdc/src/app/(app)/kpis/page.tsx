import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { calcularKpi, obtenerDatosBaseKpis } from "@/lib/kpis";
import { KpisPanel, type KpiConValor } from "./kpis-panel";
import { ExportarReporteDocumentos } from "./exportar-reporte-documentos";

export default async function KpisPage() {
  const usuario = await getUsuarioActual();

  if (
    usuario?.rol !== "administrador" &&
    usuario?.rol !== "juez" &&
    usuario?.rol !== "analista_datos"
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: kpisConfig }, datosBase] = await Promise.all([
    supabase
      .from("kpis_config")
      .select(
        "id, nombre, descripcion, entidad_base, metrica, activo, umbral_optimo, umbral_alerta, umbral_critico",
      )
      .order("created_at", { ascending: true }),
    obtenerDatosBaseKpis(supabase),
  ]);

  const kpis: KpiConValor[] = (kpisConfig ?? []).map((kpi) => ({
    ...kpi,
    resultado: calcularKpi(datosBase, kpi.entidad_base, kpi.metrica),
  }));

  const puedeEditar = usuario.rol === "administrador" || usuario.rol === "analista_datos";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Panel de control / KPIs
          </p>
          <h1 className="font-heading text-xl font-semibold text-primary">
            Gestión de Indicadores de Desempeño
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configure y monitoree los parámetros de eficiencia del despacho, calculados en tiempo
            real a partir de expedientes, documentos y audiencias reales.
          </p>
        </div>
        <ExportarReporteDocumentos />
      </div>

      <KpisPanel kpis={kpis} puedeEditar={puedeEditar} />
    </div>
  );
}
