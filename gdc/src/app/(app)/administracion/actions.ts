"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type EstadoAdministracion = { error?: string; ok?: boolean };

function diasONulo(formData: FormData, campo: string): number | null {
  const valor = formData.get(campo) as string;
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export async function actualizarPlazosSubtipo(
  _prevState: EstadoAdministracion,
  formData: FormData,
): Promise<EstadoAdministracion> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const id = Number(formData.get("id"));
  if (!id) return { error: "Subtipo inválido" };

  const cambios = {
    plazo_contestacion_dias: diasONulo(formData, "plazo_contestacion_dias"),
    plazo_audiencia_min_dias: diasONulo(formData, "plazo_audiencia_min_dias"),
    plazo_audiencia_max_dias: diasONulo(formData, "plazo_audiencia_max_dias"),
    plazo_audiencia_fondo_min_dias: diasONulo(formData, "plazo_audiencia_fondo_min_dias"),
    plazo_audiencia_fondo_max_dias: diasONulo(formData, "plazo_audiencia_fondo_max_dias"),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("subtipos_proceso").update(cambios).eq("id", id);
  if (error) return { error: `No se pudo actualizar el subtipo: ${error.message}` };

  await registrarAuditoria(actual.id, "editar_subtipo_proceso", "subtipo_proceso", String(id), cambios);

  revalidatePath("/administracion");
  return { ok: true };
}

export async function actualizarConfiguracionSistema(
  _prevState: EstadoAdministracion,
  formData: FormData,
): Promise<EstadoAdministracion> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const topeCuantia = Number(formData.get("tope_cuantia"));
  const modoValidacion = formData.get("modo_validacion_cuantia") as string;
  const plazoAdmisionDias = Number(formData.get("plazo_admision_dias"));
  const umbralInactividadDias = Number(formData.get("umbral_inactividad_dias"));
  const plazoExcepcionEjecutivoDias = Number(formData.get("plazo_excepcion_ejecutivo_dias"));
  const plazoEmbargoEjecutivoDias = Number(formData.get("plazo_embargo_ejecutivo_dias"));

  if (!Number.isFinite(topeCuantia) || topeCuantia <= 0) {
    return { error: "El tope de cuantía debe ser un número mayor a 0" };
  }
  if (modoValidacion !== "bloquear" && modoValidacion !== "alertar") {
    return { error: "Modo de validación inválido" };
  }
  if (!Number.isFinite(plazoAdmisionDias) || plazoAdmisionDias <= 0) {
    return { error: "El plazo de admisión debe ser un número mayor a 0" };
  }
  if (!Number.isFinite(umbralInactividadDias) || umbralInactividadDias <= 0) {
    return { error: "El umbral de inactividad debe ser un número mayor a 0" };
  }
  if (!Number.isFinite(plazoExcepcionEjecutivoDias) || plazoExcepcionEjecutivoDias <= 0) {
    return { error: "El término de excepción debe ser un número mayor a 0" };
  }
  if (!Number.isFinite(plazoEmbargoEjecutivoDias) || plazoEmbargoEjecutivoDias <= 0) {
    return { error: "El plazo para decretar el embargo debe ser un número mayor a 0" };
  }
  // El embargo se decreta DESPUÉS de que venza la excepción: al revés, la alerta
  // nacería ya vencida para todo expediente.
  if (plazoEmbargoEjecutivoDias <= plazoExcepcionEjecutivoDias) {
    return {
      error: "El plazo para decretar el embargo debe ser mayor que el término de excepción",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("configuracion_sistema")
    .update({
      tope_cuantia: topeCuantia,
      modo_validacion_cuantia: modoValidacion,
      plazo_admision_dias: plazoAdmisionDias,
      umbral_inactividad_dias: umbralInactividadDias,
      plazo_excepcion_ejecutivo_dias: plazoExcepcionEjecutivoDias,
      plazo_embargo_ejecutivo_dias: plazoEmbargoEjecutivoDias,
      actualizado_por: actual.id,
    })
    .eq("id", 1);

  if (error) return { error: `No se pudo actualizar la configuración: ${error.message}` };

  await registrarAuditoria(actual.id, "editar_configuracion_sistema", "configuracion_sistema", "1", {
    tope_cuantia: topeCuantia,
    modo_validacion_cuantia: modoValidacion,
    plazo_admision_dias: plazoAdmisionDias,
    umbral_inactividad_dias: umbralInactividadDias,
    plazo_excepcion_ejecutivo_dias: plazoExcepcionEjecutivoDias,
    plazo_embargo_ejecutivo_dias: plazoEmbargoEjecutivoDias,
  });

  revalidatePath("/administracion");
  return { ok: true };
}

/**
 * Calendario de días no hábiles (migración 20260823120001). Es la base de todo
 * cálculo de términos procesales, así que un día mal cargado mueve plazos
 * reales: por eso cada alta y cada baja quedan en auditoría.
 */
export async function agregarDiaNoHabil(
  _prevState: EstadoAdministracion,
  formData: FormData,
): Promise<EstadoAdministracion> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const fecha = (formData.get("fecha") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();

  if (!fecha || Number.isNaN(new Date(fecha).getTime())) {
    return { error: "La fecha no es válida" };
  }
  if (!descripcion) {
    return { error: "La descripción es obligatoria (ej. Viernes Santo, Receso judicial)" };
  }
  if (descripcion.length > 120) {
    return { error: "La descripción no puede pasar de 120 caracteres" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("dias_no_habiles").insert({ fecha, descripcion });

  if (error) {
    // 23505 = violación de clave única: la fecha ya está cargada.
    if (error.code === "23505") return { error: "Esa fecha ya está registrada como día no hábil" };
    return { error: `No se pudo agregar el día: ${error.message}` };
  }

  await registrarAuditoria(actual.id, "agregar_dia_no_habil", "dia_no_habil", fecha, { descripcion });

  revalidatePath("/administracion");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function eliminarDiaNoHabil(
  _prevState: EstadoAdministracion,
  formData: FormData,
): Promise<EstadoAdministracion> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const fecha = formData.get("fecha") as string;
  if (!fecha) return { error: "Fecha inválida" };

  const supabase = await createClient();
  const { data: eliminados, error } = await supabase
    .from("dias_no_habiles")
    .delete()
    .eq("fecha", fecha)
    .select("fecha, descripcion");

  if (error) return { error: `No se pudo eliminar el día: ${error.message}` };
  if (!eliminados?.length) return { error: "Ese día ya no estaba registrado" };

  // Se guarda la descripción del día eliminado: sin ella, la entrada de
  // auditoría solo diría una fecha y no qué feriado se quitó del calendario.
  await registrarAuditoria(actual.id, "eliminar_dia_no_habil", "dia_no_habil", fecha, {
    descripcion: eliminados[0].descripcion,
  });

  revalidatePath("/administracion");
  revalidatePath("/dashboard");
  return { ok: true };
}
