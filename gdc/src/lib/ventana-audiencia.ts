// Ventana dentro de la cual puede celebrarse una audiencia (Ley 402).
//
// Confirmado con el usuario el 2026-08-23:
//   - La ventana de la audiencia PRELIMINAR se cuenta desde que vence el término
//     de contestación (10 días hábiles en Ordinario, 5 en Sumario), no desde la
//     notificación de la demanda.
//   - Tanto el término de contestación como el rango de la audiencia (20-60 días
//     en Ordinario) se cuentan en DÍAS HÁBILES.
//
// Antes solo se calculaba la última fecha posible; el mínimo del rango se
// configuraba en Administración pero ningún cálculo lo usaba, así que la ventana
// como tal no existía en ninguna pantalla.

import { sumarDiasHabiles, type DiasNoHabiles } from "@/lib/dias-habiles";

export type VentanaAudiencia = {
  /** Fecha desde la que se cuenta el rango (vencimiento del término de
   *  contestación en la preliminar; la audiencia preliminar en la de fondo). */
  ancla: string;
  desde: string;
  hasta: string;
};

/**
 * Vencimiento del término de contestación, contado en días hábiles desde la
 * notificación de la demanda. Devuelve null si falta cualquiera de los dos datos
 * (hay subtipos sin término parametrizado, y expedientes sin notificar todavía).
 */
export function calcularVencimientoContestacion(
  fechaNotificacion: string | null,
  plazoContestacionDias: number | null,
  diasNoHabiles: DiasNoHabiles,
): string | null {
  if (!fechaNotificacion || !plazoContestacionDias) return null;
  return sumarDiasHabiles(fechaNotificacion, plazoContestacionDias, diasNoHabiles);
}

/**
 * Ventana [desde, hasta] en días hábiles a partir de una fecha ancla. Devuelve
 * null si falta el ancla o el máximo del rango; si falta solo el mínimo, la
 * ventana arranca en el propio ancla (mejor mostrar "hasta tal fecha" que no
 * mostrar nada).
 */
export function calcularVentana(
  fechaAncla: string | null,
  plazoMinDias: number | null,
  plazoMaxDias: number | null,
  diasNoHabiles: DiasNoHabiles,
): VentanaAudiencia | null {
  if (!fechaAncla || !plazoMaxDias) return null;
  return {
    ancla: fechaAncla.slice(0, 10),
    desde: sumarDiasHabiles(fechaAncla, plazoMinDias ?? 0, diasNoHabiles),
    hasta: sumarDiasHabiles(fechaAncla, plazoMaxDias, diasNoHabiles),
  };
}

/** Ventana de la audiencia preliminar: notificación -> contestación -> rango. */
export function calcularVentanaPreliminar(
  fechaNotificacion: string | null,
  plazoContestacionDias: number | null,
  plazoMinDias: number | null,
  plazoMaxDias: number | null,
  diasNoHabiles: DiasNoHabiles,
): VentanaAudiencia | null {
  const vencimiento = calcularVencimientoContestacion(
    fechaNotificacion,
    plazoContestacionDias,
    diasNoHabiles,
  );
  return calcularVentana(vencimiento, plazoMinDias, plazoMaxDias, diasNoHabiles);
}

export type UbicacionEnVentana = "antes" | "dentro" | "despues";

/**
 * Dónde cae una fecha concreta respecto de la ventana. Se usa para advertir al
 * gestionar la audiencia, no para bloquear: el juez puede tener motivos para
 * salirse del rango, pero debe verlo en pantalla antes de guardar.
 */
export function ubicarEnVentana(fecha: string, ventana: VentanaAudiencia): UbicacionEnVentana {
  const dia = fecha.slice(0, 10);
  if (dia < ventana.desde) return "antes";
  if (dia > ventana.hasta) return "despues";
  return "dentro";
}
