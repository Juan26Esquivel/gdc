import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("nombre_completo, rol, activo")
    .eq("auth_user_id", user?.id)
    .single();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sesión activa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p>
            <span className="font-medium">Correo:</span> {user?.email}
          </p>
          {perfil ? (
            <>
              <p>
                <span className="font-medium">Nombre:</span> {perfil.nombre_completo}
              </p>
              <p>
                <span className="font-medium">Rol:</span> {perfil.rol}
              </p>
              <p>
                <span className="font-medium">Activo:</span> {perfil.activo ? "Sí" : "No"}
              </p>
            </>
          ) : (
            <p className="text-sm text-destructive">
              No se encontró un perfil en `usuarios` para este login
              {error ? `: ${error.message}` : ""}.
            </p>
          )}
          <form action={logout}>
            <Button type="submit" variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
