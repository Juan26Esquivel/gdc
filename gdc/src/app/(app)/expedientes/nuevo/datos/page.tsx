import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getConfiguracionSistema } from "@/lib/catalogos";
import { FormularioDatosExpediente } from "./formulario-datos";

type Props = {
  searchParams: Promise<{ tipo?: string; subtipo?: string }>;
};

export default async function NuevoExpedientePaso2({ searchParams }: Props) {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "administrador") redirect("/expedientes");

  const { tipo, subtipo } = await searchParams;
  const tipoProcesoId = Number(tipo);
  if (!tipoProcesoId) redirect("/expedientes/nuevo");

  const supabase = await createClient();
  const [{ data: tipoProceso }, { data: subtipoProceso }, { data: asistentes }, { data: despacho }, config] =
    await Promise.all([
      supabase.from("tipos_proceso").select("id, nombre").eq("id", tipoProcesoId).single(),
      subtipo
        ? supabase.from("subtipos_proceso").select("id, nombre").eq("id", Number(subtipo)).single()
        : Promise.resolve({ data: null }),
      supabase.from("usuarios").select("id, nombre_completo").eq("rol", "asistente").eq("activo", true),
      supabase.from("despachos").select("id, nombre, tipo").eq("id", usuario.despacho_id).single(),
      getConfiguracionSistema(),
    ]);

  if (!tipoProceso) redirect("/expedientes/nuevo");

  return (
    <FormularioDatosExpediente
      tipoProcesoId={tipoProcesoId}
      tipoProcesoNombre={tipoProceso.nombre}
      subtipoProcesoId={subtipoProceso?.id ?? null}
      subtipoProcesoNombre={subtipoProceso?.nombre ?? null}
      despachoNombre={despacho?.nombre ?? "—"}
      asistentes={asistentes ?? []}
      topeCuantia={Number(config?.tope_cuantia ?? 10000)}
    />
  );
}
