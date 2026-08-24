"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrarMontoMandamientoPago, type EstadoAccionExpediente } from "./actions";

const ESTADO_INICIAL: EstadoAccionExpediente = {};

export type SaldoEmbargo = {
  montoDecretado: number;
  totalAbonado: number;
  saldoPendiente: number;
};

function Cifra({ label, valor }: { label: string; valor: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">B/. {valor.toFixed(2)}</p>
    </div>
  );
}

export function EmbargoExpediente({
  expedienteId,
  esEjecucion,
  embargo,
  puedeFijarMonto,
}: {
  expedienteId: string;
  esEjecucion: boolean;
  embargo: SaldoEmbargo | null;
  /** Solo Juez y Administrador: fijar la base de un embargo es acto
   *  jurisdiccional, y la base de datos aplica la misma regla por columna. */
  puedeFijarMonto: boolean;
}) {
  const [estado, formAction, pending] = useActionState(
    registrarMontoMandamientoPago,
    ESTADO_INICIAL,
  );

  // En un expediente que no es de Ejecución no hay embargo del que hablar, y sin
  // monto fijado ni permiso para fijarlo no habría nada que mostrar.
  if (!esEjecucion) return null;
  if (!embargo && !puedeFijarMonto) return null;

  const yaTieneMonto = embargo !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{yaTieneMonto ? "Saldo del embargo" : "Mandamiento de pago"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {embargo && (
          <div className="flex flex-wrap gap-8">
            <Cifra label="Decretado" valor={embargo.montoDecretado} />
            <Cifra label="Abonado" valor={embargo.totalAbonado} />
            <Cifra label="Saldo pendiente" valor={embargo.saldoPendiente} />
          </div>
        )}

        {!yaTieneMonto && (
          <p className="text-sm text-muted-foreground">
            Este expediente no tiene monto de mandamiento de pago. Es la base del embargo: sin él no
            se puede calcular el saldo ni registrar abonos.
          </p>
        )}

        {puedeFijarMonto && (
          <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-3">
            <input type="hidden" name="expediente_id" value={expedienteId} />
            <p className="text-sm font-semibold">
              {yaTieneMonto ? "Ampliar el mandamiento (Art. 744)" : "Fijar el monto del mandamiento"}
            </p>
            {yaTieneMonto && (
              <p className="text-xs text-muted-foreground">
                Al vencer nuevos plazos o cuotas de la obligación, la ejecución puede ampliarse por
                su importe. Cada cambio queda registrado con el monto anterior y el nuevo, porque
                mueve el saldo pendiente.
              </p>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="monto">{yaTieneMonto ? "Monto nuevo (B/.)" : "Monto (B/.)"}</Label>
                <Input
                  id="monto"
                  name="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-40"
                  defaultValue={embargo ? embargo.montoDecretado.toFixed(2) : ""}
                />
              </div>
              <div className="flex min-w-60 flex-1 flex-col gap-1">
                <Label htmlFor="motivo">
                  Motivo {yaTieneMonto ? "(obligatorio)" : "(opcional)"}
                </Label>
                <Input
                  id="motivo"
                  name="motivo"
                  maxLength={300}
                  required={yaTieneMonto}
                  placeholder={
                    yaTieneMonto
                      ? "Ej. Vencimiento de las cuotas de marzo y abril"
                      : "Ej. Según auto de mandamiento de pago"
                  }
                />
              </div>
            </div>

            {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
            {estado.advertencia && <p className="text-sm text-amber-700">{estado.advertencia}</p>}
            {estado.ok && !estado.advertencia && (
              <p className="text-sm text-status-confirmed">Monto guardado.</p>
            )}

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Guardando…" : yaTieneMonto ? "Guardar ampliación" : "Fijar monto"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
