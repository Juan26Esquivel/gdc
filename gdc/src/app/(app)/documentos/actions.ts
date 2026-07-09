"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { generarDocxBuffer } from "@/lib/documentos/generar-docx";

export type EstadoGenerarDocumento = { error?: string; ok?: boolean };

export async function generarDocumento(
  _prevState: EstadoGenerarDocumento,
  formData: FormData,
): Promise<EstadoGenerarDocumento> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "asistente" && actual?.rol !== "administrador") {
    return { error: "No tienes permiso para generar documentos" };
  }

  const expedienteId = formData.get("expediente_id") as string;
  const tipoDocumentoId = Number(formData.get("tipo_documento_id"));
  const contenido = (formData.get("contenido_texto") as string)?.trim();

  if (!expedienteId || !tipoDocumentoId || !contenido) {
    return { error: "Expediente, tipo de documento y contenido son obligatorios" };
  }

  const supabase = await createClient();

  const { data: expediente, error: errorExpediente } = await supabase
    .from("expedientes")
    .select("numero_expediente, tipos_proceso(nombre)")
    .eq("id", expedienteId)
    .single();

  if (errorExpediente || !expediente) {
    return { error: "No se encontró el expediente (o no está asignado a ti)" };
  }

  const { data: tipoDocumento, error: errorTipoDocumento } = await supabase
    .from("tipos_documento")
    .select("nombre")
    .eq("id", tipoDocumentoId)
    .single();

  if (errorTipoDocumento || !tipoDocumento) {
    return { error: "Tipo de documento inválido" };
  }

  const { data: documento, error: errorInsert } = await supabase
    .from("documentos")
    .insert({
      expediente_id: expedienteId,
      tipo_documento_id: tipoDocumentoId,
      generado_por: actual.id,
      contenido_texto: contenido,
      // La "validación" es automática al generarse el .docx (completitud de campos,
      // ya garantizada por los required del formulario) — no es una acción de rol (RF-12/13).
      estado: "validado",
    })
    .select("id")
    .single();

  if (errorInsert || !documento) {
    return { error: `No se pudo crear el documento: ${errorInsert?.message}` };
  }

  const buffer = await generarDocxBuffer({
    tipoDocumento: tipoDocumento.nombre,
    numeroExpediente: expediente.numero_expediente,
    tipoProceso: expediente.tipos_proceso?.nombre ?? "",
    contenido,
  });

  const rutaArchivo = `${expedienteId}/${documento.id}.docx`;
  const { error: errorStorage } = await supabase.storage
    .from("documentos-docx")
    .upload(rutaArchivo, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });

  if (errorStorage) {
    return { error: `Documento creado, pero falló subir el .docx: ${errorStorage.message}` };
  }

  await supabase.from("documentos").update({ archivo_docx_path: rutaArchivo }).eq("id", documento.id);

  revalidatePath("/documentos");
  return { ok: true };
}

export type EstadoRevisarDocumento = { error?: string; ok?: boolean };

export async function dejarObservaciones(
  _prevState: EstadoRevisarDocumento,
  formData: FormData,
): Promise<EstadoRevisarDocumento> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "juez" && actual?.rol !== "administrador") {
    return { error: "No tienes permiso para revisar documentos" };
  }

  const documentoId = formData.get("documento_id") as string;
  const observaciones = (formData.get("observaciones_juez") as string)?.trim();

  if (!documentoId || !observaciones) {
    return { error: "Debes escribir una observación" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("documentos")
    .update({ estado: "en_correccion", observaciones_juez: observaciones })
    .eq("id", documentoId);

  if (error) {
    return { error: `No se pudo registrar la observación: ${error.message}` };
  }

  revalidatePath("/documentos");
  return { ok: true };
}

export async function confirmarDocumento(
  _prevState: EstadoRevisarDocumento,
  formData: FormData,
): Promise<EstadoRevisarDocumento> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "juez" && actual?.rol !== "administrador") {
    return { error: "No tienes permiso para confirmar documentos" };
  }

  const documentoId = formData.get("documento_id") as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from("documentos")
    .update({
      estado: "confirmado",
      confirmado_por: actual.id,
      fecha_confirmacion: new Date().toISOString(),
    })
    .eq("id", documentoId);

  if (error) {
    return { error: `No se pudo confirmar el documento: ${error.message}` };
  }

  revalidatePath("/documentos");
  return { ok: true };
}

export async function rehacerDocumento(
  _prevState: EstadoGenerarDocumento,
  formData: FormData,
): Promise<EstadoGenerarDocumento> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "asistente" && actual?.rol !== "administrador") {
    return { error: "No tienes permiso para rehacer documentos" };
  }

  const documentoId = formData.get("documento_id") as string;
  const contenido = (formData.get("contenido_texto") as string)?.trim();

  if (!documentoId || !contenido) {
    return { error: "El contenido no puede estar vacío" };
  }

  const supabase = await createClient();

  const { data: documento, error: errorDocumento } = await supabase
    .from("documentos")
    .select("expediente_id, tipo_documento_id, expedientes(numero_expediente, tipos_proceso(nombre)), tipos_documento(nombre)")
    .eq("id", documentoId)
    .single();

  if (errorDocumento || !documento) {
    return { error: "No se encontró el documento" };
  }

  const buffer = await generarDocxBuffer({
    tipoDocumento: documento.tipos_documento?.nombre ?? "",
    numeroExpediente: documento.expedientes?.numero_expediente ?? "",
    tipoProceso: documento.expedientes?.tipos_proceso?.nombre ?? "",
    contenido,
  });

  const rutaArchivo = `${documento.expediente_id}/${documentoId}.docx`;
  const { error: errorStorage } = await supabase.storage
    .from("documentos-docx")
    .upload(rutaArchivo, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });

  if (errorStorage) {
    return { error: `No se pudo actualizar el .docx: ${errorStorage.message}` };
  }

  const { error: errorUpdate } = await supabase
    .from("documentos")
    .update({ contenido_texto: contenido, estado: "validado", archivo_docx_path: rutaArchivo })
    .eq("id", documentoId);

  if (errorUpdate) {
    return { error: `No se pudo actualizar el documento: ${errorUpdate.message}` };
  }

  revalidatePath("/documentos");
  return { ok: true };
}

export type EstadoEliminarDocumento = { error?: string; ok?: boolean };

// RF-33-EXTRA: el borrado en sí queda registrado automáticamente en `auditoria`
// por el trigger de base de datos (migración 013) — no hace falta duplicarlo aquí.
export async function eliminarDocumento(documentoId: string): Promise<EstadoEliminarDocumento> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "No tienes permiso para realizar esta acción" };
  }

  const supabase = await createClient();

  const { data: documento } = await supabase
    .from("documentos")
    .select("expediente_id, archivo_docx_path")
    .eq("id", documentoId)
    .single();

  const { error } = await supabase.from("documentos").delete().eq("id", documentoId);
  if (error) return { error: `No se pudo eliminar el documento: ${error.message}` };

  if (documento?.archivo_docx_path) {
    await supabase.storage.from("documentos-docx").remove([documento.archivo_docx_path]);
  }

  revalidatePath("/documentos");
  return { ok: true };
}
