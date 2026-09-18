import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // El correo no vive en `usuarios` (solo en Supabase Auth) — se resuelve
  // aparte con la clave de servicio, en un solo listado, no una consulta por
  // usuario. Si falla (ej. límite de la API), la tabla igual se muestra sin
  // correo en vez de romper toda la página.
  let emailPorAuthUserId = new Map<string, string>();
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    emailPorAuthUserId = new Map(
      (data?.users ?? []).map((u) => [u.id, u.email ?? ""]),
    );
  } catch {
    // Se deja el mapa vacío; ver comentario arriba.
  }

  const usuariosConEmail = (usuarios ?? []).map((u) => ({
    ...u,
    email: emailPorAuthUserId.get(u.auth_user_id) ?? null,
  }));

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
          <UsuariosTabla usuarios={usuariosConEmail} usuarioActualId={usuarioActual.id} />
        </CardContent>
      </Card>
    </div>
  );
}
