"use client";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ESTADO_AUDIENCIA_LABEL, ESTADO_AUDIENCIA_COLOR } from "@/lib/estado-audiencia";
import { marcarEstadoAudiencia } from "./actions";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

type Audiencia = {
  id: string;
  tipo: string;
  motivo: string | null;
  fecha_programada: string;
  fecha_limite_calculada: string | null;
  estado: string;
  expedientes: { numero_expediente: string; tipos_proceso: { nombre: string } | null } | null;
};

type EventoAudiencia = Event & { audiencia: Audiencia };

// "especial" se agregó al enum en la migración 20260823150001 (Art. 262/263).
const TIPO_LABEL: Record<string, string> = {
  preliminar: "Preliminar",
  fondo: "Fondo",
  especial: "Especial",
};

export function CalendarioCliente({
  audiencias,
  esAdmin,
}: {
  audiencias: Audiencia[];
  esAdmin: boolean;
}) {
  const [seleccionada, setSeleccionada] = useState<Audiencia | null>(null);

  const eventos: EventoAudiencia[] = useMemo(
    () =>
      audiencias.map((a) => ({
        title: `${a.expedientes?.numero_expediente ?? "?"} · ${TIPO_LABEL[a.tipo]}`,
        start: new Date(a.fecha_programada),
        end: new Date(a.fecha_programada),
        audiencia: a,
      })),
    [audiencias],
  );

  return (
    <>
      <div className="h-[650px]">
        <Calendar
          localizer={localizer}
          events={eventos}
          startAccessor="start"
          endAccessor="end"
          defaultDate={addMonths(new Date(), 1)}
          culture="es"
          messages={{
            month: "Mes",
            week: "Semana",
            day: "Día",
            today: "Hoy",
            previous: "Anterior",
            next: "Siguiente",
            agenda: "Agenda",
            noEventsInRange: "Sin audiencias en este rango",
          }}
          onSelectEvent={(evento) => setSeleccionada((evento as EventoAudiencia).audiencia)}
          eventPropGetter={(evento) => ({
            style: {
              backgroundColor: ESTADO_AUDIENCIA_COLOR[(evento as EventoAudiencia).audiencia.estado],
              border: "none",
            },
          })}
        />
      </div>

      <Sheet open={seleccionada !== null} onOpenChange={(open) => !open && setSeleccionada(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Detalle de audiencia</SheetTitle>
            <SheetDescription>
              {seleccionada?.expedientes?.numero_expediente} —{" "}
              {seleccionada?.expedientes?.tipos_proceso?.nombre}
            </SheetDescription>
          </SheetHeader>
          {seleccionada && (
            <div className="flex flex-col gap-4 p-4 pt-0">
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                <p>
                  <span className="font-medium">Tipo:</span>{" "}
                  {TIPO_LABEL[seleccionada.tipo] ?? seleccionada.tipo}
                  {seleccionada.motivo ? ` · ${seleccionada.motivo}` : ""}
                </p>
                <p>
                  <span className="font-medium">Fecha programada:</span>{" "}
                  {new Date(seleccionada.fecha_programada).toLocaleDateString("es-PA")}
                </p>
                {seleccionada.fecha_limite_calculada && (
                  <p>
                    <span className="font-medium">Fecha límite (Ley 402):</span>{" "}
                    {new Date(seleccionada.fecha_limite_calculada).toLocaleDateString("es-PA")}
                  </p>
                )}
                <p>
                  <span className="font-medium">Estado:</span>{" "}
                  {ESTADO_AUDIENCIA_LABEL[seleccionada.estado]}
                </p>
              </div>
              {esAdmin && (
                <AccionesAudiencia
                  audienciaId={seleccionada.id}
                  onListo={() => setSeleccionada(null)}
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function AccionesAudiencia({
  audienciaId,
  onListo,
}: {
  audienciaId: string;
  onListo: () => void;
}) {
  async function marcar(estado: string) {
    const formData = new FormData();
    formData.set("audiencia_id", audienciaId);
    formData.set("estado", estado);
    await marcarEstadoAudiencia({}, formData);
    onListo();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Marcar como
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => marcar("celebrada")}>
          Celebrada
        </Button>
        <Button size="sm" variant="outline" onClick={() => marcar("suspendida")}>
          Suspendida
        </Button>
        <Button size="sm" variant="outline" onClick={() => marcar("continuada")}>
          Continuada
        </Button>
        <Button size="sm" variant="outline" onClick={() => marcar("terminada_por_incomparecencia")}>
          Terminada por incomparecencia
        </Button>
      </div>
    </div>
  );
}
