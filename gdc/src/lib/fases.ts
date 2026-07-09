export const ORDEN_FASES = [
  "admision",
  "notificacion_demanda",
  "audiencia_preliminar",
  "audiencia_fondo",
] as const;

export type FaseExpediente = (typeof ORDEN_FASES)[number];

export const FASE_LABEL: Record<FaseExpediente, string> = {
  admision: "Admisión",
  notificacion_demanda: "Notificación de la demanda",
  audiencia_preliminar: "Audiencia preliminar",
  audiencia_fondo: "Audiencia de fondo",
};

export function siguienteFase(faseActual: FaseExpediente): FaseExpediente | null {
  const indice = ORDEN_FASES.indexOf(faseActual);
  return ORDEN_FASES[indice + 1] ?? null;
}
