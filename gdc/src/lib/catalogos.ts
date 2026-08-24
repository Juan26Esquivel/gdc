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

export type TipoEvento = {
  id: string;
  codigo: string;
  nombre: string;
  tipo_proceso_id: number | null;
  alimenta: string;
  es_generado_por_sistema: boolean;
};

export async function getTiposEvento(): Promise<TipoEvento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tipos_evento")
    .select("id, codigo, nombre, tipo_proceso_id, alimenta, es_generado_por_sistema")
    .order("codigo");
  return data ?? [];
}

export async function getDespachos() {
  const supabase = await createClient();
  const { data } = await supabase.from("despachos").select("id, nombre, tipo").order("nombre");
  return data ?? [];
}

/**
 * Catálogo de días no hábiles (migración 20260823120001) como Set de
 * "YYYY-MM-DD", que es la forma en que lo consumen las funciones puras de
 * lib/dias-habiles.ts. Los sábados y domingos no están aquí: se excluyen por
 * cálculo, no por catálogo.
 */
export async function getDiasNoHabiles(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("dias_no_habiles").select("fecha").order("fecha");
  return new Set((data ?? []).map((d) => d.fecha));
}
