import { Gavel, FileText, FileCheck } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getConfiguracionSistema, getDiasNoHabiles } from "@/lib/catalogos";
import { contarDiasHabilesTranscurridos, sumarDiasHabiles } from "@/lib/dias-habiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { calcularSemaforo } from "@/lib/semaforo";
import { calcularMovimientosSinTrabajar } from "@/lib/inactividad";
import { BarrasCategoriaChart } from "./barras-categoria-chart";
import { DocumentosPorTipoChart } from "./documentos-por-tipo-chart";
import { TarjetaSemaforo, type FilaSemaforo } from "./tarjeta-semaforo";
import {
  TarjetaMovimientosSinTrabajar,
  TarjetaPendientesNotificar,
  TarjetaEdictosSinPublicar,
  TarjetaAptosParaEmbargo,
  type ItemMovimientoSinTrabajar,
  type ItemPendienteNotificar,
  type ItemEdictoSinPublicar,
  type ItemAptoEmbargo,
} from "./tarjetas-alerta";
import { RealtimeRefresh } from "./realtime-refresh";

function inicioMes(offsetMeses = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offsetMeses, 1);
}

function faseActivaDe(fases: { fase_id: string; fecha_fin: string | null; fecha_inicio: string; fases_proceso: { nombre: string } | null }[]) {
  return fases.find((f) => f.fecha_fin === null) ?? null;
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
              : "Configura y consulta los indicadores de desempeño en el menú \"KPIs\"."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const supabase = await createClient();
  const inicioMesActual = inicioMes(0);
  const inicioMesAnterior = inicioMes(-1);

  const [
    { data: expedientesActivos },
    { data: eventos },
    { data: todosExpedientes },
    { data: documentos },
    { data: audiencias },
    configuracion,
    diasNoHabiles,
  ] = await Promise.all([
    supabase
      .from("expedientes")
      .select(
        `id, numero_expediente, tipo_proceso_id, subtipo_proceso_id, fecha_registro, created_at,
         fecha_notificacion_demanda, omitir_umbral_inactividad,
         tipos_proceso(nombre),
         subtipos_proceso(nombre),
         expediente_fases(fase_id, fecha_fin, fecha_inicio, fases_proceso(nombre)),
         asignaciones(activa, usuarios!asistente_id(nombre_completo))`,
      )
      .eq("cerrado", false),
    supabase
      .from("eventos_expediente")
      .select("id, expediente_id, created_at, tipos_evento(codigo)"),
    supabase.from("expedientes").select("id, created_at, cerrado, fecha_cierre"),
    supabase
      .from("documentos")
      .select("id, estado, created_at, fecha_confirmacion, tipos_documento(nombre)"),
    supabase.from("audiencias").select("id, fecha_programada"),
    getConfiguracionSistema(),
    getDiasNoHabiles(),
  ]);

  const activos = expedientesActivos ?? [];
  const umbralInactividadDias = configuracion?.umbral_inactividad_dias ?? 30;
  const plazoAdmisionDias = configuracion?.plazo_admision_dias ?? 30;
  const plazoExcepcionDias = configuracion?.plazo_excepcion_ejecutivo_dias ?? 8;
  const plazoEmbargoDias = configuracion?.plazo_embargo_ejecutivo_dias ?? 10;

  // Punto 1: expedientes activos por tipo de proceso (Declarativo se
  // desglosa por subtipo, como en el Excel/mockup; el resto no tiene subtipo
  // parametrizado en el catálogo todavía).
  const conteoPorCategoria: Record<string, number> = {};
  for (const exp of activos) {
    const etiqueta = exp.subtipos_proceso?.nombre
      ? `${exp.tipos_proceso?.nombre} · ${exp.subtipos_proceso.nombre}`
      : (exp.tipos_proceso?.nombre ?? "Sin tipo");
    conteoPorCategoria[etiqueta] = (conteoPorCategoria[etiqueta] ?? 0) + 1;
  }
  const datosPorCategoria = Object.entries(conteoPorCategoria)
    .map(([categoria, cantidad]) => ({ categoria, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Punto 2: semáforo por tiempo en el sistema (sobre fecha_registro).
  const filasSemaforo: FilaSemaforo[] = activos.map((exp) => {
    const estado = calcularSemaforo(exp.fecha_registro);
    const faseActiva = faseActivaDe(exp.expediente_fases);
    return {
      id: exp.id,
      numeroExpediente: exp.numero_expediente,
      tipoProcesoId: exp.tipo_proceso_id,
      tipoNombre: exp.tipos_proceso?.nombre ?? "—",
      subtipoNombre: exp.subtipos_proceso?.nombre ?? null,
      faseNombre: faseActiva?.fases_proceso?.nombre ?? null,
      fechaRegistro: exp.fecha_registro,
      color: estado.color,
      meses: estado.meses,
    };
  });
  const tiposParaFiltro = Array.from(
    new Map(activos.map((e) => [e.tipo_proceso_id, e.tipos_proceso?.nombre ?? "—"])).entries(),
  ).map(([id, nombre]) => ({ id, nombre }));

  // Punto 3: movimientos sin trabajar (eventos_expediente.created_at, nunca
  // fecha_evento — ver OT-03/OT-04). Último evento por expediente.
  const ultimoEventoPorExpediente = new Map<string, string>();
  for (const ev of eventos ?? []) {
    const actual = ultimoEventoPorExpediente.get(ev.expediente_id);
    if (!actual || new Date(ev.created_at) > new Date(actual)) {
      ultimoEventoPorExpediente.set(ev.expediente_id, ev.created_at);
    }
  }
  const inactivos = calcularMovimientosSinTrabajar(
    activos.map((e) => ({ id: e.id, createdAt: e.created_at, omitirUmbral: e.omitir_umbral_inactividad })),
    ultimoEventoPorExpediente,
    umbralInactividadDias,
  );
  const itemsMovimientosSinTrabajar: ItemMovimientoSinTrabajar[] = inactivos.map((item) => {
    const exp = activos.find((e) => e.id === item.expedienteId)!;
    const faseActiva = faseActivaDe(exp.expediente_fases);
    return {
      id: exp.id,
      numeroExpediente: exp.numero_expediente,
      tipoNombre: exp.subtipos_proceso?.nombre
        ? `${exp.tipos_proceso?.nombre} ${exp.subtipos_proceso.nombre}`
        : (exp.tipos_proceso?.nombre ?? "—"),
      faseNombre: faseActiva?.fases_proceso?.nombre ?? null,
      diasSinMovimiento: item.diasSinMovimiento,
      sinEventos: item.sinEventos,
    };
  });

  // Punto 4: pendientes de notificar tras admisión (ya existía como
  // "Críticos Art. 395" — se conserva la misma regla, ahora contra
  // fases_proceso.nombre en vez del enum viejo, con el día exacto y el
  // asignado, como pide el mockup).
  // El Art. 395 cuenta el plazo en días HÁBILES, no calendario: antes esta
  // tarjeta restaba días corridos, así que avisaba antes del vencimiento legal
  // real (confirmado con el usuario el 2026-08-23, ver REQUERIMIENTOS sección 6).
  const hoyIso = new Date().toISOString().slice(0, 10);
  const itemsPendientesNotificar: ItemPendienteNotificar[] = activos
    .map((exp) => {
      const admisionActiva = exp.expediente_fases.find(
        (f) => f.fases_proceso?.nombre === "Admisión" && f.fecha_fin === null,
      );
      if (!admisionActiva) return null;
      const dias = contarDiasHabilesTranscurridos(
        admisionActiva.fecha_inicio,
        hoyIso,
        diasNoHabiles,
      );
      if (dias <= plazoAdmisionDias) return null;
      const asignacionActiva = exp.asignaciones.find((a) => a.activa);
      return {
        id: exp.id,
        numeroExpediente: exp.numero_expediente,
        tipoNombre: exp.tipos_proceso?.nombre ?? "—",
        diasEnAdmision: dias,
        asignadoNombre: asignacionActiva?.usuarios?.nombre_completo ?? null,
      };
    })
    .filter((item): item is ItemPendienteNotificar => item !== null)
    .sort((a, b) => b.diasEnAdmision - a.diasEnAdmision);

  // Ejecutivos aptos para decretar embargo (pedido del usuario, transcripción
  // del 2026-08-23): notificada la parte, corren 8 días hábiles para presentar
  // excepción; vencido ese término el expediente queda apto para el embargo,
  // con el día 10 hábil como referencia de límite. Solo se listan los que siguen
  // en la fase de Notificación: si ya avanzaron a "Cumplimiento de embargo", el
  // embargo se decretó y la alerta no aplica.
  const itemsAptosParaEmbargo: ItemAptoEmbargo[] = activos
    .map((exp) => {
      if (exp.tipos_proceso?.nombre !== "Ejecución") return null;
      if (!exp.fecha_notificacion_demanda) return null;
      const faseActiva = faseActivaDe(exp.expediente_fases);
      if (faseActiva?.fases_proceso?.nombre !== "Notificación") return null;

      const habiles = contarDiasHabilesTranscurridos(
        exp.fecha_notificacion_demanda,
        hoyIso,
        diasNoHabiles,
      );
      if (habiles <= plazoExcepcionDias) return null;

      const fechaLimite = sumarDiasHabiles(
        exp.fecha_notificacion_demanda,
        plazoEmbargoDias,
        diasNoHabiles,
      );
      return {
        id: exp.id,
        numeroExpediente: exp.numero_expediente,
        diasHabilesDesdeNotificacion: habiles,
        fechaLimiteDecreto: fechaLimite,
        pasadoElLimite: habiles > plazoEmbargoDias,
      };
    })
    .filter((item): item is ItemAptoEmbargo => item !== null)
    .sort((a, b) => b.diasHabilesDesdeNotificacion - a.diasHabilesDesdeNotificacion);

  // Punto 5: edictos sin publicar (Jurisdicción voluntaria) — edicto emitido
  // sin publicación posterior, hace más de 30 días.
  const eventosPorExpediente = new Map<string, { edicto?: string; publicacion?: string }>();
  for (const ev of eventos ?? []) {
    const codigo = ev.tipos_evento?.codigo;
    if (codigo !== "edicto_emplazatorio_emitido" && codigo !== "publicacion_edicto_registrada") continue;
    const actual = eventosPorExpediente.get(ev.expediente_id) ?? {};
    if (codigo === "edicto_emplazatorio_emitido") {
      if (!actual.edicto || new Date(ev.created_at) > new Date(actual.edicto)) actual.edicto = ev.created_at;
    } else {
      if (!actual.publicacion || new Date(ev.created_at) > new Date(actual.publicacion)) {
        actual.publicacion = ev.created_at;
      }
    }
    eventosPorExpediente.set(ev.expediente_id, actual);
  }
  const itemsEdictosSinPublicar: ItemEdictoSinPublicar[] = [];
  for (const [expedienteId, datos] of eventosPorExpediente.entries()) {
    if (!datos.edicto) continue;
    if (datos.publicacion && new Date(datos.publicacion) > new Date(datos.edicto)) continue;
    const dias = Math.floor((new Date().getTime() - new Date(datos.edicto).getTime()) / (1000 * 60 * 60 * 24));
    if (dias <= 30) continue;
    const exp = activos.find((e) => e.id === expedienteId);
    if (!exp) continue;
    itemsEdictosSinPublicar.push({
      id: exp.id,
      numeroExpediente: exp.numero_expediente,
      subtipoNombre: exp.subtipos_proceso?.nombre ?? null,
      diasDesdeEdicto: dias,
    });
  }
  itemsEdictosSinPublicar.sort((a, b) => b.diasDesdeEdicto - a.diasDesdeEdicto);

  // Indicadores generales (RF-16/RF-17, ya existentes — se conservan debajo
  // del Panel Principal, sin la aproximación vieja de "resueltos" que este
  // dashboard usaba antes: expedientes.cerrado ya existe de verdad, y el
  // dato de "resueltos" real vive en el semáforo/estado de cada expediente,
  // no en un conteo de documentos confirmados).
  const audienciasEsteMes =
    audiencias?.filter((a) => new Date(a.fecha_programada) >= inicioMesActual).length ?? 0;
  const documentosPorValidar = documentos?.filter((d) => d.estado === "validado").length ?? 0;
  const documentosEsteMes = (documentos ?? []).filter((d) => new Date(d.created_at) >= inicioMesActual);
  const conteoPorTipoDoc: Record<string, number> = {};
  for (const doc of documentosEsteMes) {
    const nombre = doc.tipos_documento?.nombre ?? "Otro";
    conteoPorTipoDoc[nombre] = (conteoPorTipoDoc[nombre] ?? 0) + 1;
  }
  const datosPorTipoDoc = Object.entries(conteoPorTipoDoc).map(([tipo, cantidad]) => ({ tipo, cantidad }));
  const expedientesMesActual = (todosExpedientes ?? []).filter(
    (e) => new Date(e.created_at) >= inicioMesActual,
  ).length;
  const expedientesMesAnterior = (todosExpedientes ?? []).filter(
    (e) => new Date(e.created_at) >= inicioMesAnterior && new Date(e.created_at) < inicioMesActual,
  ).length;

  // RF-17: "resueltos" ya no se aproxima con documentos confirmados (OT-01
  // sección 3.6) — usa el cierre real de expedientes.cerrado (OT-03).
  const expedientesCerradosMes = (todosExpedientes ?? []).filter(
    (e) => e.cerrado && e.fecha_cierre && new Date(e.fecha_cierre) >= inicioMesActual,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Panel del Juez</h1>
          <p className="text-sm text-muted-foreground">
            Actualizado en tiempo real · {activos.length} expedientes activos.
          </p>
        </div>
        <span className="rounded-sm bg-emerald-500/10 px-2 py-1 text-xs font-semibold uppercase text-emerald-700">
          Tiempo real
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expedientes activos por tipo de proceso</CardTitle>
        </CardHeader>
        <CardContent>
          <BarrasCategoriaChart datos={datosPorCategoria} />
        </CardContent>
      </Card>

      <TarjetaSemaforo filas={filasSemaforo} tipos={tiposParaFiltro} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TarjetaMovimientosSinTrabajar items={itemsMovimientosSinTrabajar} umbralDias={umbralInactividadDias} />
        <TarjetaPendientesNotificar items={itemsPendientesNotificar} plazoAdmisionDias={plazoAdmisionDias} />
        <TarjetaEdictosSinPublicar items={itemsEdictosSinPublicar} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <TarjetaAptosParaEmbargo
          items={itemsAptosParaEmbargo}
          plazoExcepcionDias={plazoExcepcionDias}
          plazoEmbargoDias={plazoEmbargoDias}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icono={Gavel} label="Audiencias este mes" valor={audienciasEsteMes} />
        <StatCard icono={FileText} label="Documentos por validar" valor={documentosPorValidar} />
        <StatCard
          icono={FileCheck}
          label="Expedientes cerrados (mes)"
          valor={expedientesCerradosMes}
          destacado
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos Emitidos Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            {datosPorTipoDoc.length > 0 ? (
              <DocumentosPorTipoChart datos={datosPorTipoDoc} />
            ) : (
              <p className="text-sm text-muted-foreground">Sin documentos generados este mes todavía.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comparativo Mensual de Expedientes Ingresados</CardTitle>
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
      </div>
    </div>
  );
}
