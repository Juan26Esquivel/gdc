export type EstadoPlazo = {
  color: "green" | "amber" | "red";
  etiqueta: string;
  porcentaje: number; // 0-100, para la barra de progreso
};

/**
 * Calcula el estado del plazo de una audiencia programada, en base a la
 * fecha ancla (inicio del término) y la fecha límite calculada (migración
 * 002/RF-22). Devuelve null si no hay datos suficientes para calcularlo
 * (sin audiencia programada, o sin fecha_limite_calculada todavía).
 */
export function calcularEstadoPlazo(
  fechaInicio: string | null,
  fechaLimite: string | null,
): EstadoPlazo | null {
  if (!fechaInicio || !fechaLimite) return null;

  const inicio = new Date(fechaInicio).getTime();
  const limite = new Date(fechaLimite).getTime();
  const ahora = Date.now();

  const totalMs = limite - inicio;
  const transcurridoMs = ahora - inicio;
  const porcentaje =
    totalMs > 0 ? Math.min(100, Math.max(0, (transcurridoMs / totalMs) * 100)) : 100;

  const diasRestantes = Math.ceil((limite - ahora) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    return { color: "red", etiqueta: `Vencido (+${Math.abs(diasRestantes)}d)`, porcentaje: 100 };
  }
  if (diasRestantes <= 3) {
    return { color: "red", etiqueta: `Vence en ${diasRestantes}d`, porcentaje };
  }
  if (porcentaje >= 70) {
    return { color: "amber", etiqueta: `${diasRestantes}d restantes`, porcentaje };
  }
  return { color: "green", etiqueta: `${diasRestantes}d restantes`, porcentaje };
}
