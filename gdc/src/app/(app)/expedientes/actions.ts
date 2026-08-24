"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getConfiguracionSistema, getDiasNoHabiles } from "@/lib/catalogos";
import {
  esFaseDeNotificacion,
  faseInicial,
  siguienteFase,
  type FaseProceso,
} from "@/lib/fases";
import {
  calcularVentana,
  calcularVentanaPreliminar,
  ubicarEnVentana,
  type VentanaAudiencia,
} from "@/lib/ventana-audiencia";

export type EstadoCrearExpediente = { error?: string; advertencia?: string; ok?: boolean };

export async function crearExpediente(
  _prevState: EstadoCrearExpediente,
  formData: FormData,
): Promise<EstadoCrearExpediente> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const numeroExpediente = (formData.get("numero_expediente") as string)?.trim();
  const tipoProcesoId = Number(formData.get("tipo_proceso_id"));
  const subtipoProcesoIdRaw = formData.get("subtipo_proceso_id") as string;
  const subtipoProcesoId = subtipoProcesoIdRaw ? Number(subtipoProcesoIdRaw) : null;
  const cuantiaRaw = (formData.get("cuantia") as string)?.trim();
  const cuantia = cuantiaRaw ? Number(cuantiaRaw) : null;
  const esLanzamiento = formData.get("es_lanzamiento") === "on";
  const fisicoElectronico = (formData.get("fisico_electronico") as string) || null;
  const municipalCircuito = (formData.get("municipal_circuito") as string) || null;
  const pretension = (formData.get("pretension") as string)?.trim() || null;
  const fechaRegistro =
    (formData.get("fecha_registro") as string) || new Date().toISOString().slice(0, 10);
  const asistenteId = (formData.get("asistente_id") as string) || null;

  if (!numeroExpediente || !tipoProcesoId) {
    return { error: "Número de expediente y tipo de proceso son obligatorios" };
  }
  if (cuantiaRaw && (Number.isNaN(cuantia) || (cuantia ?? 0) < 0)) {
    return { error: "La cuantía debe ser un número válido" };
  }

  let advertencia: string | undefined;
  if (!esLanzamiento && cuantia !== null) {
    const config = await getConfiguracionSistema();
    if (config && cuantia > Number(config.tope_cuantia)) {
      if (config.modo_validacion_cuantia === "bloquear") {
        return {
          error: `La cuantía excede el tope de B/.${config.tope_cuantia} (solo permitido en lanzamientos)`,
        };
      }
      advertencia = `Atención: la cuantía excede el tope de B/.${config.tope_cuantia} configurado.`;
    }
  }

  const supabase = await createClient();

  // El Excel diferencia por tipo (ej. "Monto de mandamiento de pago" en vez de
  // "Cuantía"), pero el campo subyacente es el mismo `cuantia` — solo cambia
  // la etiqueta en el formulario (OT-04, sección 3.4).
  const { data: tipoProceso } = await supabase
    .from("tipos_proceso")
    .select("nombre")
    .eq("id", tipoProcesoId)
    .single();
  const esMatrimonio = tipoProceso?.nombre === "Matrimonio";

  const { data: expediente, error: errorInsert } = await supabase
    .from("expedientes")
    .insert({
      numero_expediente: numeroExpediente,
      tipo_proceso_id: tipoProcesoId,
      subtipo_proceso_id: subtipoProcesoId,
      cuantia: esMatrimonio ? null : cuantia,
      es_lanzamiento: esMatrimonio ? false : esLanzamiento,
      pretension: esMatrimonio ? null : pretension,
      fisico_electronico: fisicoElectronico,
      municipal_circuito: municipalCircuito,
      created_by: actual.id,
      despacho_id: actual.despacho_id,
      // Nace en la fecha que indique el formulario (por defecto, hoy); el
      // Juez puede corregirla luego desde la pestaña de Eventos (OT-04).
      fecha_registro: fechaRegistro,
      estado_matrimonio: esMatrimonio ? "en_tramite" : null,
    })
    .select("id")
    .single();

  if (errorInsert || !expediente) {
    return { error: `No se pudo crear el expediente: ${errorInsert?.message}` };
  }

  // Algunos tipos de proceso (Matrimonio, y por ahora "Declarativos especiales"
  // y "Desacato a los tribunales" — ver OT-02) no tienen catálogo de fases
  // propio todavía: el expediente se crea igual, simplemente sin fase inicial,
  // en vez de fallar.
  const { data: fasesDelTipo } = await supabase
    .from("fases_proceso")
    .select("id, tipo_proceso_id, nombre, orden, es_fase_inicial")
    .eq("tipo_proceso_id", tipoProcesoId);

  const inicial = faseInicial((fasesDelTipo ?? []) as FaseProceso[]);
  if (inicial) {
    const { error: errorFase } = await supabase.from("expediente_fases").insert({
      expediente_id: expediente.id,
      fase_id: inicial.id,
    });

    if (errorFase) {
      return { error: `Expediente creado, pero falló registrar la fase inicial: ${errorFase.message}` };
    }
  }

  if (asistenteId) {
    await supabase.from("asignaciones").insert({
      expediente_id: expediente.id,
      asistente_id: asistenteId,
      asignado_por: actual.id,
    });
  }

  revalidatePath("/expedientes");
  // Modo "alertar" (RF-35): no bloquea la creación, pero la advertencia debe
  // seguir siendo visible — se pasa como query param a la página de destino
  // en vez de perderse silenciosamente al redirigir.
  const destino = advertencia
    ? `/expedientes/${expediente.id}?advertencia=${encodeURIComponent(advertencia)}`
    : `/expedientes/${expediente.id}`;
  redirect(destino);
}

export type EstadoAvanzarFase = { error?: string; advertencia?: string; ok?: boolean };

export async function avanzarFase(
  _prevState: EstadoAvanzarFase,
  formData: FormData,
): Promise<EstadoAvanzarFase> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const expedienteId = formData.get("expediente_id") as string;
  const fechaNotificacion = formData.get("fecha_notificacion_demanda") as string;
  const fechaAudiencia = formData.get("fecha_audiencia") as string;

  const supabase = await createClient();
  const { data: expedienteTipo } = await supabase
    .from("expedientes")
    .select("tipo_proceso_id")
    .eq("id", expedienteId)
    .single();

  if (!expedienteTipo) {
    return { error: "No se encontró el expediente" };
  }

  const { data: fasesDelTipo } = await supabase
    .from("fases_proceso")
    .select("id, tipo_proceso_id, nombre, orden, es_fase_inicial")
    .eq("tipo_proceso_id", expedienteTipo.tipo_proceso_id);

  const { data: faseActual, error: errorFaseActual } = await supabase
    .from("expediente_fases")
    .select("id, fase_id")
    .eq("expediente_id", expedienteId)
    .is("fecha_fin", null)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .single();

  if (errorFaseActual || !faseActual) {
    return { error: "No se encontró la fase activa de este expediente" };
  }

  const proxima = siguienteFase((fasesDelTipo ?? []) as FaseProceso[], faseActual.fase_id);

  if (!proxima) {
    return { error: "El expediente ya está en la última fase de su catálogo" };
  }

  // "Notificación de la demanda" es el nombre de la fase en Declarativo;
  // Ejecución la llama solo "Notificación". Antes solo se capturaba la fecha en
  // el primer caso, así que ningún expediente ejecutivo llegaba a tener
  // fecha_notificacion_demanda — y sin ella no hay forma de contar el término de
  // excepción de los ejecutivos.
  const esFaseNotificacion = esFaseDeNotificacion(proxima.nombre);

  if (esFaseNotificacion && !fechaNotificacion) {
    return { error: "Debes indicar la fecha de notificación para avanzar a esta fase" };
  }

  const esAudienciaPreliminar = proxima.nombre === "Audiencia preliminar";
  const esAudienciaFondo = proxima.nombre === "Audiencia de fondo";

  if ((esAudienciaPreliminar || esAudienciaFondo) && !fechaAudiencia) {
    return { error: "Debes indicar la fecha programada de la audiencia para avanzar a esta fase" };
  }

  let ventana: VentanaAudiencia | null = null;

  if (esAudienciaPreliminar || esAudienciaFondo) {
    const [{ data: expediente }, diasNoHabiles] = await Promise.all([
      supabase
        .from("expedientes")
        .select(
          `fecha_notificacion_demanda,
           subtipos_proceso(plazo_contestacion_dias, plazo_audiencia_min_dias, plazo_audiencia_max_dias,
                            plazo_audiencia_fondo_min_dias, plazo_audiencia_fondo_max_dias)`,
        )
        .eq("id", expedienteId)
        .single(),
      getDiasNoHabiles(),
    ]);

    const subtipo = expediente?.subtipos_proceso;

    if (esAudienciaPreliminar) {
      // La ventana arranca cuando VENCE el término de contestación, no cuando se
      // notifica, y se cuenta en días hábiles (confirmado con el usuario el
      // 2026-08-23 — ver REQUERIMIENTOS sección 6).
      ventana = calcularVentanaPreliminar(
        expediente?.fecha_notificacion_demanda ?? null,
        subtipo?.plazo_contestacion_dias ?? null,
        subtipo?.plazo_audiencia_min_dias ?? null,
        subtipo?.plazo_audiencia_max_dias ?? null,
        diasNoHabiles,
      );
    } else {
      const { data: audienciaPreliminar } = await supabase
        .from("audiencias")
        .select("fecha_programada")
        .eq("expediente_id", expedienteId)
        .eq("tipo", "preliminar")
        .order("fecha_programada", { ascending: false })
        .limit(1)
        .maybeSingle();
      ventana = calcularVentana(
        audienciaPreliminar?.fecha_programada ?? null,
        subtipo?.plazo_audiencia_fondo_min_dias ?? null,
        subtipo?.plazo_audiencia_fondo_max_dias ?? null,
        diasNoHabiles,
      );
    }
  }

  const { error: errorCierre } = await supabase
    .from("expediente_fases")
    .update({ fecha_fin: new Date().toISOString() })
    .eq("id", faseActual.id);

  if (errorCierre) {
    return { error: `No se pudo cerrar la fase actual: ${errorCierre.message}` };
  }

  const { error: errorNuevaFase } = await supabase.from("expediente_fases").insert({
    expediente_id: expedienteId,
    fase_id: proxima.id,
  });

  if (errorNuevaFase) {
    return { error: `No se pudo registrar la nueva fase: ${errorNuevaFase.message}` };
  }

  if (esFaseNotificacion && fechaNotificacion) {
    await supabase
      .from("expedientes")
      .update({ fecha_notificacion_demanda: fechaNotificacion })
      .eq("id", expedienteId);
  }

  let advertencia: string | undefined;

  if ((esAudienciaPreliminar || esAudienciaFondo) && fechaAudiencia) {
    const { error: errorAudiencia } = await supabase.from("audiencias").insert({
      expediente_id: expedienteId,
      tipo: esAudienciaPreliminar ? "preliminar" : "fondo",
      fecha_programada: fechaAudiencia,
      fecha_minima_calculada: ventana?.desde ?? null,
      fecha_limite_calculada: ventana?.hasta ?? null,
    });
    if (errorAudiencia) {
      return { error: `Fase avanzada, pero falló programar la audiencia: ${errorAudiencia.message}` };
    }

    // Se avisa, no se bloquea: el juez puede tener motivos para salirse del
    // rango legal, pero tiene que verlo. Si no hay ventana calculable (falta el
    // término de contestación del subtipo o la fecha de notificación) también se
    // avisa, para que no parezca que la fecha quedó validada contra algo.
    if (!ventana) {
      advertencia =
        "La audiencia quedó programada, pero no se pudo calcular su ventana legal: falta la fecha de notificación o los plazos del subtipo de proceso.";
    } else {
      const ubicacion = ubicarEnVentana(fechaAudiencia, ventana);
      if (ubicacion !== "dentro") {
        advertencia = `La fecha programada cae ${ubicacion === "antes" ? "antes del inicio" : "después del límite"} de la ventana legal (${ventana.desde} a ${ventana.hasta}, en días hábiles desde el vencimiento del término de contestación).`;
      }
    }
  }

  revalidatePath("/expedientes");
  revalidatePath("/calendario");
  return { ok: true, advertencia };
}

export type EstadoAsignarExpediente = { error?: string; ok?: boolean };

export async function asignarExpediente(
  _prevState: EstadoAsignarExpediente,
  formData: FormData,
): Promise<EstadoAsignarExpediente> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const expedienteId = formData.get("expediente_id") as string;
  const asistenteId = formData.get("asistente_id") as string;

  if (!expedienteId || !asistenteId) {
    return { error: "Selecciona un Asistente" };
  }

  const supabase = await createClient();

  // Solo puede haber una asignación activa por expediente: se desactiva la anterior (si existe).
  const { error: errorDesactivar } = await supabase
    .from("asignaciones")
    .update({ activa: false })
    .eq("expediente_id", expedienteId)
    .eq("activa", true);

  if (errorDesactivar) {
    return { error: `No se pudo actualizar la asignación anterior: ${errorDesactivar.message}` };
  }

  const { error: errorInsert } = await supabase.from("asignaciones").insert({
    expediente_id: expedienteId,
    asistente_id: asistenteId,
    asignado_por: actual.id,
  });

  if (errorInsert) {
    return { error: `No se pudo asignar el expediente: ${errorInsert.message}` };
  }

  revalidatePath("/expedientes");
  return { ok: true };
}

export type EstadoEliminarExpediente = { error?: string; ok?: boolean };

// RF-33-EXTRA: el borrado en sí queda registrado automáticamente en `auditoria`
// por el trigger de base de datos (migración 013) — junto con sus fases y
// audiencias en cascada (migración 20260709150001) — no hace falta duplicarlo
// aquí a mano.
export async function eliminarExpediente(id: string): Promise<EstadoEliminarExpediente> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("expedientes").delete().eq("id", id);
  if (error) return { error: `No se pudo eliminar el expediente: ${error.message}` };

  revalidatePath("/expedientes");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  return { ok: true };
}
