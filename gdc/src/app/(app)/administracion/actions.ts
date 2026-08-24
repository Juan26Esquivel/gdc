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

  const supabase = await createClient();
  const { error } = await supabase
    .from("configuracion_sistema")
    .update({
      tope_cuantia: topeCuantia,
      modo_validacion_cuantia: modoValidacion,
      plazo_admision_dias: plazoAdmisionDias,
      umbral_inactividad_dias: umbralInactividadDias,
      actualizado_por: actual.id,
    })
    .eq("id", 1);

  if (error) return { error: `No se pudo actualizar la configuración: ${error.message}` };

  await registrarAuditoria(actual.id, "editar_configuracion_sistema", "configuracion_sistema", "1", {
    tope_cuantia: topeCuantia,
    modo_validacion_cuantia: modoValidacion,
    plazo_admision_dias: plazoAdmisionDias,
    umbral_inactividad_dias: umbralInactividadDias,
  });

  revalidatePath("/administracion");
  return { ok: true };
}
