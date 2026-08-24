-- Monto del mandamiento de pago: establecerlo y ampliarlo (Art. 744, Ley 402).
--
-- Hueco encontrado el 2026-08-23: `expedientes.monto_embargo_decretado` (que
-- OT-03 agregó) NUNCA se escribía desde la aplicación — solo se leía. Y como la
-- tarjeta "Saldo del embargo" del detalle solo aparece cuando esa columna tiene
-- valor, toda la maquinaria de abonos y saldos de OT-03 quedaba inalcanzable
-- desde la interfaz: construida, funcionando en base de datos, y sin puerta de
-- entrada.
--
-- Aclarado por el usuario: el monto del mandamiento de pago es la base del
-- embargo, y puede actualizarse después. El respaldo legal existe y es el
-- **Art. 744 "Auto de mandamiento de pago sujeto a cuotas, plazos o
-- ampliación"** (Libro Cuarto): cuando vencen nuevos plazos o cuotas de la
-- obligación, la ejecución puede ampliarse por su importe, antes o después de
-- dictado el mandamiento.

insert into tipos_evento (codigo, nombre, tipo_proceso_id, alimenta, es_generado_por_sistema)
values
  (
    'mandamiento_pago_librado',
    'Mandamiento de pago librado',
    (select id from tipos_proceso where nombre = 'Ejecución'),
    'Saldo del embargo',
    false
  ),
  (
    'ampliacion_mandamiento_pago',
    'Ampliación del mandamiento de pago (Art. 744)',
    (select id from tipos_proceso where nombre = 'Ejecución'),
    'Saldo del embargo',
    false
  );

-- La lista blanca de columnas editables (migraciones 20260823110001 y
-- 20260823160001) no incluía `monto_embargo_decretado`, así que ni el Juez podía
-- establecerlo. Pero no se puede simplemente agregarlo a la lista común: fijar la
-- base de un embargo es acto jurisdiccional, no captura de asistente. La función
-- pasa a distinguir por rol en vez de tener una sola lista para los dos.
--
-- (El Administrador sigue con escritura total vía expedientes_admin_write y sale
-- por la primera condición, como antes.)
create or replace function fn_expedientes_columnas_editables() returns trigger
language plpgsql security definer
as $$
declare
  -- Datos descriptivos y de trazabilidad que cualquiera de los dos roles corrige.
  columnas_comunes text[] := array[
    'fisico_electronico', 'municipal_circuito', 'pretension', 'notas',
    'fecha_notificacion_demanda',
    'fecha_registro', 'omitir_umbral_inactividad', 'motivo_omision_umbral',
    'estado_matrimonio', 'estado_proceso',
    'updated_at'
  ];
  -- Exclusivas del Juez: fijar o ampliar la base del embargo cambia el saldo
  -- pendiente del ejecutado, así que no es un dato de captura.
  columnas_solo_juez text[] := array['monto_embargo_decretado'];
  v_rol text := coalesce(fn_usuario_rol(), '');
  columnas_permitidas text[];
  columna_cambiada text;
begin
  if v_rol not in ('juez', 'asistente') then
    return NEW;
  end if;

  if pg_trigger_depth() > 1 then
    return NEW;
  end if;

  columnas_permitidas := case
    when v_rol = 'juez' then columnas_comunes || columnas_solo_juez
    else columnas_comunes
  end;

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
