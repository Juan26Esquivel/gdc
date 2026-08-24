// Cálculo de términos procesales en días hábiles (Ley 402).
//
// Confirmado con el usuario el 2026-08-23: los términos de contestación, la
// ventana de la audiencia preliminar y los términos de los procesos ejecutivos
// se cuentan todos en días hábiles. Un día es hábil si no es sábado ni domingo
// y no está en el catálogo `dias_no_habiles` (migración 20260823120001).
//
// Todo el cálculo se hace en UTC a propósito. Las columnas de fecha de Postgres
// llegan como "YYYY-MM-DD" sin hora, y `new Date("2026-08-23")` se interpreta
// como medianoche UTC: si mezcláramos métodos locales (getDate/setDate) con eso,
// en Panamá (UTC-5) cada fecha se correría un día hacia atrás.

export type DiasNoHabiles = ReadonlySet<string>;

/** Tope de seguridad: evita un bucle infinito si el catálogo tuviera cargado un
 *  rango absurdo de días no hábiles. 20 días naturales por cada día hábil
 *  buscado es holgadísimo (la peor semana real gasta 7 por 5). */
const FACTOR_MAX_ITERACIONES = 20;

function aFechaUtc(fecha: string): Date {
  // Se recorta a la parte de fecha para aceptar tanto "2026-08-23" como un
  // timestamptz completo ("2026-08-23T15:04:05.000Z"), que es lo que devuelven
  // algunas columnas (ej. expediente_fases.fecha_inicio).
  const soloFecha = fecha.slice(0, 10);
  return new Date(`${soloFecha}T00:00:00.000Z`);
}

function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function siguienteDia(fecha: Date): Date {
  const siguiente = new Date(fecha);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return siguiente;
}

export function esDiaHabil(fecha: string, diasNoHabiles: DiasNoHabiles): boolean {
  const dia = aFechaUtc(fecha);
  const diaSemana = dia.getUTCDay(); // 0 = domingo, 6 = sábado
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !diasNoHabiles.has(aIso(dia));
}

/**
 * Devuelve la fecha en que vence un término de `dias` días hábiles contado desde
 * `fechaBase`. Sigue la regla procesal ordinaria: el término empieza a correr el
 * día siguiente al del acto (la fecha base NO se cuenta), y el vencimiento es el
 * último día hábil del término.
 *
 * Con `dias <= 0` devuelve la propia fecha base (no hay término que contar).
 */
export function sumarDiasHabiles(
  fechaBase: string,
  dias: number,
  diasNoHabiles: DiasNoHabiles,
): string {
  if (dias <= 0) return aIso(aFechaUtc(fechaBase));

  let cursor = aFechaUtc(fechaBase);
  let habilesContados = 0;
  let iteraciones = 0;
  const maxIteraciones = dias * FACTOR_MAX_ITERACIONES;

  while (habilesContados < dias && iteraciones < maxIteraciones) {
    cursor = siguienteDia(cursor);
    iteraciones++;
    if (esDiaHabil(aIso(cursor), diasNoHabiles)) habilesContados++;
  }

  return aIso(cursor);
}

/**
 * Cuenta los días hábiles transcurridos entre `desde` y `hasta`, excluyendo el
 * día inicial e incluyendo el final (mismo criterio que `sumarDiasHabiles`, para
 * que las dos funciones sean coherentes entre sí). Devuelve 0 si `hasta` es
 * anterior o igual a `desde`.
 */
export function contarDiasHabilesTranscurridos(
  desde: string,
  hasta: string,
  diasNoHabiles: DiasNoHabiles,
): number {
  const fin = aFechaUtc(hasta);
  let cursor = aFechaUtc(desde);
  if (fin <= cursor) return 0;

  let habiles = 0;
  while (cursor < fin) {
    cursor = siguienteDia(cursor);
    if (esDiaHabil(aIso(cursor), diasNoHabiles)) habiles++;
  }

  return habiles;
}

/**
 * Años que tienen al menos un día no hábil cargado. Sirve para advertir en
 * pantalla cuando un cálculo cae en un año sin feriados registrados: el
 * resultado no sería un error visible, sino un plazo silenciosamente más corto
 * que el real, que es peor.
 */
export function aniosConFeriadosCargados(diasNoHabiles: DiasNoHabiles): Set<number> {
  const anios = new Set<number>();
  for (const fecha of diasNoHabiles) {
    const anio = Number(fecha.slice(0, 4));
    if (!Number.isNaN(anio)) anios.add(anio);
  }
  return anios;
}
