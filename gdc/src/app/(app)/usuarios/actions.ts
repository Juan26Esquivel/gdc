"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual, type RolGdc } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoCrearUsuario = { error?: string; ok?: boolean };

const ROLES_VALIDOS: RolGdc[] = ["juez", "asistente", "analista_datos", "administrador"];

function esRolValido(valor: string): valor is RolGdc {
  return (ROLES_VALIDOS as string[]).includes(valor);
}

export async function crearUsuario(
  _prevState: EstadoCrearUsuario,
  formData: FormData,
): Promise<EstadoCrearUsuario> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const nombreCompleto = (formData.get("nombre_completo") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const rol = formData.get("rol") as string;

  if (!nombreCompleto || !email || !password || !rol) {
    return { error: "Todos los campos son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (!esRolValido(rol)) {
    return { error: "Rol inválido" };
  }

  const admin = createAdminClient();
  const { data: nuevoAuthUser, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (errorAuth || !nuevoAuthUser.user) {
    return { error: `No se pudo crear la cuenta: ${errorAuth?.message ?? "error desconocido"}` };
  }

  const supabase = await createClient();
  const { error: errorInsert } = await supabase.from("usuarios").insert({
    auth_user_id: nuevoAuthUser.user.id,
    nombre_completo: nombreCompleto,
    rol,
  });

  if (errorInsert) {
    // Evita dejar un usuario de Auth huérfano sin fila en `usuarios`.
    await admin.auth.admin.deleteUser(nuevoAuthUser.user.id);
    return { error: `No se pudo crear el perfil: ${errorInsert.message}` };
  }

  revalidatePath("/usuarios");
  return { ok: true };
}
