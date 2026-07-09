import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type EntidadBaseKpi = Database["public"]["Enums"]["entidad_base_kpi"];
export type MetricaKpi = Database["public"]["Enums"]["metrica_kpi"];

export const ENTIDAD_BASE_LABEL: Record<EntidadBaseKpi, string> = {
  expediente: "Expediente",
  documento: "Documento",
  audiencia: "Audiencia",
};

export const METRICA_LABEL: Record<MetricaKpi, string> = {
  conteo: "Conteo",
  porcentaje_cumplimiento: "Porcentaje de cumplimiento",
  promedio_dias: "Promedio de días",
};

export const UNIDAD_METRICA: Record<MetricaKpi, "conteo" | "%" | "días"> = {
  conteo: "conteo",
  porcentaje_cumplimiento: "%",
  promedio_dias: "días",
};

type Item = { fecha: Date; valor: number };

export type ResultadoKpi = {
  valorActual: number | null;
  unidad: "conteo" | "%" | "días";
  serieMensual: { mes: string; valor: number }[];
};

const MESES_SERIE = 6;

/**
 * Datos base (una sola consulta por tabla, reutilizada para todos los KPIs
 * activos de esa entidad). Cada fila trae solo lo necesario para las 3
 * métricas soportadas.
 */
export type DatosBaseKpis = {
  expedientes: {
    id: string;
    created_at: string;
    audiencias: { fecha_programada: string; fecha_limite_calculada: string | null; estado: string }[];
  }[];
  documentos: { id: string; created_at: string; estado: string; fecha_confirmacion: string | null }[];
  audiencias: { id: string; created_at: string; fecha_programada: string; estado: string }[];
};

export async function obtenerDatosBaseKpis(
  supabase: SupabaseClient<Database>,
): Promise<DatosBaseKpis> {
  const [{ data: expedientes }, { data: documentos }, { data: audiencias }] = await Promise.all([
    supabase
      .from("expedientes")
      .select("id, created_at, audiencias(fecha_programada, fecha_limite_calculada, estado)"),
    supabase.from("documentos").select("id, created_at, estado, fecha_confirmacion"),
    supabase.from("audiencias").select("id, created_at, fecha_programada, estado"),
  ]);

  return {
    expedientes: expedientes ?? [],
    documentos: documentos ?? [],
    audiencias: audiencias ?? [],
  };
}

function diasEntre(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Construye la lista de "items" (fecha para agrupar por mes + valor a
 * promediar/sumar) según la combinación entidad+métrica. Cada combinación
 * mapea a un cálculo real y documentado, no a una cifra inventada:
 *
 * - expediente/conteo: expedientes ingresados, agrupados por mes de ingreso.
 * - expediente/porcentaje_cumplimiento: de los expedientes con una audiencia
 *   con plazo calculado, ¿el plazo se cumplió (celebrada a tiempo, o sigue
 *   vigente y aún no vence) o se venció?
 * - expediente/promedio_dias: antigüedad (días desde el ingreso hasta hoy).
 * - documento/conteo: documentos generados, agrupados por mes de generación.
 * - documento/porcentaje_cumplimiento: tasa de confirmación (confirmado / total).
 * - documento/promedio_dias: días entre generación y confirmación (solo
 *   documentos ya confirmados).
 * - audiencia/conteo: audiencias programadas, agrupadas por mes.
 * - audiencia/porcentaje_cumplimiento: de las audiencias cuya fecha ya pasó,
 *   ¿se celebraron o no (suspendida/terminada por incomparecencia)?
 * - audiencia/promedio_dias: días de anticipación entre el registro y la
 *   fecha programada.
 */
function construirItems(
  datos: DatosBaseKpis,
  entidad: EntidadBaseKpi,
  metrica: MetricaKpi,
): Item[] {
  const ahora = new Date();

  if (entidad === "expediente") {
    if (metrica === "conteo") {
      return datos.expedientes.map((e) => ({ fecha: new Date(e.created_at), valor: 1 }));
    }
    if (metrica === "promedio_dias") {
      return datos.expedientes.map((e) => ({
        fecha: new Date(e.created_at),
        valor: diasEntre(new Date(e.created_at), ahora),
      }));
    }
    // porcentaje_cumplimiento
    const items: Item[] = [];
    for (const exp of datos.expedientes) {
      const conPlazo = exp.audiencias.filter((a) => a.fecha_limite_calculada !== null);
      if (conPlazo.length === 0) continue;
      const ultima = conPlazo.reduce((prev, cur) =>
        new Date(cur.fecha_limite_calculada!) > new Date(prev.fecha_limite_calculada!) ? cur : prev,
      );
      const limite = new Date(ultima.fecha_limite_calculada!);
      const celebradaATiempo = ultima.estado === "celebrada" && new Date(ultima.fecha_programada) <= limite;
      const aunEnPlazo = ultima.estado === "programada" && ahora <= limite;
      items.push({ fecha: limite, valor: celebradaATiempo || aunEnPlazo ? 1 : 0 });
    }
    return items;
  }

  if (entidad === "documento") {
    if (metrica === "conteo") {
      return datos.documentos.map((d) => ({ fecha: new Date(d.created_at), valor: 1 }));
    }
    if (metrica === "promedio_dias") {
      return datos.documentos
        .filter((d) => d.fecha_confirmacion !== null)
        .map((d) => ({
          fecha: new Date(d.fecha_confirmacion!),
          valor: diasEntre(new Date(d.created_at), new Date(d.fecha_confirmacion!)),
        }));
    }
    // porcentaje_cumplimiento: tasa de confirmación
    return datos.documentos.map((d) => ({
      fecha: new Date(d.created_at),
      valor: d.estado === "confirmado" ? 1 : 0,
    }));
  }

  // audiencia
  if (metrica === "conteo") {
    return datos.audiencias.map((a) => ({ fecha: new Date(a.fecha_programada), valor: 1 }));
  }
  if (metrica === "promedio_dias") {
    return datos.audiencias.map((a) => ({
      fecha: new Date(a.created_at),
      valor: diasEntre(new Date(a.created_at), new Date(a.fecha_programada)),
    }));
  }
  // porcentaje_cumplimiento: solo audiencias cuya fecha ya pasó
  return datos.audiencias
    .filter((a) => new Date(a.fecha_programada) < ahora)
    .map((a) => ({
      fecha: new Date(a.fecha_programada),
      valor: a.estado === "celebrada" ? 1 : 0,
    }));
}

function agregar(items: Item[], metrica: MetricaKpi): number {
  if (items.length === 0) return 0;
  if (metrica === "conteo") return items.length;
  const suma = items.reduce((s, i) => s + i.valor, 0);
  if (metrica === "porcentaje_cumplimiento") return Math.round((suma / items.length) * 100);
  return Math.round((suma / items.length) * 10) / 10; // promedio_dias, 1 decimal
}

function serieMensual(items: Item[], metrica: MetricaKpi) {
  const ahora = new Date();
  const meses: { inicio: Date; fin: Date; etiqueta: string }[] = [];
  for (let i = MESES_SERIE - 1; i >= 0; i--) {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
    meses.push({
      inicio,
      fin,
      etiqueta: inicio.toLocaleDateString("es-PA", { month: "short", year: "2-digit" }),
    });
  }
  return meses.map(({ inicio, fin, etiqueta }) => ({
    mes: etiqueta,
    valor: agregar(
      items.filter((it) => it.fecha >= inicio && it.fecha < fin),
      metrica,
    ),
  }));
}

export function calcularKpi(
  datos: DatosBaseKpis,
  entidad: EntidadBaseKpi,
  metrica: MetricaKpi,
): ResultadoKpi {
  const items = construirItems(datos, entidad, metrica);
  const ahora = new Date();

  let valorActual: number | null;
  if (metrica === "conteo") {
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    valorActual = items.filter((it) => it.fecha >= inicioMes).length;
  } else {
    valorActual = items.length > 0 ? agregar(items, metrica) : null;
  }

  return {
    valorActual,
    unidad: UNIDAD_METRICA[metrica],
    serieMensual: serieMensual(items, metrica),
  };
}
