import Link from "next/link";
import { notFound } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getTiposEvento } from "@/lib/catalogos";
import { AsignarDialog } from "../asignar-dialog";
import { DocumentoWorkspace } from "./documentos/documento-workspace";
import { DatosGeneralesTab } from "./datos-generales-tab";
import { EventosTab, type EventoHistorial } from "./eventos-tab";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; advertencia?: string }>;
};

const TABS = [
  { valor: "datos", etiqueta: "Datos generales" },
  { valor: "documentos", etiqueta: "Documentos" },
  { valor: "eventos", etiqueta: "Eventos y trazabilidad" },
];

export default async function DetalleExpedientePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab: tabParam, advertencia } = await searchParams;
  const tab = TABS.some((t) => t.valor === tabParam) ? tabParam! : "datos";

  const usuario = await getUsuarioActual();
  const supabase = await createClient();

  const { data: expediente } = await supabase
    .from("expedientes")
    .select(
      `id, numero_expediente, tipo_proceso_id, subtipo_proceso_id, cuantia, es_lanzamiento,
       fecha_notificacion_demanda, fecha_registro, fisico_electronico, municipal_circuito,
       pretension, notas, estado_matrimonio, monto_embargo_decretado,
       cerrado, fecha_cierre, tipo_cierre, motivo_cierre, created_at,
       tipos_proceso(nombre), subtipos_proceso(nombre), despachos(nombre, tipo),
       expediente_fases(fase_id, fecha_inicio, fecha_fin, fases_proceso(id, nombre, orden)),
       asignaciones(activa, usuarios!asistente_id(id, nombre_completo))`,
    )
    .eq("id", id)
    .maybeSingle();

  // Puede ser null porque no existe, o porque RLS lo oculta (ej. un Asistente
  // sin asignación) — en ambos casos, notFound() es el comportamiento correcto.
  if (!expediente) notFound();

  const [{ data: eventos }, { data: configuracion }] = await Promise.all([
    supabase
      .from("eventos_expediente")
      .select(
        "id, fecha_evento, created_at, detalle, tipos_evento(nombre, alimenta, codigo), usuarios(nombre_completo)",
      )
      .eq("expediente_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("configuracion_sistema").select("umbral_inactividad_dias, tope_cuantia").eq("id", 1).single(),
  ]);

  const asignacionActual = expediente.asignaciones.find((a) => a.activa);
  const observacionActual =
    (eventos ?? []).find((e) => e.tipos_evento?.codigo === "observacion_actualizada")?.detalle ?? null;

  const fasesDelTipo = [...expediente.expediente_fases]
    .map((ef) => ef.fases_proceso)
    .filter((f): f is NonNullable<typeof f> => f !== null);
  const faseActivaId = expediente.expediente_fases.find((ef) => ef.fecha_fin === null)?.fase_id;
  const fechaPorFaseId = new Map(
    expediente.expediente_fases.map((ef) => [ef.fase_id, ef.fecha_inicio] as const),
  );
  const ordenActual = fasesDelTipo.find((f) => f.id === faseActivaId)?.orden ?? 0;
  const lineaTramite = fasesDelTipo
    .sort((a, b) => a.orden - b.orden)
    .map((f) => ({
      id: f.id,
      nombre: f.nombre,
      orden: f.orden,
      completada: f.orden < ordenActual,
      actual: f.id === faseActivaId,
      fecha: fechaPorFaseId.get(f.id) ?? null,
    }));

  const [{ data: documentosResumen }, { count: totalDocumentos }, { data: asistentes }] = await Promise.all([
    supabase
      .from("documentos")
      .select("id, estado, tipos_documento(nombre)")
      .eq("expediente_id", id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("documentos")
      .select("id", { count: "exact", head: true })
      .eq("expediente_id", id),
    usuario?.rol === "administrador"
      ? supabase.from("usuarios").select("id, nombre_completo").eq("rol", "asistente").eq("activo", true)
      : Promise.resolve({ data: [] }),
  ]);

  const documentoIds = (documentosResumen ?? []).map((d) => d.id);
  const { data: auditoriaResumen } = await supabase
    .from("auditoria")
    .select("id, accion, created_at, usuarios(nombre_completo)")
    .in("entidad_id", [id, ...documentoIds])
    .order("created_at", { ascending: false })
    .limit(6);

  let embargo: { montoDecretado: number; totalAbonado: number; saldoPendiente: number } | null = null;
  if (expediente.monto_embargo_decretado !== null) {
    const { data: saldo } = await supabase
      .from("vista_embargo_saldos")
      .select("monto_embargo_decretado, total_abonado, saldo_pendiente")
      .eq("expediente_id", id)
      .maybeSingle();
    if (saldo) {
      embargo = {
        montoDecretado: Number(saldo.monto_embargo_decretado),
        totalAbonado: Number(saldo.total_abonado),
        saldoPendiente: Number(saldo.saldo_pendiente),
      };
    }
  }

  const nombreCorto = expediente.subtipos_proceso?.nombre
    ? `${expediente.tipos_proceso?.nombre} · ${expediente.subtipos_proceso.nombre}`
    : (expediente.tipos_proceso?.nombre ?? "—");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/expedientes" className="underline underline-offset-2">
          Expedientes
        </Link>{" "}
        / {expediente.numero_expediente}
      </p>

      {advertencia && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
          {advertencia}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="font-mono text-2xl font-semibold">{expediente.numero_expediente}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {nombreCorto}
            </span>
            {expediente.despachos && (
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {expediente.despachos.nombre} · {expediente.municipal_circuito ?? expediente.despachos.tipo}
              </span>
            )}
            {expediente.cerrado && (
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                Cerrado
              </span>
            )}
          </div>
        </div>
        {usuario?.rol === "administrador" && (
          <AsignarDialog
            expedienteId={expediente.id}
            asistentes={asistentes ?? []}
            asignadoActualId={asignacionActual?.usuarios?.id ?? null}
            asignadoActualNombre={asignacionActual?.usuarios?.nombre_completo ?? null}
          />
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.valor}
            href={`/expedientes/${id}?tab=${t.valor}`}
            className={`border-b-2 px-3 py-2 text-sm font-semibold ${
              tab === t.valor
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t.etiqueta}
          </Link>
        ))}
      </div>

      {tab === "datos" && (
        <DatosGeneralesTab
          expedienteId={expediente.id}
          fisicoElectronico={expediente.fisico_electronico}
          municipalCircuito={expediente.municipal_circuito}
          despachoNombre={expediente.despachos?.nombre ?? null}
          cuantia={expediente.cuantia}
          esLanzamiento={expediente.es_lanzamiento}
          topeCuantia={Number(configuracion?.tope_cuantia ?? 10000)}
          pretension={expediente.pretension}
          fechaNotificacionDemanda={expediente.fecha_notificacion_demanda}
          notas={expediente.notas}
          observacionActual={observacionActual}
          lineaTramite={lineaTramite}
          estadoMatrimonio={expediente.estado_matrimonio}
          cerrado={expediente.cerrado}
          tipoCierre={expediente.tipo_cierre}
          motivoCierre={expediente.motivo_cierre}
          fechaCierre={expediente.fecha_cierre}
          asignadoNombre={asignacionActual?.usuarios?.nombre_completo ?? null}
          documentosRecientes={(documentosResumen ?? []).map((d) => ({
            id: d.id,
            nombre: d.tipos_documento?.nombre ?? "Documento",
            estado: d.estado,
          }))}
          totalDocumentos={totalDocumentos ?? 0}
          auditoriaReciente={(auditoriaResumen ?? []).map((a) => ({
            id: a.id,
            accion: a.accion,
            usuarioNombre: a.usuarios?.nombre_completo ?? null,
            fecha: a.created_at,
          }))}
          embargo={embargo}
        />
      )}

      {tab === "documentos" && <TabDocumentos expedienteId={id} />}

      {tab === "eventos" && (
        <EventosTabServer
          expedienteId={id}
          tipoProcesoId={expediente.tipo_proceso_id}
          eventos={eventos ?? []}
          umbralInactividadDias={configuracion?.umbral_inactividad_dias ?? 30}
        />
      )}
    </div>
  );
}

async function TabDocumentos({ expedienteId }: { expedienteId: string }) {
  const supabase = await createClient();
  const usuario = await getUsuarioActual();

  const [{ data: documentos }, { data: tiposDocumento }] = await Promise.all([
    supabase
      .from("documentos")
      .select(
        `id, tipo_documento_id, estado, contenido_texto, observaciones_juez,
         archivo_docx_path, created_at, updated_at, fecha_confirmacion, culmina_proceso,
         motivo_culminacion,
         tipos_documento(nombre),
         generado_por_usuario:usuarios!generado_por(nombre_completo),
         confirmado_por_usuario:usuarios!confirmado_por(nombre_completo)`,
      )
      .eq("expediente_id", expedienteId)
      .order("created_at", { ascending: false }),
    supabase.from("tipos_documento").select("id, nombre").order("id"),
  ]);

  const documentosConEnlace = await Promise.all(
    (documentos ?? []).map(async (doc) => {
      if (!doc.archivo_docx_path) return { ...doc, urlDescarga: null as string | null };
      const { data } = await supabase.storage
        .from("documentos-docx")
        .createSignedUrl(doc.archivo_docx_path, 60 * 10);
      return { ...doc, urlDescarga: data?.signedUrl ?? null };
    }),
  );

  return (
    <DocumentoWorkspace
      expedienteId={expedienteId}
      documentos={documentosConEnlace}
      tiposDocumento={tiposDocumento ?? []}
      rol={usuario!.rol}
    />
  );
}

async function EventosTabServer({
  expedienteId,
  tipoProcesoId,
  eventos,
  umbralInactividadDias,
}: {
  expedienteId: string;
  tipoProcesoId: number;
  eventos: {
    id: string;
    fecha_evento: string;
    created_at: string;
    detalle: string | null;
    tipos_evento: { nombre: string; alimenta: string; codigo: string } | null;
    usuarios: { nombre_completo: string } | null;
  }[];
  umbralInactividadDias: number;
}) {
  const tiposEvento = await getTiposEvento();
  const disponibles = tiposEvento.filter(
    (t) => !t.es_generado_por_sistema && (t.tipo_proceso_id === null || t.tipo_proceso_id === tipoProcesoId),
  );

  const historial: EventoHistorial[] = eventos.map((e) => ({
    id: e.id,
    tipoNombre: e.tipos_evento?.nombre ?? "Evento",
    alimenta: e.tipos_evento?.alimenta ?? "",
    fechaEvento: e.fecha_evento,
    createdAt: e.created_at,
    detalle: e.detalle,
    registradoPorNombre: e.usuarios?.nombre_completo ?? null,
  }));

  return (
    <EventosTab
      expedienteId={expedienteId}
      tiposEventoDisponibles={disponibles}
      historial={historial}
      umbralInactividadDias={umbralInactividadDias}
    />
  );
}
