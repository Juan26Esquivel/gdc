import { createClient } from "@/lib/supabase/server";
import type { FaseProceso } from "@/lib/fases";

export async function getTiposProceso() {
  const supabase = await createClient();
  const { data } = await supabase.from("tipos_proceso").select("id, nombre").order("id");
  return data ?? [];
}

export async function getSubtiposProceso() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subtipos_proceso")
    .select("id, tipo_proceso_id, nombre")
    .order("id");
  return data ?? [];
}

export async function getFasesProceso(): Promise<FaseProceso[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fases_proceso")
    .select("id, tipo_proceso_id, nombre, orden, es_fase_inicial")
    .order("tipo_proceso_id")
    .order("orden");
  return data ?? [];
}

export async function getConfiguracionSistema() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("configuracion_sistema")
    .select("tope_cuantia, modo_validacion_cuantia, plazo_admision_dias, umbral_inactividad_dias")
    .eq("id", 1)
    .single();
  return data;
}
