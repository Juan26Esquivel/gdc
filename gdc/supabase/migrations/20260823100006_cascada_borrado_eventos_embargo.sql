-- Corrige la misma fragilidad que la migración 20260709150001 ya corrigió
-- para expediente_fases/asignaciones/audiencias/documentos, pero que las 2
-- tablas nuevas de esta ficha (OT-03) volvieron a introducir: sin ON DELETE
-- CASCADE, eliminar un expediente que ya tenga eventos o abonos registrados
-- fallaría por violación de integridad referencial, rompiendo RF-33-EXTRA
-- (eliminación de expedientes desde la aplicación). Se detectó antes de que
-- hubiera datos reales que dependieran de esto — se corrige aquí en vez de
-- dejarlo para una migración de "fallback" posterior como pasó la vez pasada.

do $$
declare
  fila record;
begin
  for fila in
    select conname, conrelid::regclass::text as tabla
    from pg_constraint
    where contype = 'f'
      and confrelid = 'expedientes'::regclass
      and conrelid in ('eventos_expediente'::regclass, 'embargo_abonos'::regclass)
  loop
    execute format('alter table %s drop constraint %I', fila.tabla, fila.conname);
    execute format(
      'alter table %s add constraint %I foreign key (expediente_id) references expedientes(id) on delete cascade',
      fila.tabla, fila.conname
    );
  end loop;
end $$;

-- Mismo criterio que expediente_fases/audiencias (migración 20260709150001):
-- sin esto, el borrado en cascada eliminaría eventos y abonos en silencio,
-- sin dejar rastro en `auditoria` (RNF-03/RNF-09). Se usa el mismo respaldo a
-- expedientes.created_by cuando no hay sesión autenticada real (ver la
-- corrección de la migración 20260709160001, para el mismo problema en
-- expediente_fases/audiencias).
create or replace function fn_auditoria_borrado_eventos() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select coalesce(
    (select id from usuarios where auth_user_id = auth.uid()),
    (select created_by from expedientes where id = old.expediente_id)
  ) into v_usuario_id;

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (v_usuario_id, 'eliminar_evento_expediente', 'evento_expediente', old.id, to_jsonb(old));
  return old;
end;
$$ language plpgsql security definer;

create or replace function fn_auditoria_borrado_embargo_abonos() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select coalesce(
    (select id from usuarios where auth_user_id = auth.uid()),
    (select created_by from expedientes where id = old.expediente_id)
  ) into v_usuario_id;

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (v_usuario_id, 'eliminar_abono_embargo', 'embargo_abono', old.id, to_jsonb(old));
  return old;
end;
$$ language plpgsql security definer;

create trigger trg_auditoria_borrado_eventos
  before delete on eventos_expediente
  for each row execute function fn_auditoria_borrado_eventos();

create trigger trg_auditoria_borrado_embargo_abonos
  before delete on embargo_abonos
  for each row execute function fn_auditoria_borrado_embargo_abonos();
