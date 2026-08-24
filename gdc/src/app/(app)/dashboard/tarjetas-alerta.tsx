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
          Exceden el plazo de admisión (Art. 395, {plazoAdmisionDias} días) sin pasar a notificación
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
              {item.diasEnAdmision} días
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
};

export function TarjetaEdictosSinPublicar({ items }: { items: ItemEdictoSinPublicar[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edictos sin publicar (Jurisdicción voluntaria)</CardTitle>
        <p className="text-xs text-muted-foreground">Más de 30 días desde el edicto emplazatorio</p>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.length === 0 && <ListaVacia mensaje="Ningún edicto lleva más de 30 días sin publicación." />}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/expedientes/${item.id}`}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.numeroExpediente}</p>
              <p className="text-xs text-muted-foreground">{item.subtipoNombre ?? "Jurisdicción voluntaria"}</p>
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
