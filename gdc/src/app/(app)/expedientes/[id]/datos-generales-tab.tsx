import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatosGeneralesCard } from "./editar-datos-generales";
import { AudienciasExpediente, type AudienciaVista } from "./audiencias-expediente";

type FaseLinea = { id: string; nombre: string; orden: number; completada: boolean; actual: boolean; fecha: string | null };

export type DatosGeneralesProps = {
  expedienteId: string;
  fisicoElectronico: string | null;
  municipalCircuito: string | null;
  despachoNombre: string | null;
  cuantia: number | null;
  esLanzamiento: boolean;
  topeCuantia: number;
  pretension: string | null;
  fechaNotificacionDemanda: string | null;
  notas: string | null;
  observacionActual: string | null;
  lineaTramite: FaseLinea[];
  estadoMatrimonio: string | null;
  cerrado: boolean;
  tipoCierre: string | null;
  motivoCierre: string | null;
  fechaCierre: string | null;
  asignadoNombre: string | null;
  documentosRecientes: { id: string; nombre: string; estado: string }[];
  totalDocumentos: number;
  auditoriaReciente: { id: string; accion: string; usuarioNombre: string | null; fecha: string }[];
  embargo: { montoDecretado: number; totalAbonado: number; saldoPendiente: number } | null;
  ventanasAudiencia: VentanaAudienciaVista[];
  audiencias: AudienciaVista[];
  esAdmin: boolean;
  puedeEditar: boolean;
};

export type VentanaAudienciaVista = {
  etiqueta: string;
  pie: string;
  ancla: string;
  desde: string;
  hasta: string;
  fechaProgramada: string | null;
};

const LABEL_ESTADO_MATRIMONIO: Record<string, string> = {
  en_tramite: "En trámite",
  celebrado: "Celebrado",
  retirado: "Retirado",
};

const LABEL_ESTADO_DOC: Record<string, string> = {
  generado: "Generado",
  validado: "Validado",
  en_correccion: "En corrección",
  confirmado: "Confirmado",
};

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{valor}</p>
    </div>
  );
}

export function DatosGeneralesTab(props: DatosGeneralesProps) {
  const {
    expedienteId,
    fisicoElectronico,
    municipalCircuito,
    despachoNombre,
    cuantia,
    esLanzamiento,
    topeCuantia,
    pretension,
    fechaNotificacionDemanda,
    notas,
    observacionActual,
    lineaTramite,
    estadoMatrimonio,
    cerrado,
    tipoCierre,
    motivoCierre,
    fechaCierre,
    asignadoNombre,
    documentosRecientes,
    totalDocumentos,
    auditoriaReciente,
    embargo,
    ventanasAudiencia,
    audiencias,
    esAdmin,
    puedeEditar,
  } = props;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
      <div className="flex flex-col gap-4">
        <DatosGeneralesCard
          expedienteId={expedienteId}
          datos={{
            fisicoElectronico,
            municipalCircuito,
            pretension,
            notas,
            fechaNotificacionDemanda,
          }}
          despachoNombre={despachoNombre}
          cuantia={cuantia}
          esLanzamiento={esLanzamiento}
          topeCuantia={topeCuantia}
          puedeEditar={puedeEditar}
        />

        {estadoMatrimonio && (
          <Card>
            <CardHeader>
              <CardTitle>Estado del matrimonio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {LABEL_ESTADO_MATRIMONIO[estadoMatrimonio] ?? estadoMatrimonio}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Solo &quot;Celebrado&quot; o &quot;Retirado&quot; culminan el expediente (sin documento
                de cierre) — corrígelo desde la pestaña &quot;Eventos y trazabilidad&quot;.
              </p>
            </CardContent>
          </Card>
        )}

        {lineaTramite.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Línea de trámite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {lineaTramite.map((fase) => (
                  <div key={fase.id} className="flex flex-col items-center gap-1 text-center">
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                        fase.completada
                          ? "border-primary bg-primary text-primary-foreground"
                          : fase.actual
                            ? "border-primary bg-background text-primary"
                            : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {fase.completada ? "✓" : fase.orden}
                    </div>
                    <p className="max-w-20 text-xs font-medium">{fase.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fase.fecha ? formatearFecha(fase.fecha) : fase.actual ? "En curso" : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {ventanasAudiencia.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ventana legal de audiencia</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ventanasAudiencia.map((v) => (
                <div key={v.etiqueta}>
                  <p className="text-xs text-muted-foreground">{v.etiqueta}</p>
                  <p className="text-sm font-medium">
                    Puede celebrarse entre {formatearFecha(v.desde)} y {formatearFecha(v.hasta)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.pie} ({formatearFecha(v.ancla)})
                  </p>
                  <p className="mt-1 text-sm">
                    {v.fechaProgramada ? (
                      <>
                        <span className="text-muted-foreground">Programada para: </span>
                        <span className="font-medium">{formatearFecha(v.fechaProgramada)}</span>
                        {(v.fechaProgramada.slice(0, 10) < v.desde ||
                          v.fechaProgramada.slice(0, 10) > v.hasta) && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                            Fuera de la ventana
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Sin fecha fijada todavía.</span>
                    )}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <AudienciasExpediente
          expedienteId={expedienteId}
          audiencias={audiencias}
          esAdmin={esAdmin}
        />

        {embargo && (
          <Card>
            <CardHeader>
              <CardTitle>Saldo del embargo</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-8">
              <Campo label="Decretado" valor={`B/. ${embargo.montoDecretado.toFixed(2)}`} />
              <Campo label="Abonado" valor={`B/. ${embargo.totalAbonado.toFixed(2)}`} />
              <Campo label="Saldo pendiente" valor={`B/. ${embargo.saldoPendiente.toFixed(2)}`} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Estado y observación</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Última observación registrada (columna &quot;Estado&quot; de la vista general)
              </p>
              <p className="mt-1 rounded-md bg-muted p-3 text-sm font-medium">
                {observacionActual ?? "Sin observación registrada."}
              </p>
              {puedeEditar && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Se actualiza registrando el evento &quot;Observación actualizada&quot; en la pestaña
                  &quot;Eventos y trazabilidad&quot;.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="mt-1 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {notas ?? "Sin notas registradas."}
              </p>
              {puedeEditar && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Se editan con el botón &quot;Editar&quot; de la tarjeta &quot;Datos generales&quot;.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {cerrado && (
          <Card className="border-l-4 border-l-emerald-600">
            <CardHeader>
              <CardTitle>Expediente cerrado</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">Tipo de cierre: </span>
                <span className="font-medium">{tipoCierre}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Fecha: </span>
                {formatearFecha(fechaCierre)}
              </p>
              {motivoCierre && (
                <p>
                  <span className="text-muted-foreground">Motivo: </span>
                  {motivoCierre}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Asignación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{asignadoNombre ?? "Sin asignar"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos generados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {documentosRecientes.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <p className="truncate text-sm">{doc.nombre}</p>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {LABEL_ESTADO_DOC[doc.estado] ?? doc.estado}
                </span>
              </div>
            ))}
            {documentosRecientes.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin documentos todavía.</p>
            )}
            <Link
              href={`/expedientes/${props.expedienteId}?tab=documentos`}
              className="pt-2 text-xs font-semibold underline underline-offset-2"
            >
              Ver todos los documentos ({totalDocumentos}) →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auditoría reciente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {auditoriaReciente.map((a) => (
              <p key={a.id} className="py-2 text-xs text-muted-foreground first:pt-0 last:pb-0">
                <span className="font-semibold text-foreground">{a.usuarioNombre ?? "Sistema"}</span>{" "}
                {a.accion} · {formatearFecha(a.fecha)}
              </p>
            ))}
            {auditoriaReciente.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin actividad de auditoría registrada (solo el Administrador puede consultarla).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
