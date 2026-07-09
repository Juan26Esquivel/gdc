export const ESTADO_AUDIENCIA_LABEL: Record<string, string> = {
  programada: "Programada",
  celebrada: "Celebrada",
  suspendida: "Suspendida",
  continuada: "Continuada",
  terminada_por_incomparecencia: "Terminada por incomparecencia",
};

// Colores por estado (hex, para el calendario — react-big-calendar necesita
// colores directos vía estilo inline, no puede leer las variables de Tailwind).
export const ESTADO_AUDIENCIA_COLOR: Record<string, string> = {
  programada: "#3b82f6",
  celebrada: "#22c55e",
  suspendida: "#f97316",
  continuada: "#8b5cf6",
  terminada_por_incomparecencia: "#ba1a1a",
};
