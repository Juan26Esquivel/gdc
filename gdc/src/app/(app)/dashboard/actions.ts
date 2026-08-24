"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type EstadoAtenderEmbargo = { error?: string; ok?: boolean };

/**
 * Marca como atendida la alerta "Ejecutivos aptos para decretar embargo",
 * registrando el evento `embargo_decretado` (migración 20260823180001). Es el
 * atajo de un clic desde el Panel del Juez; el mismo evento se puede registrar
 * desde la pestaña "Eventos y trazabilidad" del expediente, donde además se
 * puede dejar en el detalle qué resolución lo decretó.
 *
 * El Panel del Juez solo lo ven el Juez y el Administrador (los otros dos roles
 * reciben otra pantalla), pero igual se verifica el rol aquí: una Server Action
 * es alcanzable por POST directo, no solo desde el botón.
 */
export async function confirmarEmbargoDecretado(
  _prevState: EstadoAtenderEmbargo,
  formData: FormData,
): Promise<EstadoAtenderEmbargo> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador" && actual?.rol !== "juez") {
    return { error: "No tienes permiso para confirmar el decreto de embargo" };
  }

  const expedienteId = formData.get("expediente_id") as string;
  if (!expedienteId) return { error: "Expediente inválido" };

  const supabase = await createClient();

  const { data: tipoEvento } = await supabase
    .from("tipos_evento")
    .select("id")
    .eq("codigo", "embargo_decretado")
    .maybeSingle();

  // Si falta el catálogo, la migración 20260823180001 no se aplicó todavía: mejor
  // decirlo que insertar un evento sin tipo o fallar con un error de base.
  if (!tipoEvento) {
    return { error: "Falta el tipo de evento «Embargo decretado» en el catálogo del sistema" };
  }

  const { error } = await supabase.from("eventos_expediente").insert({
    expediente_id: expedienteId,
    tipo_evento_id: tipoEvento.id,
    fecha_evento: new Date().toISOString().slice(0, 10),
    detalle: "Embargo decretado — confirmado desde la alerta del Panel del Juez",
    registrado_por: actual.id,
  });

  if (error) return { error: `No se pudo confirmar: ${error.message}` };

  revalidatePath("/dashboard");
  revalidatePath(`/expedientes/${expedienteId}`);
  return { ok: true };
}
