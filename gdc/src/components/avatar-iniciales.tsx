const PALETA = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function obtenerIniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? "";
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + segunda).toUpperCase();
}

function obtenerColor(nombreCompleto: string): string {
  const suma = nombreCompleto
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PALETA[suma % PALETA.length];
}

export function AvatarIniciales({
  nombreCompleto,
  className = "",
}: {
  nombreCompleto: string;
  className?: string;
}) {
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${obtenerColor(nombreCompleto)} ${className}`}
    >
      {obtenerIniciales(nombreCompleto)}
    </div>
  );
}
