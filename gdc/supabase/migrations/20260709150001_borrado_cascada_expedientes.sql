-- RF-33-EXTRA: permite borrar un expediente (con toda su cadena de fases,
-- asignaciones, audiencias y documentos) desde la aplicación. Hasta ahora
-- ningún expediente real podía borrarse: expediente_fases/asignaciones/
-- audiencias/documentos lo referencian con la llave foránea por defecto
-- (ON DELETE NO ACTION), y toda fase se crea automáticamente al crear el
-- expediente — el borrado siempre fallaría por violación de integridad.
--
-- Se cambian esas 4 llaves foráneas a ON DELETE CASCADE. El nombre exacto de
-- la restricción (asignado automáticamente por Postgres al crear la tabla)
-- se busca dinámicamente en vez de asumirlo, para no fallar si Postgres lo
-- generó distinto de lo esperado.
do $$
declare
  fila record;
begin
  for fila in
    select conname, conrelid::regclass::text as tabla
    from pg_constraint
    where contype = 'f'
      and confrelid = 'expedientes'::regclass
      and conrelid in ('expediente_fases'::regclass, 'asignaciones'::regclass,
                        'audiencias'::regclass, 'documentos'::regclass)
  loop
    execute format('alter table %s drop constraint %I', fila.tabla, fila.conname);
    execute format(
      'alter table %s add constraint %I foreign key (expediente_id) references expedientes(id) on delete cascade',
      fila.tabla, fila.conname
    );
  end loop;
end $$;

-- documentos ya tenía su propio trigger de auditoría de borrado (migración
-- 013); expediente_fases y audiencias no — sin esto, el borrado en cascada
-- las eliminaría en silencio, sin dejar rastro en `auditoria` (violaría
-- RNF-03/RNF-09). Se replica exactamente el mismo patrón.
create or replace function fn_auditoria_borrado_fases() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id from usuarios where auth_user_id = auth.uid();
  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (v_usuario_id, 'eliminar_fase_expediente', 'expediente_fase', old.id, to_jsonb(old));
  return old;
end;
$$ language plpgsql security definer;

create or replace function fn_auditoria_borrado_audiencias() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id from usuarios where auth_user_id = auth.uid();
  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (v_usuario_id, 'eliminar_audiencia', 'audiencia', old.id, to_jsonb(old));
  return old;
end;
$$ language plpgsql security definer;

create trigger trg_auditoria_borrado_fases
  before delete on expediente_fases
  for each row execute function fn_auditoria_borrado_fases();

create trigger trg_auditoria_borrado_audiencias
  before delete on audiencias
  for each row execute function fn_auditoria_borrado_audiencias();
