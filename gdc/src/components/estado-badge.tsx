import { ESTADO_DOCUMENTO_LABEL } from "@/lib/estado-documento";

// Tailwind necesita ver las clases completas de forma literal (no interpoladas)
// para poder generarlas — por eso el mapa completo en vez de construir el string.
const ESTILOS_POR_ESTADO: Record<string, string> = {
  generado: "border-status-generated bg-status-generated/10 text-status-generated",
  validado: "border-status-validated bg-status-validated/10 text-status-validated",
  en_correccion: "border-status-correction bg-status-correction/10 text-status-correction",
  confirmado: "border-status-confirmed bg-status-confirmed/10 text-status-confirmed",
};

export function EstadoBadge({ estado }: { estado: string }) {
  const estilos = ESTILOS_POR_ESTADO[estado] ?? "border-border bg-muted text-muted-foreground";
  const label = ESTADO_DOCUMENTO_LABEL[estado] ?? estado;

  return (
    <span
      className={`inline-flex items-center rounded-sm border-l-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide ${estilos}`}
    >
      {label}
    </span>
  );
}
