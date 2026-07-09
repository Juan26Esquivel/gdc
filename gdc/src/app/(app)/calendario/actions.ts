"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type EstadoMarcarAudiencia = { error?: string; ok?: boolean };

type EstadoAudiencia = Database["public"]["Enums"]["estado_audiencia"];

const ESTADOS_VALIDOS: EstadoAudiencia[] = [
  "celebrada",
  "suspendida",
  "continuada",
  "terminada_por_incomparecencia",
];

function esEstadoValido(valor: string): valor is EstadoAudiencia {
  return (ESTADOS_VALIDOS as string[]).includes(valor);
}

export async function marcarEstadoAudiencia(
  _prevState: EstadoMarcarAudiencia,
  formData: FormData,
): Promise<EstadoMarcarAudiencia> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const audienciaId = formData.get("audiencia_id") as string;
  const estado = formData.get("estado") as string;

  if (!audienciaId || !esEstadoValido(estado)) {
    return { error: "Estado inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("audiencias")
    .update({ estado })
    .eq("id", audienciaId);

  if (error) {
    return { error: `No se pudo actualizar la audiencia: ${error.message}` };
  }

  revalidatePath("/calendario");
  return { ok: true };
}
