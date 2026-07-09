import { FileText, Gavel, FileCheck, Folder } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getConfiguracionSistema } from "@/lib/catalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { FASE_LABEL, type FaseExpediente } from "@/lib/fases";
import { CargaPorFaseChart } from "./carga-por-fase-chart";
import { DocumentosPorTipoChart } from "./documentos-por-tipo-chart";
import { RealtimeRefresh } from "./realtime-refresh";

function inicioMes(offsetMeses = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offsetMeses, 1);
}

export default async function DashboardPage() {
  const usuario = await getUsuarioActual();

  if (usuario?.rol === "asistente" || usuario?.rol === "analista_datos") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bienvenido/a, {usuario.nombre_completo}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {usuario.rol === "asistente"
              ? "Consulta tus expedientes asignados en el menú \"Expedientes\"."
              : "El panel de KPIs se irá construyendo en un próximo módulo."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const supabase = await createClient();
  const inicioMesActual = inicioMes(0);
  const inicioMesAnterior = inicioMes(-1);

  const [
    { data: expedientes },
    { data: documentos },
    { data: audiencias },
    configuracion,
  ] = await Promise.all([
    supabase
      .from("expedientes")
      .select("id, created_at, expediente_fases(fase, fecha_fin, fecha_inicio)"),
    supabase
      .from("documentos")
      .select("id, estado, created_at, fecha_confirmacion, tipos_documento(nombre)"),
    supabase.from("audiencias").select("id, fecha_programada"),
    getConfiguracionSistema(),
  ]);

  const totalExpedientes = expedientes?.length ?? 0;

  const audienciasEsteMes =
    audiencias?.filter((a) => new Date(a.fecha_programada) >= inicioMesActual).length ?? 0;

  const documentosPorValidar = documentos?.filter((d) => d.estado === "validado").length ?? 0;

  const documentosConfirmadosMes =
    documentos?.filter(
      (d) => d.estado === "confirmado" && d.fecha_confirmacion && new Date(d.fecha_confirmacion) >= inicioMesActual,
    ).length ?? 0;

  // RF-18: carga de trabajo por fase (fase activa de cada expediente)
  const conteoPorFase: Record<string, number> = {};
  for (const exp of expedientes ?? []) {
    const activa = exp.expediente_fases.find((f) => f.fecha_fin === null);
    if (activa) conteoPorFase[activa.fase] = (conteoPorFase[activa.fase] ?? 0) + 1;
  }
  const datosCargaPorFase = (Object.keys(FASE_LABEL) as FaseExpediente[]).map((fase) => ({
    fase: FASE_LABEL[fase],
    cantidad: conteoPorFase[fase] ?? 0,
  }));

  // RF-16: documentos generados este mes, por tipo
  const documentosEsteMes = (documentos ?? []).filter(
    (d) => new Date(d.created_at) >= inicioMesActual,
  );
  const conteoPorTipo: Record<string, number> = {};
  for (const doc of documentosEsteMes) {
    const nombre = doc.tipos_documento?.nombre ?? "Otro";
    conteoPorTipo[nombre] = (conteoPorTipo[nombre] ?? 0) + 1;
  }
  const datosPorTipo = Object.entries(conteoPorTipo).map(([tipo, cantidad]) => ({
    tipo,
    cantidad,
  }));

  // RF-17: comparativo mes actual vs mes anterior
  const expedientesMesActual = (expedientes ?? []).filter(
    (e) => new Date(e.created_at) >= inicioMesActual,
  ).length;
  const expedientesMesAnterior = (expedientes ?? []).filter(
    (e) => new Date(e.created_at) >= inicioMesAnterior && new Date(e.created_at) < inicioMesActual,
  ).length;

  // RF-24-EXTRA: expedientes en admisión hace más de plazo_admision_dias sin pasar a notificación
  const plazoAdmisionDias = configuracion?.plazo_admision_dias ?? 30;
  const limiteAdmision = new Date();
  limiteAdmision.setDate(limiteAdmision.getDate() - plazoAdmisionDias);
  const expedientesCriticos = (expedientes ?? [])
    .map((exp) => {
      const admisionActiva = exp.expediente_fases.find(
        (f) => f.fase === "admision" && f.fecha_fin === null,
      );
      return admisionActiva ? { id: exp.id, fecha_inicio: admisionActiva.fecha_inicio } : null;
    })
    .filter(
      (item): item is { id: string; fecha_inicio: string } =>
        item !== null && new Date(item.fecha_inicio) < limiteAdmision,
    );

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Resumen del Despacho</h1>
          <p className="text-sm text-muted-foreground">
            Monitor de carga laboral y cumplimiento de plazos procesales.
          </p>
        </div>
        <span className="rounded-sm bg-emerald-500/10 px-2 py-1 text-xs font-semibold uppercase text-emerald-700">
          Tiempo real
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icono={Folder} label="Total expedientes" valor={totalExpedientes} />
        <StatCard icono={Gavel} label="Audiencias este mes" valor={audienciasEsteMes} />
        <StatCard icono={FileText} label="Documentos por validar" valor={documentosPorValidar} />
        <StatCard
          icono={FileCheck}
          label="Documentos confirmados (mes)"
          valor={documentosConfirmadosMes}
          destacado
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Carga de Trabajo por Fase</CardTitle>
          </CardHeader>
          <CardContent>
            <CargaPorFaseChart datos={datosCargaPorFase} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documentos Emitidos Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            {datosPorTipo.length > 0 ? (
              <DocumentosPorTipoChart datos={datosPorTipo} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin documentos generados este mes todavía.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comparativo Mensual de Expedientes</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-8">
            <div>
              <p className="text-2xl font-bold">{expedientesMesActual}</p>
              <p className="text-xs text-muted-foreground">Ingresados este mes</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{expedientesMesAnterior}</p>
              <p className="text-xs text-muted-foreground">Ingresados mes anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle>Críticos (Art. 395 — plazo de admisión)</CardTitle>
          </CardHeader>
          <CardContent>
            {expedientesCriticos.length > 0 ? (
              <p className="text-sm">
                <span className="font-semibold text-destructive">
                  {expedientesCriticos.length}
                </span>{" "}
                expediente(s) llevan más de {plazoAdmisionDias} días en Admisión sin pasar a
                Notificación de la demanda.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ningún expediente excede el plazo de admisión de {plazoAdmisionDias} días.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
