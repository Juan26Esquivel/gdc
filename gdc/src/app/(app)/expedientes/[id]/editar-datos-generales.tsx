"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actualizarDatosGenerales, type EstadoAccionExpediente } from "./actions";

const ESTADO_INICIAL: EstadoAccionExpediente = {};

// "" es la opción "sin definir": las dos columnas son nullable en base, no todos
// los expedientes heredados del Excel traen el dato.
export const LABEL_FISICO_ELECTRONICO: Record<string, string> = {
  "": "Sin definir",
  fisico: "Físico",
  electronico: "Electrónico",
};

export const LABEL_MUNICIPAL_CIRCUITO: Record<string, string> = {
  "": "Sin definir",
  municipal: "Municipal",
  circuito: "Circuito",
};

export type DatosGeneralesEditables = {
  fisicoElectronico: string | null;
  municipalCircuito: string | null;
  pretension: string | null;
  notas: string | null;
  fechaNotificacionDemanda: string | null;
};

type Props = {
  expedienteId: string;
  datos: DatosGeneralesEditables;
  despachoNombre: string | null;
  cuantia: number | null;
  esLanzamiento: boolean;
  topeCuantia: number;
  puedeEditar: boolean;
};

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{valor}</p>
    </div>
  );
}

function textoCuantia(cuantia: number | null, esLanzamiento: boolean) {
  if (esLanzamiento) return "Lanzamiento (sin tope)";
  return cuantia !== null ? `B/. ${cuantia}` : "Indeterminada";
}

export function DatosGeneralesCard({
  expedienteId,
  datos,
  despachoNombre,
  cuantia,
  esLanzamiento,
  topeCuantia,
  puedeEditar,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [fisicoElectronico, setFisicoElectronico] = useState(datos.fisicoElectronico ?? "");
  const [municipalCircuito, setMunicipalCircuito] = useState(datos.municipalCircuito ?? "");

  // El cierre del formulario se decide aquí, en el manejador de la acción, y no
  // en un useEffect que observe el resultado: hacerlo en un efecto dispara
  // renders en cascada (regla react-hooks/set-state-in-effect). Al terminar bien,
  // la página ya se revalidó, así que el modo lectura muestra los valores nuevos
  // sin recargar a mano.
  const [estado, formAction, pending] = useActionState(
    async (previo: EstadoAccionExpediente, formData: FormData) => {
      const resultado = await actualizarDatosGenerales(previo, formData);
      if (resultado.ok) setEditando(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  function abrirEdicion() {
    // Se re-siembran los dos Select desde los datos actuales, para que cancelar
    // y volver a entrar no arrastre una selección descartada.
    setFisicoElectronico(datos.fisicoElectronico ?? "");
    setMunicipalCircuito(datos.municipalCircuito ?? "");
    setEditando(true);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Datos generales</CardTitle>
        {puedeEditar && !editando && (
          <Button variant="outline" size="sm" onClick={abrirEdicion}>
            Editar
          </Button>
        )}
      </CardHeader>

      {!editando && (
        <CardContent className="grid grid-cols-2 gap-4">
          <Campo
            label="Físico o electrónico"
            valor={LABEL_FISICO_ELECTRONICO[datos.fisicoElectronico ?? ""] ?? "—"}
          />
          <Campo
            label="Municipal o circuito"
            valor={LABEL_MUNICIPAL_CIRCUITO[datos.municipalCircuito ?? ""] ?? "—"}
          />
          <Campo label="Despacho" valor={despachoNombre ?? "—"} />
          <Campo
            label="Fecha de notificación"
            valor={formatearFecha(datos.fechaNotificacionDemanda)}
          />
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Pretensión</p>
            <p className="text-sm font-medium">{datos.pretension ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cuantía</p>
            <p className="text-sm font-medium">{textoCuantia(cuantia, esLanzamiento)}</p>
            {!esLanzamiento && cuantia !== null && cuantia <= topeCuantia && (
              <p className="mt-0.5 text-xs text-emerald-700">
                Dentro del tope de B/. {topeCuantia}
              </p>
            )}
          </div>
          <Campo label="Es lanzamiento" valor={esLanzamiento ? "Sí" : "No"} />
          {estado.ok && (
            <p className="col-span-2 text-sm text-status-confirmed">Cambios guardados.</p>
          )}
        </CardContent>
      )}

      {editando && (
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="expediente_id" value={expedienteId} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="fisico_electronico">Físico o electrónico</Label>
                <input type="hidden" name="fisico_electronico" value={fisicoElectronico} />
                <Select
                  value={fisicoElectronico}
                  onValueChange={(v) => setFisicoElectronico(v ?? "")}
                >
                  <SelectTrigger id="fisico_electronico" className="w-full">
                    <SelectValue placeholder="Sin definir">
                      {(value: string | null) => LABEL_FISICO_ELECTRONICO[value ?? ""]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin definir</SelectItem>
                    <SelectItem value="fisico">Físico</SelectItem>
                    <SelectItem value="electronico">Electrónico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="municipal_circuito">Municipal o circuito</Label>
                <input type="hidden" name="municipal_circuito" value={municipalCircuito} />
                <Select
                  value={municipalCircuito}
                  onValueChange={(v) => setMunicipalCircuito(v ?? "")}
                >
                  <SelectTrigger id="municipal_circuito" className="w-full">
                    <SelectValue placeholder="Sin definir">
                      {(value: string | null) => LABEL_MUNICIPAL_CIRCUITO[value ?? ""]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin definir</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                    <SelectItem value="circuito">Circuito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="pretension">Pretensión</Label>
              <Input
                id="pretension"
                name="pretension"
                maxLength={200}
                defaultValue={datos.pretension ?? ""}
                placeholder="Ej. CONTRACTUAL, DAÑOS Y PERJUICIOS, LANZAMIENTO POR MORA"
              />
              <p className="text-xs text-muted-foreground">
                Es el motivo del reclamo, no un monto. El dinero va en Cuantía.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="fecha_notificacion_demanda">Fecha de notificación</Label>
              <Input
                id="fecha_notificacion_demanda"
                name="fecha_notificacion_demanda"
                type="date"
                defaultValue={datos.fechaNotificacionDemanda ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Cuidado: es el ancla del cálculo de plazos de audiencia (RF-22). Cambiarla mueve la
                fecha límite que se ve en el Calendario.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                name="notas"
                rows={3}
                maxLength={2000}
                defaultValue={datos.notas ?? ""}
              />
            </div>

            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">No se editan aquí</p>
              <p className="mt-1">
                El número de expediente, el despacho, la cuantía y el tipo de proceso no se cambian
                desde esta pantalla. La fecha de registro, la observación y el estado del matrimonio
                se corrigen en «Eventos y trazabilidad», para que quede el rastro de quién los cambió
                y por qué.
              </p>
            </div>

            {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="w-fit">
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setEditando(false)}
                className="w-fit"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
