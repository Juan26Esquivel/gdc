"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual, type RolGdc } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/auditoria";

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
    // Por ahora solo existe un despacho: el nuevo usuario se asigna al mismo
    // despacho del Administrador que lo crea (OT-02). Cuando exista más de
    // uno, este formulario necesitará su propio selector de despacho.
    despacho_id: actual.despacho_id,
  });

  if (errorInsert) {
    // Evita dejar un usuario de Auth huérfano sin fila en `usuarios`.
    await admin.auth.admin.deleteUser(nuevoAuthUser.user.id);
    return { error: `No se pudo crear el perfil: ${errorInsert.message}` };
  }

  await registrarAuditoria(actual.id, "crear_usuario", "usuario", nuevoAuthUser.user.id, {
    nombre_completo: nombreCompleto,
    rol,
  });

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function actualizarUsuario(
  _prevState: EstadoCrearUsuario,
  formData: FormData,
): Promise<EstadoCrearUsuario> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const id = formData.get("id") as string;
  const nombreCompleto = (formData.get("nombre_completo") as string)?.trim();
  const rol = formData.get("rol") as string;

  if (!id || !nombreCompleto || !rol) {
    return { error: "Nombre y rol son obligatorios" };
  }
  if (!esRolValido(rol)) {
    return { error: "Rol inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ nombre_completo: nombreCompleto, rol })
    .eq("id", id);

  if (error) return { error: `No se pudo actualizar el usuario: ${error.message}` };

  await registrarAuditoria(actual.id, "editar_usuario", "usuario", id, {
    nombre_completo: nombreCompleto,
    rol,
  });

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function alternarActivoUsuario(id: string, activo: boolean): Promise<EstadoCrearUsuario> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }
  if (actual.id === id && !activo) {
    return { error: "No puedes desactivar tu propia cuenta" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("usuarios").update({ activo }).eq("id", id);
  if (error) return { error: error.message };

  // No hay forma de invalidar la sesión de otro usuario por id (la API admin
  // de Supabase solo permite cerrar sesión dado un JWT, que no tenemos aquí):
  // el bloqueo real ocurre en el middleware (fn_usuario_rol()/fn_usuario_id()
  // devuelven null para inactivos), que lo detecta en su próxima navegación.
  await registrarAuditoria(
    actual.id,
    activo ? "activar_usuario" : "desactivar_usuario",
    "usuario",
    id,
  );

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function restablecerContrasenaUsuario(
  _prevState: EstadoCrearUsuario,
  formData: FormData,
): Promise<EstadoCrearUsuario> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const authUserId = formData.get("auth_user_id") as string;
  const usuarioId = formData.get("id") as string;
  const nuevaContrasena = formData.get("nueva_contrasena") as string;

  if (!authUserId || !nuevaContrasena) {
    return { error: "Falta la nueva contraseña" };
  }
  if (nuevaContrasena.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    password: nuevaContrasena,
  });

  if (error) return { error: `No se pudo restablecer la contraseña: ${error.message}` };

  await registrarAuditoria(actual.id, "restablecer_contrasena", "usuario", usuarioId);

  revalidatePath("/usuarios");
  return { ok: true };
}
