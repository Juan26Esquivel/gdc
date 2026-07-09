import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltrosAuditoria } from "./filtros-auditoria";
import { AuditoriaTabla } from "./auditoria-tabla";

type Props = {
  searchParams: Promise<{ usuario?: string; entidad?: string }>;
};

export default async function AuditoriaPage({ searchParams }: Props) {
  const usuarioActual = await getUsuarioActual();
  if (usuarioActual?.rol !== "administrador") {
    redirect("/dashboard");
  }

  const { usuario, entidad } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("auditoria")
    .select("id, accion, entidad, entidad_id, detalle, created_at, usuario_id, usuarios(nombre_completo)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (usuario) query = query.eq("usuario_id", usuario);
  if (entidad) query = query.eq("entidad", entidad);

  const [{ data: registros }, { data: usuarios }, { data: entidades }] = await Promise.all([
    query,
    supabase.from("usuarios").select("id, nombre_completo").order("nombre_completo"),
    supabase.from("auditoria").select("entidad").limit(1000),
  ]);

  const entidadesUnicas = [...new Set((entidades ?? []).map((e) => e.entidad))].sort();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Panel de control / Auditoría
        </p>
        <h1 className="font-heading text-xl font-semibold text-primary">
          Registro de Auditoría (RNF-03)
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Historial de solo lectura de acciones sobre usuarios, configuración, catálogos y
          eliminaciones. Últimos 200 registros.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FiltrosAuditoria usuarios={usuarios ?? []} entidades={entidadesUnicas} />
          <AuditoriaTabla registros={registros ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
