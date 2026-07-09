"use server";

import { createClient } from "@/lib/supabase/server";

export type ResultadoBusqueda = {
  expedientes: {
    id: string;
    numeroExpediente: string;
    tipoProceso: string;
    subtipoProceso: string | null;
  }[];
  documentos: {
    id: string;
    expedienteId: string;
    numeroExpediente: string;
    tipoDocumento: string;
  }[];
};

const SIN_RESULTADOS: ResultadoBusqueda = { expedientes: [], documentos: [] };

const INICIO_DIACRITICOS = 0x0300;
const FIN_DIACRITICOS = 0x036f;

// Quita tildes/diacríticos comparando puntos de código directamente (en vez
// de un rango unicode dentro de una expresión regular) para evitar problemas
// de codificación de ese rango de caracteres combinables al editar el archivo.
function normalizar(texto: string): string {
  return Array.from(texto.normalize("NFD"))
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < INICIO_DIACRITICOS || codigo > FIN_DIACRITICOS;
    })
    .join("")
    .toLowerCase();
}

function coincide(termino: string, ...campos: (string | null | undefined)[]): boolean {
  return campos.some((campo) => campo && normalizar(campo).includes(termino));
}

// Búsqueda global "multidato" (expedientes + documentos, por número, tipo,
// subtipo), insensible a tildes y mayúsculas/minúsculas. Se filtra en JS tras
// traer el conjunto ya acotado por RLS (un despacho maneja cientos de
// expedientes, no millones — no se justifica una extensión de Postgres
// como `unaccent` para este volumen, ver RNF-05).
export async function buscarGlobal(termino: string): Promise<ResultadoBusqueda> {
  const q = normalizar(termino.trim());
  if (!q) return SIN_RESULTADOS;

  const supabase = await createClient();
  const [{ data: expedientes }, { data: documentos }] = await Promise.all([
    supabase
      .from("expedientes")
      .select("id, numero_expediente, tipos_proceso(nombre), subtipos_proceso(nombre)"),
    supabase
      .from("documentos")
      .select("id, expediente_id, tipos_documento(nombre), expedientes(numero_expediente)"),
  ]);

  const expedientesFiltrados = (expedientes ?? [])
    .filter((e) => coincide(q, e.numero_expediente, e.tipos_proceso?.nombre, e.subtipos_proceso?.nombre))
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      numeroExpediente: e.numero_expediente,
      tipoProceso: e.tipos_proceso?.nombre ?? "",
      subtipoProceso: e.subtipos_proceso?.nombre ?? null,
    }));

  const documentosFiltrados = (documentos ?? [])
    .filter((d) => coincide(q, d.tipos_documento?.nombre, d.expedientes?.numero_expediente))
    .slice(0, 6)
    .map((d) => ({
      id: d.id,
      expedienteId: d.expediente_id,
      numeroExpediente: d.expedientes?.numero_expediente ?? "",
      tipoDocumento: d.tipos_documento?.nombre ?? "",
    }));

  return { expedientes: expedientesFiltrados, documentos: documentosFiltrados };
}
