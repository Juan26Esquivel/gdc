"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getConfiguracionSistema } from "@/lib/catalogos";
import { ORDEN_FASES } from "@/lib/fases";

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
  const { data: expediente, error: errorInsert } = await supabase
    .from("expedientes")
    .insert({
      numero_expediente: numeroExpediente,
      tipo_proceso_id: tipoProcesoId,
      subtipo_proceso_id: subtipoProcesoId,
      cuantia,
      es_lanzamiento: esLanzamiento,
      created_by: actual.id,
    })
    .select("id")
    .single();

  if (errorInsert || !expediente) {
    return { error: `No se pudo crear el expediente: ${errorInsert?.message}` };
  }

  const { error: errorFase } = await supabase.from("expediente_fases").insert({
    expediente_id: expediente.id,
    fase: "admision",
  });

  if (errorFase) {
    return { error: `Expediente creado, pero falló registrar la fase inicial: ${errorFase.message}` };
  }

  revalidatePath("/expedientes");
  return { ok: true, advertencia };
}

export type EstadoAvanzarFase = { error?: string; ok?: boolean };

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

  const supabase = await createClient();
  const { data: faseActual, error: errorFaseActual } = await supabase
    .from("expediente_fases")
    .select("id, fase")
    .eq("expediente_id", expedienteId)
    .is("fecha_fin", null)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .single();

  if (errorFaseActual || !faseActual) {
    return { error: "No se encontró la fase activa de este expediente" };
  }

  const indiceActual = ORDEN_FASES.indexOf(faseActual.fase);
  const siguienteFase = ORDEN_FASES[indiceActual + 1];

  if (!siguienteFase) {
    return { error: "El expediente ya está en la última fase (audiencia de fondo)" };
  }

  if (siguienteFase === "notificacion_demanda" && !fechaNotificacion) {
    return { error: "Debes indicar la fecha de notificación de la demanda para avanzar a esta fase" };
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
    fase: siguienteFase,
  });

  if (errorNuevaFase) {
    return { error: `No se pudo registrar la nueva fase: ${errorNuevaFase.message}` };
  }

  if (siguienteFase === "notificacion_demanda" && fechaNotificacion) {
    await supabase
      .from("expedientes")
      .update({ fecha_notificacion_demanda: fechaNotificacion })
      .eq("id", expedienteId);
  }

  revalidatePath("/expedientes");
  return { ok: true };
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
