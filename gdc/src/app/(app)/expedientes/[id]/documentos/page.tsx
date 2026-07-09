import { notFound } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { DocumentoWorkspace } from "./documento-workspace";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExpedienteDocumentosPage({ params }: Props) {
  const { id } = await params;
  const usuario = await getUsuarioActual();
  const supabase = await createClient();

  const { data: expediente } = await supabase
    .from("expedientes")
    .select("id, numero_expediente, tipos_proceso(nombre)")
    .eq("id", id)
    .single();

  if (!expediente) notFound();

  const [{ data: documentos }, { data: tiposDocumento }] = await Promise.all([
    supabase
      .from("documentos")
      .select(
        `id, tipo_documento_id, estado, contenido_texto, observaciones_juez,
         archivo_docx_path, created_at, updated_at, fecha_confirmacion,
         tipos_documento(nombre),
         generado_por_usuario:usuarios!generado_por(nombre_completo),
         confirmado_por_usuario:usuarios!confirmado_por(nombre_completo)`,
      )
      .eq("expediente_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("tipos_documento").select("id, nombre").order("id"),
  ]);

  const documentosConEnlace = await Promise.all(
    (documentos ?? []).map(async (doc) => {
      if (!doc.archivo_docx_path) return { ...doc, urlDescarga: null as string | null };
      const { data } = await supabase.storage
        .from("documentos-docx")
        .createSignedUrl(doc.archivo_docx_path, 60 * 10);
      return { ...doc, urlDescarga: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Panel principal / Expedientes / {expediente.numero_expediente}
      </p>
      <div>
        <h1 className="font-heading text-xl font-semibold">
          Documentos del Expediente {expediente.numero_expediente}
        </h1>
        <p className="text-sm text-muted-foreground">
          {expediente.tipos_proceso?.nombre} — generación de resoluciones judiciales y
          comunicaciones administrativas según Ley 402.
        </p>
      </div>
      <DocumentoWorkspace
        expedienteId={id}
        documentos={documentosConEnlace}
        tiposDocumento={tiposDocumento ?? []}
        rol={usuario!.rol}
      />
    </div>
  );
}
