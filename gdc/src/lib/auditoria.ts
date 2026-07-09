import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * RF-33: registra acciones del Administrador sobre configuración, usuarios o
 * catálogos. Las eliminaciones de expedientes/documentos ya quedan cubiertas
 * automáticamente por triggers de base de datos (migración 013) — esta
 * función es para las acciones que no tienen un trigger detrás.
 */
export async function registrarAuditoria(
  usuarioId: string,
  accion: string,
  entidad: string,
  entidadId: string | null,
  detalle?: Record<string, unknown>,
) {
  const supabase = await createClient();
  await supabase.from("auditoria").insert({
    usuario_id: usuarioId,
    accion,
    entidad,
    entidad_id: entidadId,
    detalle: (detalle as Json) ?? null,
  });
}
