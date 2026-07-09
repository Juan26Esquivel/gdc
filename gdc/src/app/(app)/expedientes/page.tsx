import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getTiposProceso, getSubtiposProceso } from "@/lib/catalogos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NuevoExpedienteDialog } from "./nuevo-expediente-dialog";
import { AvanzarFaseForm } from "./avanzar-fase-form";
import { AsignarDialog } from "./asignar-dialog";
import { FASE_LABEL } from "@/lib/fases";

export default async function ExpedientesPage() {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario?.rol === "administrador";

  const supabase = await createClient();
  const [{ data: expedientes }, tiposProceso, subtiposProceso, { data: asistentes }] =
    await Promise.all([
      supabase
        .from("expedientes")
        .select(
          `id, numero_expediente, cuantia, es_lanzamiento, created_at,
           tipos_proceso(nombre),
           subtipos_proceso(nombre),
           expediente_fases(fase, fecha_fin),
           asignaciones(activa, usuarios!asistente_id(id, nombre_completo))`,
        )
        .order("created_at", { ascending: false }),
      getTiposProceso(),
      getSubtiposProceso(),
      esAdmin
        ? supabase
            .from("usuarios")
            .select("id, nombre_completo")
            .eq("rol", "asistente")
            .eq("activo", true)
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Expedientes</h1>
        {esAdmin && (
          <NuevoExpedienteDialog tiposProceso={tiposProceso} subtiposProceso={subtiposProceso} />
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Subtipo</TableHead>
                <TableHead>Cuantía</TableHead>
                <TableHead>Fase actual</TableHead>
                {esAdmin && <TableHead>Asignado a</TableHead>}
                {esAdmin && <TableHead>Acción</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expedientes?.map((exp) => {
                const faseActual = exp.expediente_fases.find((f) => f.fecha_fin === null);
                const asignacionActual = exp.asignaciones.find((a) => a.activa);
                return (
                  <TableRow key={exp.id}>
                    <TableCell>{exp.numero_expediente}</TableCell>
                    <TableCell>{exp.tipos_proceso?.nombre}</TableCell>
                    <TableCell>{exp.subtipos_proceso?.nombre ?? "—"}</TableCell>
                    <TableCell>
                      {exp.es_lanzamiento
                        ? "Lanzamiento (sin tope)"
                        : exp.cuantia
                          ? `B/.${exp.cuantia}`
                          : "Indeterminada"}
                    </TableCell>
                    <TableCell>
                      {faseActual ? FASE_LABEL[faseActual.fase] : "—"}
                    </TableCell>
                    {esAdmin && (
                      <TableCell>
                        <AsignarDialog
                          expedienteId={exp.id}
                          asistentes={asistentes ?? []}
                          asignadoActualId={asignacionActual?.usuarios?.id ?? null}
                          asignadoActualNombre={asignacionActual?.usuarios?.nombre_completo ?? null}
                        />
                      </TableCell>
                    )}
                    {esAdmin && (
                      <TableCell>
                        {faseActual && faseActual.fase !== "audiencia_fondo" && (
                          <AvanzarFaseForm
                            expedienteId={exp.id}
                            faseActual={faseActual.fase}
                          />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
