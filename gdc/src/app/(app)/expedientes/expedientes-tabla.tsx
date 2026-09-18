"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AvanzarFaseForm } from "./avanzar-fase-form";
import { AsignarDialog } from "./asignar-dialog";
import { EliminarExpedienteBoton } from "./eliminar-expediente-boton";
import { TablePagination } from "@/components/table-pagination";
import { usePaginacion } from "@/hooks/use-paginacion";
import { siguienteFase, esFaseDeAudiencia, type FaseProceso } from "@/lib/fases";
import { calcularVentana, calcularVentanaPreliminar } from "@/lib/ventana-audiencia";
import { PlazoBar } from "@/components/plazo-bar";
import { calcularEstadoPlazo } from "@/lib/plazo-audiencia";
import type { DiasNoHabiles } from "@/lib/dias-habiles";

type ExpedienteFila = {
  id: string;
  numero_expediente: string;
  tipo_proceso_id: number;
  cuantia: number | null;
  es_lanzamiento: boolean;
  pretension: string | null;
  fisico_electronico: string | null;
  fecha_notificacion_demanda: string | null;
  tipos_proceso: { nombre: string } | null;
  subtipos_proceso: {
    nombre: string;
    plazo_contestacion_dias: number | null;
    plazo_audiencia_min_dias: number | null;
    plazo_audiencia_max_dias: number | null;
    plazo_audiencia_fondo_min_dias: number | null;
    plazo_audiencia_fondo_max_dias: number | null;
  } | null;
  expediente_fases: {
    fase_id: string;
    fecha_fin: string | null;
    fases_proceso: { id: string; tipo_proceso_id: number; nombre: string; orden: number; es_fase_inicial: boolean } | null;
  }[];
  asignaciones: { activa: boolean; usuarios: { id: string; nombre_completo: string } | null }[];
  audiencias: {
    tipo: string;
    fecha_programada: string;
    fecha_minima_calculada: string | null;
    fecha_limite_calculada: string | null;
    estado: string;
  }[];
};

const POR_PAGINA = 10;

export function ExpedientesTabla({
  filas,
  fasesProceso,
  diasNoHabiles,
  asistentes,
  observacionPorExpediente,
  esAdmin,
}: {
  filas: ExpedienteFila[];
  fasesProceso: FaseProceso[];
  diasNoHabiles: DiasNoHabiles;
  asistentes: { id: string; nombre_completo: string }[];
  observacionPorExpediente: Record<string, string>;
  esAdmin: boolean;
}) {
  const { pagina, totalPaginas, setPagina, inicio, fin } = usePaginacion(
    filas.length,
    POR_PAGINA,
  );
  const filasPagina = filas.slice(inicio, fin);

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expediente</TableHead>
              <TableHead>Tipo de proceso</TableHead>
              <TableHead className="hidden md:table-cell">Detalle</TableHead>
              <TableHead className="hidden lg:table-cell">Cuantía</TableHead>
              <TableHead>Fase actual</TableHead>
              <TableHead>Plazo</TableHead>
              {esAdmin && <TableHead>Asignado a</TableHead>}
              {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filasPagina.map((exp) => {
              const faseActual = exp.expediente_fases.find((f) => f.fecha_fin === null);
              const fasesDelTipo = fasesProceso.filter(
                (f) => f.tipo_proceso_id === exp.tipo_proceso_id,
              );
              const proximaFase = faseActual
                ? siguienteFase(fasesDelTipo, faseActual.fase_id)
                : null;
              const asignacionActual = exp.asignaciones.find((a) => a.activa);
              const audienciaActiva = exp.audiencias.find((a) => a.estado === "programada");
              const estadoPlazo = calcularEstadoPlazo(
                exp.fecha_notificacion_demanda,
                audienciaActiva?.fecha_limite_calculada ?? null,
              );
              // Ventana legal de la próxima audiencia, para mostrarla ANTES de
              // programarla: es el "puede celebrarse entre tal y tal fecha"
              // que el mínimo del rango nunca había llegado a producir.
              const ventanaSugerida =
                proximaFase && esFaseDeAudiencia(proximaFase.nombre)
                  ? proximaFase.nombre === "Audiencia preliminar"
                    ? calcularVentanaPreliminar(
                        exp.fecha_notificacion_demanda,
                        exp.subtipos_proceso?.plazo_contestacion_dias ?? null,
                        exp.subtipos_proceso?.plazo_audiencia_min_dias ?? null,
                        exp.subtipos_proceso?.plazo_audiencia_max_dias ?? null,
                        diasNoHabiles,
                      )
                    : calcularVentana(
                        exp.audiencias.find((a) => a.tipo === "preliminar")?.fecha_programada ??
                          null,
                        exp.subtipos_proceso?.plazo_audiencia_fondo_min_dias ?? null,
                        exp.subtipos_proceso?.plazo_audiencia_fondo_max_dias ?? null,
                        diasNoHabiles,
                      )
                  : null;
              const observacion = observacionPorExpediente[exp.id];
              return (
                <TableRow key={exp.id}>
                  <TableCell>
                    <Link
                      href={`/expedientes/${exp.id}`}
                      className="underline underline-offset-2"
                    >
                      {exp.numero_expediente}
                    </Link>
                    {exp.fisico_electronico && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {exp.fisico_electronico}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{exp.tipos_proceso?.nombre}</p>
                    {exp.subtipos_proceso?.nombre && (
                      <p className="text-xs text-muted-foreground">{exp.subtipos_proceso.nombre}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-48 md:table-cell">
                    {exp.pretension && <p className="truncate text-sm">{exp.pretension}</p>}
                    {observacion && (
                      <p className="truncate text-xs text-muted-foreground">{observacion}</p>
                    )}
                    {!exp.pretension && !observacion && "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {exp.es_lanzamiento
                      ? "Lanzamiento (sin tope)"
                      : exp.cuantia
                        ? `B/.${exp.cuantia}`
                        : "Indeterminada"}
                  </TableCell>
                  <TableCell className="text-sm">{faseActual?.fases_proceso?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    <PlazoBar estado={estadoPlazo} />
                  </TableCell>
                  {esAdmin && (
                    <TableCell>
                      <AsignarDialog
                        expedienteId={exp.id}
                        asistentes={asistentes}
                        asignadoActualId={asignacionActual?.usuarios?.id ?? null}
                        asignadoActualNombre={asignacionActual?.usuarios?.nombre_completo ?? null}
                      />
                    </TableCell>
                  )}
                  {esAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <AvanzarFaseForm
                          expedienteId={exp.id}
                          proximaFase={proximaFase}
                          ventanaSugerida={ventanaSugerida}
                        />
                        <EliminarExpedienteBoton
                          expedienteId={exp.id}
                          numeroExpediente={exp.numero_expediente}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={setPagina}
        total={filas.length}
        porPagina={POR_PAGINA}
      />
    </>
  );
}
