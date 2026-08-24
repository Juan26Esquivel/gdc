import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Regla = {
  titulo: string;
  cuerpo: string;
  chips?: string[];
  puntos: string[];
};

// OT-04 sección 3.6: pantalla de referencia estática (no transaccional) —
// explica en lenguaje simple cómo culmina cada uno de los 4 grupos, según
// las decisiones ya confirmadas en OT-01/OT-03. No hay lógica de captura
// aquí, solo contenido de consulta.
const REGLAS: Regla[] = [
  {
    titulo: "Declarativo — Ordinarios y Sumarios",
    cuerpo: "Culmina con uno de estos tres documentos:",
    chips: ["Sentencia", "Acuerdo de Mediación", "Auto"],
    puntos: [
      "Al generar cualquiera de los tres, se puede dejar una observación libre.",
      'Toggle "Este documento culmina el proceso" — al activarlo, pide motivo obligatorio.',
      "El cierre real ocurre al confirmarse el documento, nunca al generarlo.",
    ],
  },
  {
    titulo: "Ejecución (Ejecutivo simple)",
    cuerpo:
      'El Auto que decreta el embargo pasa el expediente a fase "Cumplimiento de embargo" — no culmina el proceso por defecto.',
    puntos: [
      "En Cumplimiento de embargo se pueden registrar abonos al monto embargado hasta saldar la deuda.",
      'El Auto también admite observación y el mismo toggle "culmina el proceso" con motivo obligatorio, por si el caso cierra antes de saldar por completo.',
      "Un Auto que decreta embargo y un Auto que culmina el proceso son el mismo tipo de documento — la diferencia es el toggle, nunca el tipo.",
    ],
  },
  {
    titulo: "Jurisdicción voluntaria (Sucesiones)",
    cuerpo: "Culmina con la adjudicación de los bienes heredados (documento tipo Auto).",
    puntos: [
      'Alerta especial: si el "Edicto emplazatorio" lleva más de 30 días sin un evento de "Publicación" registrado, se marca en la ficha del expediente y en el Panel Principal del Juez.',
    ],
  },
  {
    titulo: "Matrimonio",
    cuerpo: "Culmina únicamente al actualizar el Estado a uno de estos dos valores — no hay documento de cierre:",
    chips: ["Celebrado", "Retirado"],
    puntos: ["Cualquier otro estado (ej. En trámite) mantiene el expediente activo."],
  },
];

export function ReglasCierre({ umbralInactividadDias }: { umbralInactividadDias: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de Cierre por Tipo de Proceso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Regla general — aplica a los 4 grupos por igual: todo expediente activo necesita algún
          evento registrado dentro de {umbralInactividadDias} días. Superado ese umbral sin
          movimiento, aparece en &quot;Movimientos sin trabajar&quot; del Panel del Juez.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {REGLAS.map((regla) => (
          <div key={regla.titulo} className="flex flex-col gap-2 rounded-md border p-4">
            <p className="font-heading text-sm font-semibold">{regla.titulo}</p>
            <p className="text-sm text-muted-foreground">{regla.cuerpo}</p>
            {regla.chips && (
              <div className="flex flex-wrap gap-2">
                {regla.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
            <ul className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
              {regla.puntos.map((punto) => (
                <li key={punto} className="flex gap-1.5">
                  <span>·</span>
                  <span>{punto}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
