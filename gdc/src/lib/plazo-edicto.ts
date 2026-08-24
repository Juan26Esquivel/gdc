// Plazo para publicar el aviso del edicto emplazatorio en sucesiones.
//
// Aclarado por el usuario (2026-08-23): el plazo es en MESES CALENDARIO desde la
// emisión del edicto, no en días. Antes el Panel del Juez usaba 30 días fijos
// escritos en el código, que no es lo mismo (febrero son 28, agosto 31) y que
// además nadie podía ajustar sin tocar código.
//
// Igual que el resto de los cálculos de fecha del proyecto, todo en UTC: las
// fechas llegan como "YYYY-MM-DD" o timestamptz y mezclar métodos locales
// correría cada fecha un día hacia atrás en Panamá (UTC-5).

/**
 * Suma meses calendario respetando el fin de mes: un edicto del 31 de enero con
 * un mes de plazo vence el 28 (o 29) de febrero, no el 3 de marzo. Sin este
 * ajuste, `setUTCMonth` desborda al mes siguiente y el plazo saldría más largo
 * que el legal.
 */
export function sumarMesesCalendario(fecha: string, meses: number): string {
  const base = new Date(`${fecha.slice(0, 10)}T00:00:00.000Z`);
  const diaOriginal = base.getUTCDate();

  const resultado = new Date(base);
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);

  const ultimoDiaDelMes = new Date(
    Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0),
  ).getUTCDate();
  resultado.setUTCDate(Math.min(diaOriginal, ultimoDiaDelMes));

  return resultado.toISOString().slice(0, 10);
}

export type EstadoPublicacionEdicto = {
  fechaLimite: string;
  vencido: boolean;
  diasDesdeElEdicto: number;
};

export function calcularEstadoPublicacionEdicto(
  fechaEdicto: string,
  plazoMeses: number,
  hoy: string,
): EstadoPublicacionEdicto {
  const fechaLimite = sumarMesesCalendario(fechaEdicto, plazoMeses);
  const diasDesdeElEdicto = Math.floor(
    (new Date(`${hoy.slice(0, 10)}T00:00:00.000Z`).getTime() -
      new Date(`${fechaEdicto.slice(0, 10)}T00:00:00.000Z`).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return {
    fechaLimite,
    vencido: hoy.slice(0, 10) > fechaLimite,
    diasDesdeElEdicto: Math.max(0, diasDesdeElEdicto),
  };
}
