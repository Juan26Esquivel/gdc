import { createClient } from "@/lib/supabase/server";

export type RolGdc = "juez" | "asistente" | "analista_datos" | "administrador";

export type UsuarioActual = {
  id: string;
  nombre_completo: string;
  rol: RolGdc;
  activo: boolean;
  despacho_id: string;
  email: string | null;
};

export async function getUsuarioActual(): Promise<UsuarioActual | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre_completo, rol, activo, despacho_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!perfil) return null;

  return { ...perfil, email: user.email ?? null };
}
