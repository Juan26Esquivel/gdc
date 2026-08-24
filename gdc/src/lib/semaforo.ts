// OT-04: semáforo de tiempo en el sistema (Panel Principal del Juez).
// Sobre expedientes.fecha_registro (nunca created_at) — ver OT-02 sección 3.1.
// Cálculo DISTINTO del contador de inactividad (que usa eventos_expediente.created_at,
// ver lib/inactividad.ts): un expediente puede estar en semáforo verde y aun así
// aparecer en "movimientos sin trabajar" si nadie lo ha tocado, y viceversa.

export type ColorSemaforo = "verde" | "amarillo" | "ambar" | "rojo" | "negro";

export type EstadoSemaforo = {
  color: ColorSemaforo;
  meses: number;
  etiqueta: string;
};

export const ORDEN_COLORES_SEMAFORO: ColorSemaforo[] = [
  "verde",
  "amarillo",
  "ambar",
  "rojo",
  "negro",
];

export const LABEL_COLOR_SEMAFORO: Record<ColorSemaforo, string> = {
  verde: "Verde · ≤ 3 meses",
  amarillo: "Amarillo · ≤ 6 meses",
  ambar: "Ámbar · ≤ 9 meses",
  rojo: "Rojo · ≤ 12 meses",
  negro: "Negro · > 12 meses",
};

const DIAS_POR_MES = 30.44;

export function calcularSemaforo(fechaRegistro: string): EstadoSemaforo {
  const inicio = new Date(fechaRegistro).getTime();
  const dias = Math.max(0, (Date.now() - inicio) / (1000 * 60 * 60 * 24));
  const meses = Math.floor(dias / DIAS_POR_MES);

  let color: ColorSemaforo;
  if (meses <= 3) color = "verde";
  else if (meses <= 6) color = "amarillo";
  else if (meses <= 9) color = "ambar";
  else if (meses <= 12) color = "rojo";
  else color = "negro";

  return { color, meses, etiqueta: `${meses} ${meses === 1 ? "mes" : "meses"}` };
}
