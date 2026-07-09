import Link from "next/link";
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
import { EstadoBadge } from "@/components/estado-badge";

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expediente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Generado por</TableHead>
                <TableHead>Confirmado por</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.expedientes?.numero_expediente}</TableCell>
                  <TableCell>{doc.tipos_documento?.nombre}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={doc.estado} />
                  </TableCell>
                  <TableCell>{doc.generado_por_usuario?.nombre_completo}</TableCell>
                  <TableCell>{doc.confirmado_por_usuario?.nombre_completo ?? "—"}</TableCell>
                  <TableCell>
                    {doc.expedientes?.id && (
                      <Link
                        href={`/expedientes/${doc.expedientes.id}/documentos`}
                        className="text-sm underline"
                      >
                        Ver expediente
                      </Link>
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
