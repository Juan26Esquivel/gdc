"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDiasNoHabiles } from "@/lib/catalogos";
import { calcularVentanaPreliminar } from "@/lib/ventana-audiencia";

export type EstadoAccionExpediente = { error?: string; advertencia?: string; ok?: boolean };

/** Coincide con el `check` de expedientes.estado_proceso (migración
 *  20260823160001). Los tres distintos de en_tramite cierran el expediente. */
const ESTADOS_PROCESO_VALIDOS = ["en_tramite", "desistido", "conciliado", "retirado"];

async function puedeActuarSobreExpediente(expedienteId: string) {
  const actual = await getUsuarioActual();
  if (!actual) return null;
  if (actual.rol === "administrador" || actual.rol === "juez") return actual;
  if (actual.rol === "asistente") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("asignaciones")
      .select("id")
      .eq("expediente_id", expedienteId)
      .eq("asistente_id", actual.id)
      .eq("activa", true)
      .maybeSingle();
    return data ? actual : null;
  }
  return null;
}

// OT-04 sección 3.5: un solo formulario de "Registrar nuevo evento" con
// campos condicionales según el tipo elegido. Los 3 tipos que además tocan
// un campo de expedientes (corrección de fecha, override de umbral, estado
// de matrimonio) actualizan ese campo aquí mismo antes de insertar el evento
// manual — nunca se duplica la lógica de cierre, que sigue siendo solo del
// trigger de base de datos (OT-03).
export async function registrarEvento(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const expedienteId = formData.get("expediente_id") as string;
  const actual = await puedeActuarSobreExpediente(expedienteId);
  if (!actual) return { error: "No tienes permiso para registrar eventos en este expediente" };

  const tipoEventoId = formData.get("tipo_evento_id") as string;
  const codigo = formData.get("codigo_evento") as string;
  const fechaEvento = formData.get("fecha_evento") as string;
  const detalle = (formData.get("detalle") as string)?.trim() || null;

  if (!tipoEventoId || !fechaEvento) {
    return { error: "El tipo de evento y la fecha son obligatorios" };
  }

  const supabase = await createClient();

  if (codigo === "correccion_fecha_registro") {
    const nuevaFecha = formData.get("nueva_fecha_registro") as string;
    if (!nuevaFecha) return { error: "Debes indicar la nueva fecha de registro" };
    const { data: filas, error } = await supabase
      .from("expedientes")
      .update({ fecha_registro: nuevaFecha })
      .eq("id", expedienteId)
      .select("id");
    if (error) return { error: `No se pudo corregir la fecha de registro: ${error.message}` };
    // Un UPDATE que RLS descarta devuelve 0 filas sin lanzar error. Sin este
    // control la pantalla decía "guardado" y la fecha no cambiaba.
    if (!filas?.length) return { error: "No tienes permiso para corregir la fecha de este expediente" };
  }

  if (codigo === "override_umbral_inactividad") {
    const motivo = (formData.get("motivo_omision_umbral") as string)?.trim();
    if (!motivo) return { error: "El motivo es obligatorio para omitir el umbral de inactividad" };
    const { data: filas, error } = await supabase
      .from("expedientes")
      .update({ omitir_umbral_inactividad: true, motivo_omision_umbral: motivo })
      .eq("id", expedienteId)
      .select("id");
    if (error) return { error: `No se pudo activar el override: ${error.message}` };
    if (!filas?.length) return { error: "No tienes permiso para activar el override en este expediente" };
    // OT-01 sección 3.5: acción administrativa sensible, se registra también
    // en auditoria (además del evento de negocio que se inserta abajo).
    await registrarAuditoria(actual.id, "activar_override_umbral_inactividad", "expediente", expedienteId, {
      motivo,
    });
  }

  if (codigo === "estado_matrimonio_actualizado") {
    const nuevoEstado = formData.get("estado_matrimonio") as string;
    if (!nuevoEstado) return { error: "Debes seleccionar el nuevo estado" };
    const { data: filas, error } = await supabase
      .from("expedientes")
      .update({ estado_matrimonio: nuevoEstado })
      .eq("id", expedienteId)
      .select("id");
    if (error) return { error: `No se pudo actualizar el estado: ${error.message}` };
    if (!filas?.length) return { error: "No tienes permiso para cambiar el estado de este expediente" };
    // El trigger de OT-03 se encarga de cerrar el expediente si corresponde
    // (celebrado/retirado) y de insertar el evento "expediente_cerrado" — no
    // se duplica esa lógica aquí.
  }

  // Desistimiento, conciliación y retiro son ESTADOS del expediente (decisión
  // del usuario del 2026-08-23), y los tres son terminales: el trigger de la
  // migración 20260823160001 cierra el expediente e inserta el evento de cierre.
  // Aquí solo se cambia el estado; el cierre no se duplica.
  if (codigo === "estado_proceso_actualizado") {
    const nuevoEstado = formData.get("estado_proceso") as string;
    if (!ESTADOS_PROCESO_VALIDOS.includes(nuevoEstado)) {
      return { error: "Debes seleccionar un estado válido del proceso" };
    }
    const { data: filas, error } = await supabase
      .from("expedientes")
      .update({ estado_proceso: nuevoEstado })
      .eq("id", expedienteId)
      .select("id");
    if (error) return { error: `No se pudo actualizar el estado del proceso: ${error.message}` };
    if (!filas?.length) {
      return { error: "No tienes permiso para cambiar el estado de este expediente" };
    }
  }

  const { error: errorEvento } = await supabase.from("eventos_expediente").insert({
    expediente_id: expedienteId,
    tipo_evento_id: tipoEventoId,
    fecha_evento: fechaEvento,
    detalle,
    registrado_por: actual.id,
  });

  if (errorEvento) return { error: `No se pudo registrar el evento: ${errorEvento.message}` };

  revalidatePath(`/expedientes/${expedienteId}`);
  return { ok: true };
}

export async function registrarAbonoEmbargo(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const expedienteId = formData.get("expediente_id") as string;
  const actual = await puedeActuarSobreExpediente(expedienteId);
  if (!actual) return { error: "No tienes permiso para registrar abonos en este expediente" };

  const monto = Number(formData.get("monto"));
  const fecha = formData.get("fecha") as string;

  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser un número mayor a 0" };
  }
  if (!fecha) return { error: "La fecha del abono es obligatoria" };

  const supabase = await createClient();
  // El evento "abono_embargo" lo genera el trigger de OT-03 automáticamente
  // al insertar aquí — no se duplica.
  const { error } = await supabase.from("embargo_abonos").insert({
    expediente_id: expedienteId,
    monto,
    fecha,
    registrado_por: actual.id,
  });

  if (error) return { error: `No se pudo registrar el abono: ${error.message}` };

  revalidatePath(`/expedientes/${expedienteId}`);
  return { ok: true };
}

const FISICO_ELECTRONICO_VALIDOS = ["fisico", "electronico"];
const MUNICIPAL_CIRCUITO_VALIDOS = ["municipal", "circuito"];
const MAX_PRETENSION = 200;
const MAX_NOTAS = 2000;

/** '' del formulario significa "sin valor" (null en base), no cadena vacía. */
function textoOpcional(formData: FormData, campo: string) {
  const valor = (formData.get(campo) as string | null)?.trim();
  return valor ? valor : null;
}

/**
 * OT-04 sección 3.3: corrección de los datos generales de un expediente ya
 * registrado (antes esta pestaña era de solo lectura y un dato mal escrito no
 * tenía cómo arreglarse).
 *
 * Solo los 5 campos descriptivos. Los que alimentan una alerta o el cierre
 * (fecha_registro, observación, estado de matrimonio, override de umbral) se
 * siguen corrigiendo desde la pestaña de eventos, para que quede el rastro de
 * quién y por qué — no se duplican aquí. La migración 20260823110001 restringe
 * lo mismo del lado de la base de datos.
 */
export async function actualizarDatosGenerales(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const expedienteId = formData.get("expediente_id") as string;
  const actual = await puedeActuarSobreExpediente(expedienteId);
  if (!actual) return { error: "No tienes permiso para editar este expediente" };

  const fisicoElectronico = textoOpcional(formData, "fisico_electronico");
  const municipalCircuito = textoOpcional(formData, "municipal_circuito");
  const pretension = textoOpcional(formData, "pretension");
  const notas = textoOpcional(formData, "notas");
  const fechaNotificacion = textoOpcional(formData, "fecha_notificacion_demanda");

  // Se valida en el servidor aunque el <select> del formulario ya limite las
  // opciones: el cliente no es de fiar. Coincide con los `check` de la
  // migración 20260823090003.
  if (fisicoElectronico && !FISICO_ELECTRONICO_VALIDOS.includes(fisicoElectronico)) {
    return { error: "El valor de físico/electrónico no es válido" };
  }
  if (municipalCircuito && !MUNICIPAL_CIRCUITO_VALIDOS.includes(municipalCircuito)) {
    return { error: "El valor de municipal/circuito no es válido" };
  }
  if (pretension && pretension.length > MAX_PRETENSION) {
    return { error: `La pretensión no puede pasar de ${MAX_PRETENSION} caracteres` };
  }
  if (notas && notas.length > MAX_NOTAS) {
    return { error: `Las notas no pueden pasar de ${MAX_NOTAS} caracteres` };
  }
  if (fechaNotificacion && Number.isNaN(new Date(fechaNotificacion).getTime())) {
    return { error: "La fecha de notificación no es una fecha válida" };
  }

  const supabase = await createClient();

  const { data: antes } = await supabase
    .from("expedientes")
    .select("fisico_electronico, municipal_circuito, pretension, notas, fecha_notificacion_demanda")
    .eq("id", expedienteId)
    .maybeSingle();

  if (!antes) return { error: "No se encontró el expediente" };

  const despues = {
    fisico_electronico: fisicoElectronico,
    municipal_circuito: municipalCircuito,
    pretension,
    notas,
    fecha_notificacion_demanda: fechaNotificacion,
  };

  // Solo lo que de verdad cambió, para que la auditoría sea legible y no se
  // registre una entrada vacía por abrir y cerrar el formulario.
  const cambios = Object.entries(despues).filter(
    ([campo, valor]) => valor !== antes[campo as keyof typeof antes],
  );

  if (cambios.length === 0) return { ok: true };

  const { data: filasActualizadas, error } = await supabase
    .from("expedientes")
    .update({ ...despues, updated_at: new Date().toISOString() })
    .eq("id", expedienteId)
    .select("id");

  if (error) return { error: `No se pudieron guardar los cambios: ${error.message}` };
  // Un UPDATE que RLS descarta no lanza error: devuelve 0 filas. Sin esta
  // comprobación la pantalla diría "guardado" y nada habría cambiado.
  if (!filasActualizadas || filasActualizadas.length === 0) {
    return { error: "No se guardó nada: no tienes permiso para editar este expediente" };
  }

  // Si cambió la fecha de notificación, la ventana legal guardada de las
  // audiencias preliminares quedó desactualizada: se recalcula aquí mismo para
  // que no convivan dos rangos distintos para la misma audiencia.
  if (cambios.some(([campo]) => campo === "fecha_notificacion_demanda")) {
    await recalcularVentanaPreliminar(expedienteId, await getDiasNoHabiles());
  }

  await registrarAuditoria(actual.id, "editar_datos_generales", "expediente", expedienteId, {
    cambios: Object.fromEntries(
      cambios.map(([campo, valor]) => [
        campo,
        { antes: antes[campo as keyof typeof antes], despues: valor },
      ]),
    ),
  });

  revalidatePath(`/expedientes/${expedienteId}`);
  return { ok: true };
}

/**
 * Audiencia especial (Art. 262 y 263, Ley 402). A diferencia de la preliminar y
 * la de fondo, no depende de una fase del proceso ni tiene ventana
 * parametrizable: se convoca cuando surge el incidente que la motiva, así que no
 * entra por `avanzarFase` y necesita su propia vía.
 *
 * Escritura sobre `audiencias` restringida al Administrador (migración
 * 20260709090002): programar audiencias es acto del despacho.
 */
export async function programarAudienciaEspecial(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "Solo el Administrador puede programar audiencias" };
  }

  const expedienteId = formData.get("expediente_id") as string;
  const fecha = (formData.get("fecha_programada") as string)?.trim();
  const motivo = (formData.get("motivo") as string)?.trim();

  if (!fecha || Number.isNaN(new Date(fecha).getTime())) {
    return { error: "La fecha de la audiencia no es válida" };
  }
  if (!motivo) {
    return { error: "El motivo es obligatorio: es lo que distingue una audiencia especial de otra" };
  }
  if (motivo.length > 300) {
    return { error: "El motivo no puede pasar de 300 caracteres" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("audiencias").insert({
    expediente_id: expedienteId,
    tipo: "especial",
    fecha_programada: fecha,
    motivo,
    // Sin fecha mínima ni límite: la audiencia especial no tiene ventana legal
    // parametrizable, se convoca por el incidente.
  });

  if (error) return { error: `No se pudo programar la audiencia: ${error.message}` };

  await registrarAuditoria(actual.id, "programar_audiencia_especial", "expediente", expedienteId, {
    fecha_programada: fecha,
    motivo,
  });

  revalidatePath(`/expedientes/${expedienteId}`);
  revalidatePath("/calendario");
  return { ok: true };
}

/**
 * Reprogramar una audiencia ya fijada. Antes solo se podía cambiar su estado
 * (celebrada/suspendida/...), no la fecha, así que un aplazamiento no tenía cómo
 * registrarse. Si la fecha nueva se sale de la ventana legal se avisa, no se
 * bloquea: el mismo criterio que al programarla desde el avance de fase.
 */
export async function reprogramarAudiencia(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "Solo el Administrador puede reprogramar audiencias" };
  }

  const audienciaId = formData.get("audiencia_id") as string;
  const expedienteId = formData.get("expediente_id") as string;
  const nuevaFecha = (formData.get("nueva_fecha") as string)?.trim();

  if (!audienciaId) return { error: "Audiencia inválida" };
  if (!nuevaFecha || Number.isNaN(new Date(nuevaFecha).getTime())) {
    return { error: "La fecha nueva no es válida" };
  }

  const supabase = await createClient();
  const { data: audiencia } = await supabase
    .from("audiencias")
    .select("tipo, fecha_programada, fecha_minima_calculada, fecha_limite_calculada")
    .eq("id", audienciaId)
    .maybeSingle();

  if (!audiencia) return { error: "No se encontró la audiencia" };
  if (audiencia.fecha_programada.slice(0, 10) === nuevaFecha.slice(0, 10)) {
    return { error: "La fecha nueva es la misma que la actual" };
  }

  const { data: filas, error } = await supabase
    .from("audiencias")
    .update({ fecha_programada: nuevaFecha })
    .eq("id", audienciaId)
    .select("id");

  if (error) return { error: `No se pudo reprogramar: ${error.message}` };
  if (!filas?.length) return { error: "No tienes permiso para reprogramar esta audiencia" };

  await registrarAuditoria(actual.id, "reprogramar_audiencia", "expediente", expedienteId, {
    audiencia_id: audienciaId,
    tipo: audiencia.tipo,
    antes: audiencia.fecha_programada,
    despues: nuevaFecha,
  });

  revalidatePath(`/expedientes/${expedienteId}`);
  revalidatePath("/calendario");

  const desde = audiencia.fecha_minima_calculada?.slice(0, 10);
  const hasta = audiencia.fecha_limite_calculada?.slice(0, 10);
  const dia = nuevaFecha.slice(0, 10);
  if (desde && hasta && (dia < desde || dia > hasta)) {
    return {
      ok: true,
      advertencia: `Reprogramada, pero la fecha nueva queda fuera de la ventana legal (${desde} a ${hasta}).`,
    };
  }

  return { ok: true };
}

/**
 * Establece o amplía el monto del mandamiento de pago, que es la base del
 * embargo (`expedientes.monto_embargo_decretado`). Hasta ahora esa columna solo
 * se leía: no había forma de escribirla, y sin ella la tarjeta de saldo nunca
 * aparecía y los abonos de OT-03 no tenían contra qué calcularse.
 *
 * La ampliación tiene respaldo en el Art. 744 (auto de mandamiento de pago
 * sujeto a cuotas, plazos o ampliación): al vencer nuevos plazos o cuotas, la
 * ejecución puede ampliarse por su importe. Cada cambio queda como evento con su
 * monto anterior y el nuevo, porque mueve el saldo pendiente del ejecutado.
 *
 * Restringido a Administrador y Juez: fijar la base de un embargo es acto
 * jurisdiccional, no captura de asistente. La migración 20260823190001 aplica la
 * misma distinción del lado de la base de datos, por columna y por rol.
 */
export async function registrarMontoMandamientoPago(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador" && actual?.rol !== "juez") {
    return { error: "Solo el Juez o el Administrador pueden fijar o ampliar el mandamiento de pago" };
  }

  const expedienteId = formData.get("expediente_id") as string;
  const montoTexto = (formData.get("monto") as string)?.trim();
  const motivo = (formData.get("motivo") as string)?.trim() || null;
  const monto = Number(montoTexto);

  if (!montoTexto || !Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser un número mayor a 0" };
  }
  if (monto > 99_999_999.99) {
    return { error: "El monto excede lo que admite el campo (máximo 99,999,999.99)" };
  }

  const supabase = await createClient();

  const { data: expediente } = await supabase
    .from("expedientes")
    .select("monto_embargo_decretado")
    .eq("id", expedienteId)
    .maybeSingle();

  if (!expediente) return { error: "No se encontró el expediente" };

  const montoAnterior =
    expediente.monto_embargo_decretado === null ? null : Number(expediente.monto_embargo_decretado);
  const esAmpliacion = montoAnterior !== null;

  if (esAmpliacion && monto === montoAnterior) {
    return { error: "El monto nuevo es igual al actual" };
  }
  // Solo se exige motivo al cambiar un monto ya fijado: es lo que distingue una
  // ampliación del Art. 744 de una corrección, y sin él la auditoría no sirve.
  if (esAmpliacion && !motivo) {
    return { error: "El motivo es obligatorio para modificar un monto ya fijado" };
  }

  const { data: filas, error } = await supabase
    .from("expedientes")
    .update({ monto_embargo_decretado: monto })
    .eq("id", expedienteId)
    .select("id");

  if (error) return { error: `No se pudo guardar el monto: ${error.message}` };
  if (!filas?.length) {
    return { error: "No se guardó nada: no tienes permiso sobre este expediente" };
  }

  const codigo = esAmpliacion ? "ampliacion_mandamiento_pago" : "mandamiento_pago_librado";
  const { data: tipoEvento } = await supabase
    .from("tipos_evento")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();

  if (tipoEvento) {
    await supabase.from("eventos_expediente").insert({
      expediente_id: expedienteId,
      tipo_evento_id: tipoEvento.id,
      fecha_evento: new Date().toISOString().slice(0, 10),
      detalle: esAmpliacion
        ? `De B/. ${montoAnterior?.toFixed(2)} a B/. ${monto.toFixed(2)} — ${motivo}`
        : `Monto base del embargo: B/. ${monto.toFixed(2)}${motivo ? ` — ${motivo}` : ""}`,
      registrado_por: actual.id,
    });
  }

  await registrarAuditoria(
    actual.id,
    esAmpliacion ? "ampliar_mandamiento_pago" : "establecer_mandamiento_pago",
    "expediente",
    expedienteId,
    { antes: montoAnterior, despues: monto, motivo },
  );

  revalidatePath(`/expedientes/${expedienteId}`);

  // Bajar el monto no es una ampliación: reducir o levantar un embargo es
  // desembargo o rescisión, que el Art. 262 núm. 7 manda a audiencia especial.
  // Se permite por si hay que corregir un monto mal tecleado, pero se avisa.
  if (esAmpliacion && montoAnterior !== null && monto < montoAnterior) {
    return {
      ok: true,
      advertencia:
        "Guardado, pero bajaste el monto: eso no es una ampliación del Art. 744. Una reducción o levantamiento del embargo es desembargo o rescisión, y se sustancia en audiencia especial (Art. 262 núm. 7).",
    };
  }

  return { ok: true };
}

/**
 * Anula una audiencia programada por error. No la borra: en un expediente
 * judicial interesa saber que se señaló y se anuló, con su motivo, no que
 * desapareció sin rastro. Solo Administrador, igual que el resto de la escritura
 * sobre `audiencias`.
 */
export async function anularAudiencia(
  _prevState: EstadoAccionExpediente,
  formData: FormData,
): Promise<EstadoAccionExpediente> {
  const actual = await getUsuarioActual();
  if (actual?.rol !== "administrador") {
    return { error: "Solo el Administrador puede anular audiencias" };
  }

  const audienciaId = formData.get("audiencia_id") as string;
  const expedienteId = formData.get("expediente_id") as string;
  const motivo = (formData.get("motivo_anulacion") as string)?.trim();

  if (!audienciaId) return { error: "Audiencia inválida" };
  if (!motivo) return { error: "El motivo de la anulación es obligatorio" };
  if (motivo.length > 300) return { error: "El motivo no puede pasar de 300 caracteres" };

  const supabase = await createClient();
  const { data: filas, error } = await supabase
    .from("audiencias")
    .update({ estado: "anulada", motivo_anulacion: motivo })
    .eq("id", audienciaId)
    .select("id, tipo, fecha_programada");

  if (error) return { error: `No se pudo anular: ${error.message}` };
  if (!filas?.length) return { error: "No tienes permiso para anular esta audiencia" };

  await registrarAuditoria(actual.id, "anular_audiencia", "expediente", expedienteId, {
    audiencia_id: audienciaId,
    tipo: filas[0].tipo,
    fecha_programada: filas[0].fecha_programada,
    motivo,
  });

  revalidatePath(`/expedientes/${expedienteId}`);
  revalidatePath("/calendario");
  return { ok: true };
}

/**
 * Recalcula la ventana legal guardada de las audiencias PRELIMINARES de un
 * expediente cuando cambia su fecha de notificación de la demanda.
 *
 * Sin esto, corregir esa fecha dejaba `fecha_minima_calculada` y
 * `fecha_limite_calculada` congeladas en el valor del momento en que se creó la
 * audiencia: el detalle del expediente recalcula al vuelo y mostraría un rango,
 * mientras la audiencia guardada seguiría comparándose contra el viejo. Dos
 * números distintos para la misma audiencia.
 *
 * Solo las preliminares: la ventana de la audiencia de fondo se ancla en la
 * fecha de la preliminar, no en la notificación, y la especial no tiene ventana.
 *
 * Va con el cliente administrador a propósito. La escritura sobre `audiencias`
 * está reservada al Administrador (programar y reprogramar audiencias es acto
 * del despacho), pero la fecha de notificación sí la puede corregir el Juez o el
 * Asistente asignado. Sin este bypass, el recálculo se descartaría en silencio
 * para esos dos roles y quedaría la inconsistencia. La alternativa —abrir
 * `audiencias` a escritura de no-administradores— les daría también la
 * capacidad de reprogramar, que es un permiso mucho mayor. Este helper solo
 * toca las dos columnas derivadas, nunca la fecha programada.
 */
async function recalcularVentanaPreliminar(expedienteId: string, diasNoHabiles: Set<string>) {
  const supabase = await createClient();

  const { data: expediente } = await supabase
    .from("expedientes")
    .select(
      `fecha_notificacion_demanda,
       subtipos_proceso(plazo_contestacion_dias, plazo_audiencia_min_dias, plazo_audiencia_max_dias)`,
    )
    .eq("id", expedienteId)
    .maybeSingle();

  const { data: preliminares } = await supabase
    .from("audiencias")
    .select("id")
    .eq("expediente_id", expedienteId)
    .eq("tipo", "preliminar");

  if (!preliminares?.length) return;

  const subtipo = expediente?.subtipos_proceso;
  const ventana = calcularVentanaPreliminar(
    expediente?.fecha_notificacion_demanda ?? null,
    subtipo?.plazo_contestacion_dias ?? null,
    subtipo?.plazo_audiencia_min_dias ?? null,
    subtipo?.plazo_audiencia_max_dias ?? null,
    diasNoHabiles,
  );

  // Si la ventana ya no se puede calcular (se borró la fecha de notificación),
  // se limpian las dos columnas: mejor sin dato que con un dato viejo que
  // parece vigente.
  const admin = createAdminClient();
  await admin
    .from("audiencias")
    .update({
      fecha_minima_calculada: ventana?.desde ?? null,
      fecha_limite_calculada: ventana?.hasta ?? null,
    })
    .in(
      "id",
      preliminares.map((a) => a.id),
    );
}
