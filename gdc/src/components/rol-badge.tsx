import { ROL_LABEL, ROL_ESTILOS } from "@/lib/roles";
import type { RolGdc } from "@/lib/auth/current-user";

export function RolBadge({ rol }: { rol: RolGdc }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border-l-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide ${ROL_ESTILOS[rol]}`}
    >
      {ROL_LABEL[rol]}
    </span>
  );
}
