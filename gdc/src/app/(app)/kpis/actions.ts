"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { EntidadBaseKpi, MetricaKpi } from "@/lib/kpis";

export type EstadoKpi = { error?: string; ok?: boolean };

const ENTIDADES_VALIDAS: EntidadBaseKpi[] = ["expediente", "documento", "audiencia"];
const METRICAS_VALIDAS: MetricaKpi[] = ["conteo", "porcentaje_cumplimiento", "promedio_dias"];

function umbral(formData: FormData, campo: string): number | null {
  const valor = formData.get(campo) as string;
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

async function verificarPermiso() {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador" && actual?.rol !== "analista_datos") {
    return null;
  }
  return actual;
}

export async function crearKpi(_prevState: EstadoKpi, formData: FormData): Promise<EstadoKpi> {
  const actual = await verificarPermiso();
  if (!actual) return { error: "No tienes permiso para configurar KPIs" };

  const nombre = (formData.get("nombre") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const entidad_base = formData.get("entidad_base") as string;
  const metrica = formData.get("metrica") as string;

  if (!nombre || !entidad_base || !metrica) {
    return { error: "Nombre, entidad base y métrica son obligatorios" };
  }
  if (!ENTIDADES_VALIDAS.includes(entidad_base as EntidadBaseKpi)) {
    return { error: "Entidad base inválida" };
  }
  if (!METRICAS_VALIDAS.includes(metrica as MetricaKpi)) {
    return { error: "Métrica inválida" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kpis_config").insert({
    nombre,
    descripcion,
    entidad_base: entidad_base as EntidadBaseKpi,
    metrica: metrica as MetricaKpi,
    umbral_optimo: umbral(formData, "umbral_optimo"),
    umbral_alerta: umbral(formData, "umbral_alerta"),
    umbral_critico: umbral(formData, "umbral_critico"),
    activo: formData.get("activo") !== "false",
    configurado_por: actual.id,
  });

  if (error) return { error: `No se pudo crear el KPI: ${error.message}` };

  revalidatePath("/kpis");
  return { ok: true };
}

export async function editarKpi(_prevState: EstadoKpi, formData: FormData): Promise<EstadoKpi> {
  const actual = await verificarPermiso();
  if (!actual) return { error: "No tienes permiso para configurar KPIs" };

  const id = formData.get("id") as string;
  const nombre = (formData.get("nombre") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const entidad_base = formData.get("entidad_base") as string;
  const metrica = formData.get("metrica") as string;

  if (!id || !nombre || !entidad_base || !metrica) {
    return { error: "Nombre, entidad base y métrica son obligatorios" };
  }
  if (!ENTIDADES_VALIDAS.includes(entidad_base as EntidadBaseKpi)) {
    return { error: "Entidad base inválida" };
  }
  if (!METRICAS_VALIDAS.includes(metrica as MetricaKpi)) {
    return { error: "Métrica inválida" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("kpis_config")
    .update({
      nombre,
      descripcion,
      entidad_base: entidad_base as EntidadBaseKpi,
      metrica: metrica as MetricaKpi,
      umbral_optimo: umbral(formData, "umbral_optimo"),
      umbral_alerta: umbral(formData, "umbral_alerta"),
      umbral_critico: umbral(formData, "umbral_critico"),
    })
    .eq("id", id);

  if (error) return { error: `No se pudo actualizar el KPI: ${error.message}` };

  revalidatePath("/kpis");
  return { ok: true };
}

export async function alternarActivoKpi(id: string, activo: boolean): Promise<EstadoKpi> {
  const actual = await verificarPermiso();
  if (!actual) return { error: "No tienes permiso para configurar KPIs" };

  const supabase = await createClient();
  const { error } = await supabase.from("kpis_config").update({ activo }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kpis");
  return { ok: true };
}

// RF-27: reporte de volumen de documentos emitidos por período, exportable
// como CSV (mes × tipo de documento). Disponible para los mismos roles que
// pueden ver /kpis (administrador, juez, analista_datos) — la política RLS
// de `documentos` ya cubre a los tres.
export type ReporteVolumenDocumentos = { csv?: string; error?: string };

export async function obtenerVolumenDocumentosCsv(): Promise<ReporteVolumenDocumentos> {
  const actual = await getUsuarioActual();
  if (
    actual?.rol !== "administrador" &&
    actual?.rol !== "juez" &&
    actual?.rol !== "analista_datos"
  ) {
    return { error: "No tienes permiso para exportar este reporte" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("created_at, tipos_documento(nombre)")
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };

  const conteo = new Map<string, number>();
  for (const doc of data ?? []) {
    const fecha = new Date(doc.created_at);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    const tipo = doc.tipos_documento?.nombre ?? "Sin tipo";
    const clave = `${mes}|${tipo}`;
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }

  const filas = [...conteo.entries()]
    .map(([clave, cantidad]) => {
      const [mes, tipo] = clave.split("|");
      return { mes, tipo, cantidad };
    })
    .sort((a, b) => a.mes.localeCompare(b.mes) || a.tipo.localeCompare(b.tipo));

  const encabezado = "Mes,Tipo de Documento,Cantidad";
  const lineas = filas.map((f) => `${f.mes},"${f.tipo}",${f.cantidad}`);
  return { csv: [encabezado, ...lineas].join("\n") };
}

export async function eliminarKpi(id: string): Promise<EstadoKpi> {
  const actual = await verificarPermiso();
  if (!actual) return { error: "No tienes permiso para configurar KPIs" };

  const supabase = await createClient();
  const { error } = await supabase.from("kpis_config").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kpis");
  return { ok: true };
}
