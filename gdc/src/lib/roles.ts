import type { RolGdc } from "@/lib/auth/current-user";

export const ROL_LABEL: Record<RolGdc, string> = {
  juez: "Juez",
  asistente: "Asistente",
  analista_datos: "Analista de Datos",
  administrador: "Administrador",
};

// Tailwind necesita las clases completas de forma literal para poder generarlas.
export const ROL_ESTILOS: Record<RolGdc, string> = {
  juez: "border-blue-500 bg-blue-500/10 text-blue-700",
  asistente: "border-emerald-500 bg-emerald-500/10 text-emerald-700",
  analista_datos: "border-violet-500 bg-violet-500/10 text-violet-700",
  administrador: "border-primary bg-primary/10 text-primary",
};
