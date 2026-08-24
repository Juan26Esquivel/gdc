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

/**
 * Declarativo llama a esta fase "Notificación de la demanda"; Ejecución la llama
 * solo "Notificación". Las dos capturan la misma fecha real en
 * `expedientes.fecha_notificacion_demanda`, pero hasta ahora solo se pedía en la
 * primera, así que ningún expediente ejecutivo llegaba a tenerla — y sin ella no
 * hay forma de contar el término de excepción de los ejecutivos.
 */
const NOMBRES_FASE_NOTIFICACION = ["Notificación de la demanda", "Notificación"];

export function esFaseDeNotificacion(nombreFase: string): boolean {
  return NOMBRES_FASE_NOTIFICACION.includes(nombreFase);
}

/** Nombres de fase que exigen programar una audiencia al avanzar hacia ellas. */
export function esFaseDeAudiencia(nombreFase: string): boolean {
  return nombreFase === "Audiencia preliminar" || nombreFase === "Audiencia de fondo";
}
