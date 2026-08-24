// Las fases ahora vienen del catálogo `fases_proceso` (una lista por tipo de
// proceso), no de un enum fijo de Postgres — ver docs_extra/ordenes_tecnicas/OT-02.
// Declarativo, Ejecución y Jurisdicción voluntaria tienen su propio catálogo;
// Matrimonio no participa (usa un campo de Estado, fuera de esta ficha).

export type FaseProceso = {
  id: string;
  tipo_proceso_id: number;
  nombre: string;
  orden: number;
  es_fase_inicial: boolean;
};

export function faseInicial(fasesDelTipo: FaseProceso[]): FaseProceso | null {
  return fasesDelTipo.find((f) => f.es_fase_inicial) ?? null;
}

export function siguienteFase(fasesDelTipo: FaseProceso[], faseActualId: string): FaseProceso | null {
  const ordenadas = [...fasesDelTipo].sort((a, b) => a.orden - b.orden);
  const indice = ordenadas.findIndex((f) => f.id === faseActualId);
  if (indice === -1) return null;
  return ordenadas[indice + 1] ?? null;
}
