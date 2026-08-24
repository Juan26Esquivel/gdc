"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type EstadoAccionExpediente = { error?: string; ok?: boolean };

async function puedeActuarSobreExpediente(expedienteId: string) {
  const actual = await getUsuarioActual();
  if (!actual) return null;
  if (actual.rol === "administrador" || actual.rol === "juez") return actual;
  if (actual.rol === "asistente") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("asignaciones")
      .select("id")
      .eq("expediente_id", expedienteId)
      .eq("asistente_id", actual.id)
      .eq("activa", true)
      .maybeSingle();
    return data ? actual : null;
  }
  return null;
}

// OT-04 sección 3.5: un solo formulario de "Registrar nuevo evento" con
// campos condicionales según el tipo elegido. Los 3 tipos que además tocan
// un campo de expedientes (corrección de fecha, override de umbral, estado
// de matrimonio) actualizan ese campo aquí mismo antes de insertar el evento
// manual — nunca se duplica la lógica de cierre, que sigue siendo solo del
// trigger de base de datos (OT-03).
export async function registrarEvento(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const expedienteId = formData.get("expediente_id") as string;
  const actual = await puedeActuarSobreExpediente(expedienteId);
  if (!actual) return { error: "No tienes permiso para registrar eventos en este expediente" };

  const tipoEventoId = formData.get("tipo_evento_id") as string;
  const codigo = formData.get("codigo_evento") as string;
  const fechaEvento = formData.get("fecha_evento") as string;
  const detalle = (formData.get("detalle") as string)?.trim() || null;

  if (!tipoEventoId || !fechaEvento) {
    return { error: "El tipo de evento y la fecha son obligatorios" };
  }

  const supabase = await createClient();

  if (codigo === "correccion_fecha_registro") {
    const nuevaFecha = formData.get("nueva_fecha_registro") as string;
    if (!nuevaFecha) return { error: "Debes indicar la nueva fecha de registro" };
    const { error } = await supabase
      .from("expedientes")
      .update({ fecha_registro: nuevaFecha })
      .eq("id", expedienteId);
    if (error) return { error: `No se pudo corregir la fecha de registro: ${error.message}` };
  }

  if (codigo === "override_umbral_inactividad") {
    const motivo = (formData.get("motivo_omision_umbral") as string)?.trim();
    if (!motivo) return { error: "El motivo es obligatorio para omitir el umbral de inactividad" };
    const { error } = await supabase
      .from("expedientes")
      .update({ omitir_umbral_inactividad: true, motivo_omision_umbral: motivo })
      .eq("id", expedienteId);
    if (error) return { error: `No se pudo activar el override: ${error.message}` };
    // OT-01 sección 3.5: acción administrativa sensible, se registra también
    // en auditoria (además del evento de negocio que se inserta abajo).
    await registrarAuditoria(actual.id, "activar_override_umbral_inactividad", "expediente", expedienteId, {
      motivo,
    });
  }

  if (codigo === "estado_matrimonio_actualizado") {
    const nuevoEstado = formData.get("estado_matrimonio") as string;
    if (!nuevoEstado) return { error: "Debes seleccionar el nuevo estado" };
    const { error } = await supabase
      .from("expedientes")
      .update({ estado_matrimonio: nuevoEstado })
      .eq("id", expedienteId);
    if (error) return { error: `No se pudo actualizar el estado: ${error.message}` };
    // El trigger de OT-03 se encarga de cerrar el expediente si corresponde
    // (celebrado/retirado) y de insertar el evento "expediente_cerrado" — no
    // se duplica esa lógica aquí.
  }

  const { error: errorEvento } = await supabase.from("eventos_expediente").insert({
    expediente_id: expedienteId,
    tipo_evento_id: tipoEventoId,
    fecha_evento: fechaEvento,
    detalle,
    registrado_por: actual.id,
  });

  if (errorEvento) return { error: `No se pudo registrar el evento: ${errorEvento.message}` };

  revalidatePath(`/expedientes/${expedienteId}`);
  return { ok: true };
}

export async function registrarAbonoEmbargo(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const expedienteId = formData.get("expediente_id") as string;
  const actual = await puedeActuarSobreExpediente(expedienteId);
  if (!actual) return { error: "No tienes permiso para registrar abonos en este expediente" };

  const monto = Number(formData.get("monto"));
  const fecha = formData.get("fecha") as string;

  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser un número mayor a 0" };
  }
  if (!fecha) return { error: "La fecha del abono es obligatoria" };

  const supabase = await createClient();
  // El evento "abono_embargo" lo genera el trigger de OT-03 automáticamente
  // al insertar aquí — no se duplica.
  const { error } = await supabase.from("embargo_abonos").insert({
    expediente_id: expedienteId,
    monto,
    fecha,
    registrado_por: actual.id,
  });

  if (error) return { error: `No se pudo registrar el abono: ${error.message}` };

  revalidatePath(`/expedientes/${expedienteId}`);
  return { ok: true };
}
