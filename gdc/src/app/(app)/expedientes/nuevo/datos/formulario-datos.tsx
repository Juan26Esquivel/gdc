"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { crearExpediente, type EstadoCrearExpediente } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ESTADO_INICIAL: EstadoCrearExpediente = {};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function Segmentado({
  opciones,
  valor,
  onChange,
}: {
  opciones: { valor: string; etiqueta: string }[];
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex w-fit overflow-hidden rounded-md border">
      {opciones.map((op) => (
        <button
          key={op.valor}
          type="button"
          onClick={() => onChange(op.valor)}
          className={`px-4 py-2 text-xs font-semibold ${
            valor === op.valor ? "bg-foreground text-background" : "text-muted-foreground"
          }`}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function FormularioDatosExpediente({
  tipoProcesoId,
  tipoProcesoNombre,
  subtipoProcesoId,
  subtipoProcesoNombre,
  despachoNombre,
  asistentes,
  topeCuantia,
}: {
  tipoProcesoId: number;
  tipoProcesoNombre: string;
  subtipoProcesoId: number | null;
  subtipoProcesoNombre: string | null;
  despachoNombre: string;
  asistentes: { id: string; nombre_completo: string }[];
  topeCuantia: number;
}) {
  const [estado, formAction, pending] = useActionState(crearExpediente, ESTADO_INICIAL);
  const [numeroExpediente, setNumeroExpediente] = useState("");
  const [fisicoElectronico, setFisicoElectronico] = useState("electronico");
  const [municipalCircuito, setMunicipalCircuito] = useState("municipal");
  const [pretension, setPretension] = useState("");
  const [cuantia, setCuantia] = useState("");
  const [esLanzamiento, setEsLanzamiento] = useState(false);
  const [fechaRegistro, setFechaRegistro] = useState(hoyISO());
  const [asistenteId, setAsistenteId] = useState("");

  const esMatrimonio = tipoProcesoNombre === "Matrimonio";
  const esEjecucion = tipoProcesoNombre === "Ejecución";
  const etiquetaCuantia = esEjecucion ? "Monto de mandamiento de pago" : "Cuantía";
  const cuantiaNum = cuantia ? Number(cuantia) : null;
  const asistenteNombre = asistentes.find((a) => a.id === asistenteId)?.nombre_completo ?? null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/expedientes" className="underline underline-offset-2">
          Expedientes
        </Link>{" "}
        /{" "}
        <Link href="/expedientes/nuevo" className="underline underline-offset-2">
          Nuevo expediente
        </Link>{" "}
        / {tipoProcesoNombre}
        {subtipoProcesoNombre ? ` · ${subtipoProcesoNombre}` : ""}
      </p>

      <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5 text-primary">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            ✓
          </span>
          Tipo de proceso
        </span>
        <span className="h-px w-6 bg-border" />
        <span className="flex items-center gap-1.5 text-primary">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            2
          </span>
          Datos del expediente
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
        <Card>
          <CardContent className="flex flex-col gap-6 p-6">
            <form action={formAction} className="flex flex-col gap-6">
              <input type="hidden" name="tipo_proceso_id" value={tipoProcesoId} />
              {subtipoProcesoId && (
                <input type="hidden" name="subtipo_proceso_id" value={subtipoProcesoId} />
              )}
              <input type="hidden" name="fisico_electronico" value={fisicoElectronico} />
              <input type="hidden" name="municipal_circuito" value={municipalCircuito} />
              <input type="hidden" name="asistente_id" value={asistenteId} />

              <section className="flex flex-col gap-3">
                <p className="font-heading text-sm font-semibold">Identificación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="numero_expediente">Número de expediente</Label>
                    <Input
                      id="numero_expediente"
                      name="numero_expediente"
                      className="font-mono"
                      value={numeroExpediente}
                      onChange={(e) => setNumeroExpediente(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Despacho del juez</Label>
                    <Input value={despachoNombre} disabled />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Físico o electrónico</Label>
                    <Segmentado
                      valor={fisicoElectronico}
                      onChange={setFisicoElectronico}
                      opciones={[
                        { valor: "fisico", etiqueta: "Físico" },
                        { valor: "electronico", etiqueta: "Electrónico" },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Municipal o circuito</Label>
                    <Segmentado
                      valor={municipalCircuito}
                      onChange={setMunicipalCircuito}
                      opciones={[
                        { valor: "municipal", etiqueta: "Municipal" },
                        { valor: "circuito", etiqueta: "Circuito" },
                      ]}
                    />
                  </div>
                </div>
              </section>

              {!esMatrimonio && (
                <section className="flex flex-col gap-3 border-t pt-4">
                  <p className="font-heading text-sm font-semibold">Datos del proceso</p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pretension">Pretensión / motivo</Label>
                    <Input
                      id="pretension"
                      name="pretension"
                      placeholder="Ej. Cobro de pagaré por B/. 5,096.96"
                      value={pretension}
                      onChange={(e) => setPretension(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cuantia">{etiquetaCuantia}</Label>
                      <Input
                        id="cuantia"
                        name="cuantia"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={esLanzamiento}
                        value={cuantia}
                        onChange={(e) => setCuantia(e.target.value)}
                        placeholder="Déjalo vacío si es indeterminada"
                      />
                      {!esLanzamiento && cuantiaNum !== null && cuantiaNum <= topeCuantia && (
                        <p className="text-xs text-emerald-700">Dentro del tope de B/. {topeCuantia}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>¿Es lanzamiento? (sin límite de cuantía)</Label>
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                        <input type="hidden" name="es_lanzamiento" value={esLanzamiento ? "on" : ""} />
                        <Checkbox
                          checked={esLanzamiento}
                          onCheckedChange={(c) => setEsLanzamiento(c === true)}
                        />
                        <span className="text-sm">{esLanzamiento ? "Sí" : "No"}</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="flex flex-col gap-3 border-t pt-4">
                <p className="font-heading text-sm font-semibold">Fechas</p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fecha_registro">Fecha de registro en el sistema</Label>
                  <Input
                    id="fecha_registro"
                    name="fecha_registro"
                    type="date"
                    value={fechaRegistro}
                    onChange={(e) => setFechaRegistro(e.target.value)}
                    required
                  />
                </div>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                  <p className="font-semibold">Esta fecha alimenta el semáforo de alertas del Panel del Juez</p>
                  <p className="mt-1 text-primary/80">
                    Por defecto es hoy. Edítala solo si el expediente ya estaba físicamente en el
                    despacho antes de registrarse aquí.
                  </p>
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t pt-4">
                <p className="font-heading text-sm font-semibold">Asignación</p>
                <div className="flex flex-col gap-1.5">
                  <Label>Asistente responsable</Label>
                  <Select value={asistenteId} onValueChange={(v) => setAsistenteId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin asignar">
                        {(v: string | null) =>
                          asistentes.find((a) => a.id === v)?.nombre_completo ?? "Sin asignar"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {asistentes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
              <div className="flex items-center justify-between border-t pt-4">
                <Link href="/expedientes/nuevo" className="text-sm font-semibold text-muted-foreground">
                  Atrás
                </Link>
                <Button type="submit" disabled={pending || !numeroExpediente.trim()}>
                  {pending ? "Guardando…" : "Guardar expediente"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Vista previa
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="font-mono text-lg">{numeroExpediente || "—"}</p>
            <div className="flex items-center justify-between border-b pb-2 text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-medium">
                {tipoProcesoNombre}
                {subtipoProcesoNombre ? ` · ${subtipoProcesoNombre}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-2 text-sm">
              <span className="text-muted-foreground">Despacho</span>
              <span className="font-medium">{despachoNombre}</span>
            </div>
            {!esMatrimonio && (
              <div className="flex items-center justify-between border-b pb-2 text-sm">
                <span className="text-muted-foreground">Cuantía</span>
                <span className="font-medium">
                  {esLanzamiento ? "Lanzamiento" : cuantia ? `B/. ${cuantia}` : "Indeterminada"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-b pb-2 text-sm">
              <span className="text-muted-foreground">Asignado a</span>
              <span className="font-medium">{asistenteNombre ?? "Sin asignar"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Semáforo inicial</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Verde · 0 meses
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Así se verá este expediente en el listado general y en el Panel del Juez apenas lo
              guardes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
