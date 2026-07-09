import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NuevoUsuarioDialog } from "./nuevo-usuario-dialog";
import { UsuariosTabla } from "./usuarios-tabla";

export default async function UsuariosPage() {
  const usuarioActual = await getUsuarioActual();

  if (usuarioActual?.rol !== "administrador") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, auth_user_id, nombre_completo, rol, activo, created_at")
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
          <UsuariosTabla usuarios={usuarios ?? []} usuarioActualId={usuarioActual.id} />
        </CardContent>
      </Card>
    </div>
  );
}
