import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ListaVacia({ mensaje }: { mensaje: string }) {
  return <p className="text-sm text-muted-foreground">{mensaje}</p>;
}

export type ItemMovimientoSinTrabajar = {
  id: string;
  numeroExpediente: string;
  tipoNombre: string;
  faseNombre: string | null;
  diasSinMovimiento: number;
  sinEventos: boolean;
};

export function TarjetaMovimientosSinTrabajar({
  items,
  umbralDias,
}: {
  items: ItemMovimientoSinTrabajar[];
  umbralDias: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos sin trabajar</CardTitle>
        <p className="text-xs text-muted-foreground">Umbral configurado: {umbralDias} días</p>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.length === 0 && <ListaVacia mensaje="Ningún expediente activo supera el umbral de inactividad." />}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/expedientes/${item.id}`}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {item.numeroExpediente} · {item.tipoNombre}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.sinEventos ? "Sin eventos registrados" : "Fase actual: " + (item.faseNombre ?? "—")}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="size-3" />
              {item.diasSinMovimiento} días
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export type ItemPendienteNotificar = {
  id: string;
  numeroExpediente: string;
  tipoNombre: string;
  diasEnAdmision: number;
  asignadoNombre: string | null;
};

export function TarjetaPendientesNotificar({
  items,
  plazoAdmisionDias,
}: {
  items: ItemPendienteNotificar[];
  plazoAdmisionDias: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendientes de notificar tras admisión</CardTitle>
        <p className="text-xs text-muted-foreground">
          Exceden el plazo de admisión (Art. 395, {plazoAdmisionDias} días hábiles) sin pasar a
          notificación
        </p>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.length === 0 && (
          <ListaVacia mensaje="Ningún expediente excede el plazo de admisión sin notificar." />
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/expedientes/${item.id}`}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {item.numeroExpediente} · {item.tipoNombre}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.asignadoNombre ?? "Sin asignar"}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-destructive">
              {item.diasEnAdmision} días hábiles
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export type ItemEdictoSinPublicar = {
  id: string;
  numeroExpediente: string;
  subtipoNombre: string | null;
  diasDesdeEdicto: number;
  fechaLimitePublicacion: string;
  reiteros: number;
};

export function TarjetaEdictosSinPublicar({
  items,
  plazoMeses,
}: {
  items: ItemEdictoSinPublicar[];
  plazoMeses: number;
}) {
  const textoPlazo = plazoMeses === 1 ? "un mes calendario" : `${plazoMeses} meses calendario`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edictos sin publicar (Jurisdicción voluntaria)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pasó {textoPlazo} desde el edicto emplazatorio sin que se publique el aviso en un diario
          de circulación nacional
        </p>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.length === 0 && (
          <ListaVacia mensaje={`Ningún edicto pasó de ${textoPlazo} sin publicación.`} />
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/expedientes/${item.id}`}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.numeroExpediente}</p>
              <p className="text-xs text-muted-foreground">
                Vencía el {item.fechaLimitePublicacion} ·{" "}
                {item.reiteros === 0
                  ? "sin reiteros"
                  : `${item.reiteros} reitero${item.reiteros === 1 ? "" : "s"}`}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="size-3" />
              {item.diasDesdeEdicto} días
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export type ItemAptoEmbargo = {
  id: string;
  numeroExpediente: string;
  diasHabilesDesdeNotificacion: number;
  fechaLimiteDecreto: string;
  pasadoElLimite: boolean;
};

/**
 * Pedido del usuario (transcripción del 2026-08-23): vencido el término de
 * excepción de un ejecutivo, el expediente queda apto para decretar el embargo
 * sobre los bienes denunciados. Solo aparecen los que siguen en la fase de
 * Notificación: si ya avanzaron a "Cumplimiento de embargo", el embargo se
 * decretó y la alerta no tiene sentido.
 */
export function TarjetaAptosParaEmbargo({
  items,
  plazoExcepcionDias,
  plazoEmbargoDias,
}: {
  items: ItemAptoEmbargo[];
  plazoExcepcionDias: number;
  plazoEmbargoDias: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ejecutivos aptos para decretar embargo</CardTitle>
        <p className="text-xs text-muted-foreground">
          Venció el término de {plazoExcepcionDias} días hábiles para presentar excepción; el día{" "}
          {plazoEmbargoDias} hábil es la referencia de límite para decretar
        </p>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.length === 0 && (
          <ListaVacia mensaje="Ningún ejecutivo tiene el término de excepción vencido." />
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/expedientes/${item.id}`}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.numeroExpediente}</p>
              <p className="text-xs text-muted-foreground">
                Límite para decretar: {item.fechaLimiteDecreto}
              </p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${
                item.pasadoElLimite ? "text-destructive" : "text-amber-700"
              }`}
            >
              <AlertTriangle className="size-3" />
              {item.diasHabilesDesdeNotificacion} días hábiles
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
