import { redirect } from "next/navigation";
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
import { NuevoUsuarioDialog } from "./nuevo-usuario-dialog";

const ROL_LABEL: Record<string, string> = {
  juez: "Juez",
  asistente: "Asistente",
  analista_datos: "Analista de Datos",
  administrador: "Administrador",
};

export default async function UsuariosPage() {
  const usuarioActual = await getUsuarioActual();

  if (usuarioActual?.rol !== "administrador") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nombre_completo, rol, activo, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <NuevoUsuarioDialog />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del despacho</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.nombre_completo}</TableCell>
                  <TableCell>{ROL_LABEL[u.rol]}</TableCell>
                  <TableCell>{u.activo ? "Activo" : "Desactivado"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
