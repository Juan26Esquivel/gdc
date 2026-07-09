import { createClient } from "@/lib/supabase/server";

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

export async function getConfiguracionSistema() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("configuracion_sistema")
    .select("tope_cuantia, modo_validacion_cuantia, plazo_admision_dias")
    .eq("id", 1)
    .single();
  return data;
}
