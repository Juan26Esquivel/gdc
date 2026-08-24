// OT-04: "movimientos sin trabajar" (Panel Principal del Juez, punto 3).
// Cálculo DISTINTO del semáforo (lib/semaforo.ts, que usa fecha_registro):
// este usa eventos_expediente.created_at (cuándo se registró de verdad el
// evento), NUNCA fecha_evento (que el usuario puede backdatear) — ver la
// advertencia de OT-03 sección 3.1. Un expediente sin ningún evento todavía
// usa su propio created_at como referencia.

export type ExpedienteBase = {
  id: string;
  createdAt: string;
  omitirUmbral: boolean;
};

export type ExpedienteInactivo = {
  expedienteId: string;
  diasSinMovimiento: number;
  sinEventos: boolean;
};

export function calcularMovimientosSinTrabajar(
  expedientes: ExpedienteBase[],
  ultimoEventoPorExpediente: Map<string, string>,
  umbralDias: number,
): ExpedienteInactivo[] {
  const ahora = Date.now();
  const resultado: ExpedienteInactivo[] = [];

  for (const exp of expedientes) {
    if (exp.omitirUmbral) continue;

    const ultimoEvento = ultimoEventoPorExpediente.get(exp.id);
    const referencia = ultimoEvento ?? exp.createdAt;
    const dias = Math.floor((ahora - new Date(referencia).getTime()) / (1000 * 60 * 60 * 24));

    if (dias > umbralDias) {
      resultado.push({ expedienteId: exp.id, diasSinMovimiento: dias, sinEventos: !ultimoEvento });
    }
  }

  return resultado.sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento);
}
