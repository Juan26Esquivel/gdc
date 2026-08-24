-- Permite que el Juez y el Asistente asignado editen un expediente.
--
-- Hasta ahora la única política de escritura sobre `expedientes` era
-- `expedientes_admin_write` (migración 20260709090002): solo el Administrador
-- podía hacer UPDATE. Eso dejaba un bug silencioso en la pestaña de eventos de
-- OT-04: `registrarEvento` permite a un Juez/Asistente asignado corregir la
-- fecha de registro, activar el override de umbral o cambiar el estado de
-- matrimonio, pero RLS descartaba esos UPDATE sin lanzar error (un UPDATE que
-- no alcanza ninguna fila es un éxito con 0 filas afectadas), así que la app
-- reportaba "guardado" y el campo nunca cambiaba. OT-04 sección 3.5 dice
-- explícitamente que esa es la vía por la que "el Juez corrige la fecha".

create policy expedientes_juez_update on expedientes for update
  using (fn_usuario_rol() = 'juez' and despacho_id = fn_usuario_despacho())
  with check (fn_usuario_rol() = 'juez' and despacho_id = fn_usuario_despacho());

-- El `with check` con el mismo despacho impide además mover un expediente al
-- despacho de otro juzgado (sería sacarlo de la vista de quien lo trabaja).
create policy expedientes_asistente_update on expedientes for update
  using (
    fn_usuario_rol() = 'asistente'
    and despacho_id = fn_usuario_despacho()
    and fn_expediente_asignado(id)
  )
  with check (
    fn_usuario_rol() = 'asistente'
    and despacho_id = fn_usuario_despacho()
    and fn_expediente_asignado(id)
  );

-- RLS es por FILA, no por columna: las dos políticas de arriba, solas, dejarían
-- a un Juez o Asistente cambiar CUALQUIER columna del expediente vía la API
-- REST de Supabase con su propio token — incluido `cerrado`, la `cuantia` (sin
-- pasar por el tope de RF-34-36) o `omitir_umbral_inactividad` — saltándose
-- todo el modelo de eventos y cierre que construyó OT-03. La restricción por
-- columna se hace aquí, en la base de datos, y no solo en la Server Action,
-- justamente para que no dependa de que la única puerta de entrada sea la app.
create or replace function fn_expedientes_columnas_editables() returns trigger
language plpgsql security definer
as $$
declare
  -- Lista blanca: los 5 campos del formulario de "Datos generales" (OT-04 3.3)
  -- más los 4 que la pestaña de eventos ya toca legítimamente (OT-04 3.5).
  -- Cualquier columna nueva queda protegida por omisión, que es el lado seguro
  -- por el que conviene equivocarse.
  columnas_permitidas text[] := array[
    'fisico_electronico', 'municipal_circuito', 'pretension', 'notas',
    'fecha_notificacion_demanda',
    'fecha_registro', 'omitir_umbral_inactividad', 'motivo_omision_umbral',
    'estado_matrimonio',
    'updated_at'
  ];
  columna_cambiada text;
begin
  -- El Administrador conserva escritura total (expedientes_admin_write). Un rol
  -- nulo (clave de servicio en un script de mantenimiento, o cuenta desactivada)
  -- tampoco se restringe aquí: si no es Juez ni Asistente, RLS ya decidió antes
  -- si el UPDATE podía siquiera alcanzar la fila.
  if coalesce(fn_usuario_rol(), '') not in ('juez', 'asistente') then
    return NEW;
  end if;

  -- Un cambio originado por otro trigger no es entrada del usuario. Caso real:
  -- fn_cerrar_expediente_por_matrimonio() (OT-03) hace su propio UPDATE para
  -- poner `cerrado = true` cuando el estado pasa a celebrado/retirado; sin esta
  -- salida, ese cierre automático fallaría para un Juez.
  if pg_trigger_depth() > 1 then
    return NEW;
  end if;

  select o.key into columna_cambiada
  from jsonb_each_text(to_jsonb(OLD)) o
  where o.value is distinct from (to_jsonb(NEW) ->> o.key)
    and o.key <> all (columnas_permitidas)
  limit 1;

  if columna_cambiada is not null then
    raise exception 'Tu rol no puede modificar el campo "%" de un expediente', columna_cambiada
      using errcode = 'insufficient_privilege';
  end if;

  return NEW;
end;
$$;

-- BEFORE UPDATE: es el único trigger BEFORE UPDATE sobre esta tabla, así que
-- siempre corre antes que los AFTER existentes (broadcast de Realtime y cierre
-- por estado de matrimonio) y ve los valores tal como los envió el cliente.
create trigger trg_expedientes_columnas_editables
  before update on expedientes
  for each row execute function fn_expedientes_columnas_editables();
