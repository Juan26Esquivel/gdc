import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentosTabla } from "./documentos-tabla";

export default async function DocumentosPage() {
  const supabase = await createClient();

  const { data: documentos } = await supabase
    .from("documentos")
    .select(
      `id, estado, created_at,
       expedientes(id, numero_expediente),
       tipos_documento(nombre),
       generado_por_usuario:usuarios!generado_por(nombre_completo),
       confirmado_por_usuario:usuarios!confirmado_por(nombre_completo)`,
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Vista general de todos los documentos. Para generar, revisar o confirmar un documento,
          entra al expediente correspondiente.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentosTabla documentos={documentos ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
