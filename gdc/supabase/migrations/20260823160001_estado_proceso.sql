-- Desistimiento, conciliación y retiro como ESTADOS del expediente.
--
-- Decisión del usuario (2026-08-23): estos tres desenlaces son estados, no tipos
-- de documento. Hasta ahora solo se podían anotar como texto libre en la
-- observación, así que no se podían contar ni filtrar — y el Excel del despacho
-- ya usaba "DESISTIDO" como estado real de trabajo.
--
-- Se modela igual que `estado_matrimonio` (OT-03): una columna de estado con
-- catálogo cerrado, y un trigger que cierra el expediente cuando el estado pasa
-- a uno terminal. La mediación NO entra aquí porque ya tiene su propio camino
-- (documento "Acuerdo de Mediación" con `culmina_proceso`, OT-02/OT-03) y
-- duplicarla daría dos formas distintas de cerrar por lo mismo.

alter table expedientes
  add column estado_proceso text not null default 'en_tramite'
    check (estado_proceso in ('en_tramite', 'desistido', 'conciliado', 'retirado'));

comment on column expedientes.estado_proceso is
  'Estado del desenlace del proceso. Los tres estados distintos de en_tramite son terminales: cierran el expediente vía trigger, sin documento de cierre.';

-- El check de `tipo_cierre` era una restricción inline sin nombre propio, así que
-- se localiza por su definición en vez de adivinar el nombre generado: si se
-- adivinara mal, el drop no haría nada, el check viejo seguiría vivo y los
-- valores nuevos fallarían al insertarse.
do $$
declare
  v_nombre text;
begin
  select con.conname into v_nombre
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'expedientes'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%tipo_cierre%'
    -- Excluye el check compuesto "not cerrado or (fecha_cierre ... tipo_cierre ...)".
    and pg_get_constraintdef(con.oid) not like '%cerrado%';

  if v_nombre is null then
    raise exception 'No se encontró el check de valores de tipo_cierre en expedientes';
  end if;

  execute format('alter table expedientes drop constraint %I', v_nombre);
end $$;

alter table expedientes
  add constraint expedientes_tipo_cierre_check
  check (
    tipo_cierre in (
      'sentencia', 'acuerdo_mediacion', 'auto', 'estado_matrimonio',
      'desistimiento', 'conciliacion', 'retiro'
    )
  );

insert into tipos_evento (codigo, nombre, tipo_proceso_id, alimenta, es_generado_por_sistema)
values ('estado_proceso_actualizado', 'Estado del proceso actualizado', null,
        'Estado y cierre del expediente', false);

-- Mismo patrón que fn_cerrar_expediente_por_matrimonio (OT-03): el estado es la
-- justificación en sí, así que no se exige motivo_cierre.
create or replace function fn_cerrar_expediente_por_estado_proceso() returns trigger
language plpgsql security definer
as $$
begin
  if NEW.estado_proceso in ('desistido', 'conciliado', 'retirado')
     and OLD.estado_proceso is distinct from NEW.estado_proceso
     and NEW.cerrado = false then

    update expedientes
      set cerrado = true,
          fecha_cierre = now(),
          tipo_cierre = case NEW.estado_proceso
            when 'desistido' then 'desistimiento'
            when 'conciliado' then 'conciliacion'
            when 'retirado' then 'retiro'
          end,
          documento_cierre_id = null,
          cerrado_por = null -- no hay documento que alguien confirme; el estado es la fuente
      where id = NEW.id;

    insert into eventos_expediente (expediente_id, tipo_evento_id, fecha_evento, detalle, registrado_por)
    select NEW.id, te.id, current_date,
           'Cierre automático — Estado del proceso actualizado a: ' || NEW.estado_proceso, null
    from tipos_evento te
    where te.codigo = 'expediente_cerrado';
  end if;
  return NEW;
end;
$$;

create trigger trg_cerrar_expediente_estado_proceso
  after update of estado_proceso on expedientes
  for each row execute function fn_cerrar_expediente_por_estado_proceso();

-- La lista blanca de columnas editables por Juez/Asistente (migración
-- 20260823110001) no conocía `estado_proceso`, así que sin esto el Juez no
-- podría registrar un desistimiento. Se recrea la función completa en vez de
-- editar la migración anterior, para que esto funcione tanto si aquella ya se
-- aplicó como si se aplica en el mismo push.
create or replace function fn_expedientes_columnas_editables() returns trigger
language plpgsql security definer
as $$
declare
  columnas_permitidas text[] := array[
    'fisico_electronico', 'municipal_circuito', 'pretension', 'notas',
    'fecha_notificacion_demanda',
    'fecha_registro', 'omitir_umbral_inactividad', 'motivo_omision_umbral',
    'estado_matrimonio', 'estado_proceso',
    'updated_at'
  ];
  columna_cambiada text;
begin
  if coalesce(fn_usuario_rol(), '') not in ('juez', 'asistente') then
    return NEW;
  end if;

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
