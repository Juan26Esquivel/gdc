import Link from "next/link";
import { Folder, AlertTriangle, Gavel } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getTiposProceso, getSubtiposProceso, getFasesProceso } from "@/lib/catalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NuevoExpedienteDialog } from "./nuevo-expediente-dialog";
import { AvanzarFaseForm } from "./avanzar-fase-form";
import { AsignarDialog } from "./asignar-dialog";
import { FiltrosExpedientes } from "./filtros-expedientes";
import { EliminarExpedienteBoton } from "./eliminar-expediente-boton";
import { siguienteFase, type FaseProceso } from "@/lib/fases";
import { StatCard } from "@/components/stat-card";
import { PlazoBar } from "@/components/plazo-bar";
import { calcularEstadoPlazo } from "@/lib/plazo-audiencia";

type Props = {
  searchParams: Promise<{ tipo?: string; fase?: string }>;
};

export default async function ExpedientesPage({ searchParams }: Props) {
  const { tipo: tipoFiltro, fase: faseFiltro } = await searchParams;
  const usuario = await getUsuarioActual();
  const esAdmin = usuario?.rol === "administrador";

  const supabase = await createClient();
  const [{ data: expedientes }, tiposProceso, subtiposProceso, fasesProceso, { data: asistentes }] =
    await Promise.all([
      supabase
        .from("expedientes")
        .select(
          `id, numero_expediente, tipo_proceso_id, cuantia, es_lanzamiento,
           fecha_notificacion_demanda, created_at,
           tipos_proceso(nombre),
           subtipos_proceso(nombre),
           expediente_fases(fase_id, fecha_fin, fases_proceso(id, tipo_proceso_id, nombre, orden, es_fase_inicial)),
           asignaciones(activa, usuarios!asistente_id(id, nombre_completo)),
           audiencias(tipo, fecha_limite_calculada, estado)`,
        )
        .order("created_at", { ascending: false }),
      getTiposProceso(),
      getSubtiposProceso(),
      getFasesProceso(),
      esAdmin
        ? supabase
            .from("usuarios")
            .select("id, nombre_completo")
            .eq("rol", "asistente")
            .eq("activo", true)
        : Promise.resolve({ data: [] }),
    ]);

  const todos = expedientes ?? [];

  // Stat cards: se calculan sobre el total visible por RLS, sin aplicar los filtros de la tabla.
  const totalExpedientes = todos.length;
  const enFaseAudiencia = todos.filter((exp) => {
    const activa = exp.expediente_fases.find((f) => f.fecha_fin === null);
    return (
      activa?.fases_proceso?.nombre === "Audiencia preliminar" ||
      activa?.fases_proceso?.nombre === "Audiencia de fondo"
    );
  }).length;
  const enPlazoCritico = todos.filter((exp) => {
    const audienciaActiva = exp.audiencias.find((a) => a.estado === "programada");
    const estadoPlazo = calcularEstadoPlazo(
      exp.fecha_notificacion_demanda,
      audienciaActiva?.fecha_limite_calculada ?? null,
    );
    return estadoPlazo?.color === "red";
  }).length;

  const filas = todos.filter((exp) => {
    if (tipoFiltro && exp.tipo_proceso_id !== Number(tipoFiltro)) return false;
    if (faseFiltro) {
      const activa = exp.expediente_fases.find((f) => f.fecha_fin === null);
      if (activa?.fase_id !== faseFiltro) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Panel principal / Expedientes</p>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Gestión de Expedientes</h1>
          <p className="text-sm text-muted-foreground">
            Control de procesos judiciales y plazos según la Ley 402.
          </p>
        </div>
        {esAdmin && (
          <NuevoExpedienteDialog tiposProceso={tiposProceso} subtiposProceso={subtiposProceso} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icono={Folder} label="Total expedientes" valor={totalExpedientes} />
        <StatCard
          icono={AlertTriangle}
          label="En plazo crítico"
          valor={enPlazoCritico}
          destacado={enPlazoCritico > 0}
        />
        <StatCard icono={Gavel} label="En fase audiencia" valor={enFaseAudiencia} />
      </div>

      <FiltrosExpedientes tiposProceso={tiposProceso} fasesProceso={fasesProceso} />

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Subtipo</TableHead>
                <TableHead>Cuantía</TableHead>
                <TableHead>Fase actual</TableHead>
                <TableHead>Plazo</TableHead>
                {esAdmin && <TableHead>Asignado a</TableHead>}
                {esAdmin && <TableHead>Acción</TableHead>}
                {esAdmin && <TableHead className="text-right">Eliminar</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((exp) => {
                const faseActual = exp.expediente_fases.find((f) => f.fecha_fin === null);
                const fasesDelTipo = fasesProceso.filter(
                  (f) => f.tipo_proceso_id === exp.tipo_proceso_id,
                );
                const proximaFase = faseActual
                  ? siguienteFase(fasesDelTipo as FaseProceso[], faseActual.fase_id)
                  : null;
                const asignacionActual = exp.asignaciones.find((a) => a.activa);
                const audienciaActiva = exp.audiencias.find((a) => a.estado === "programada");
                const estadoPlazo = calcularEstadoPlazo(
                  exp.fecha_notificacion_demanda,
                  audienciaActiva?.fecha_limite_calculada ?? null,
                );
                return (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <Link
                        href={`/expedientes/${exp.id}/documentos`}
                        className="underline underline-offset-2"
                      >
                        {exp.numero_expediente}
                      </Link>
                    </TableCell>
                    <TableCell>{exp.tipos_proceso?.nombre}</TableCell>
                    <TableCell>{exp.subtipos_proceso?.nombre ?? "—"}</TableCell>
                    <TableCell>
                      {exp.es_lanzamiento
                        ? "Lanzamiento (sin tope)"
                        : exp.cuantia
                          ? `B/.${exp.cuantia}`
                          : "Indeterminada"}
                    </TableCell>
                    <TableCell>{faseActual?.fases_proceso?.nombre ?? "—"}</TableCell>
                    <TableCell>
                      <PlazoBar estado={estadoPlazo} />
                    </TableCell>
                    {esAdmin && (
                      <TableCell>
                        <AsignarDialog
                          expedienteId={exp.id}
                          asistentes={asistentes ?? []}
                          asignadoActualId={asignacionActual?.usuarios?.id ?? null}
                          asignadoActualNombre={asignacionActual?.usuarios?.nombre_completo ?? null}
                        />
                      </TableCell>
                    )}
                    {esAdmin && (
                      <TableCell>
                        <AvanzarFaseForm expedienteId={exp.id} proximaFase={proximaFase} />
                      </TableCell>
                    )}
                    {esAdmin && (
                      <TableCell className="text-right">
                        <EliminarExpedienteBoton
                          expedienteId={exp.id}
                          numeroExpediente={exp.numero_expediente}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
