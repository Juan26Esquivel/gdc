import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ESTADO_DOCUMENTO_LABEL } from "@/lib/estado-documento";
import { GenerarDocumentoDialog } from "./generar-documento-dialog";
import { RevisarDocumentoAcciones } from "./revisar-documento-acciones";
import { RehacerDocumentoDialog } from "./rehacer-documento-dialog";

export default async function DocumentosPage() {
  const usuario = await getUsuarioActual();
  const esAsistente = usuario?.rol === "asistente";
  const esJuez = usuario?.rol === "juez";
  const esAdmin = usuario?.rol === "administrador";

  const supabase = await createClient();

  const [{ data: documentos }, { data: tiposDocumento }, { data: expedientesDisponibles }] =
    await Promise.all([
      supabase
        .from("documentos")
        .select(
          `id, estado, contenido_texto, observaciones_juez, archivo_docx_path, created_at,
           expedientes(numero_expediente),
           tipos_documento(nombre),
           generado_por_usuario:usuarios!generado_por(nombre_completo),
           confirmado_por_usuario:usuarios!confirmado_por(nombre_completo)`,
        )
        .order("created_at", { ascending: false }),
      supabase.from("tipos_documento").select("id, nombre").order("id"),
      esAsistente || esAdmin
        ? supabase
            .from("expedientes")
            .select("id, numero_expediente")
            .order("numero_expediente")
        : Promise.resolve({ data: [] }),
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documentos</h1>
        {(esAsistente || esAdmin) && (
          <GenerarDocumentoDialog
            expedientes={expedientesDisponibles ?? []}
            tiposDocumento={tiposDocumento ?? []}
          />
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
                <TableHead>Expediente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Generado por</TableHead>
                <TableHead>Confirmado por</TableHead>
                <TableHead>.docx</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentosConEnlace.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.expedientes?.numero_expediente}</TableCell>
                  <TableCell>{doc.tipos_documento?.nombre}</TableCell>
                  <TableCell>{ESTADO_DOCUMENTO_LABEL[doc.estado]}</TableCell>
                  <TableCell>{doc.generado_por_usuario?.nombre_completo}</TableCell>
                  <TableCell>{doc.confirmado_por_usuario?.nombre_completo ?? "—"}</TableCell>
                  <TableCell>
                    {doc.urlDescarga && (
                      <a
                        href={doc.urlDescarga}
                        className="text-sm underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Descargar
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    {(esJuez || esAdmin) && doc.estado === "validado" && (
                      <RevisarDocumentoAcciones documentoId={doc.id} />
                    )}
                    {(esAsistente || esAdmin) && doc.estado === "en_correccion" && (
                      <RehacerDocumentoDialog
                        documentoId={doc.id}
                        contenidoActual={doc.contenido_texto ?? ""}
                        observaciones={doc.observaciones_juez}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
