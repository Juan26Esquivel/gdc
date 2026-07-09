-- Corrige una fragilidad de la migración 022: fn_auditoria_borrado_fases() y
-- fn_auditoria_borrado_audiencias() solo resolvían el usuario vía auth.uid();
-- sin sesión autenticada (ej. una tarea de limpieza con la service_role key)
-- auth.uid() es null y el INSERT en auditoria fallaba por violar el NOT NULL
-- de usuario_id, abortando el borrado en cascada completo. Se agrega un
-- respaldo a expedientes.created_by (vía expediente_id), igual que ya hacían
-- los triggers de expedientes/documentos de la migración 013.
create or replace function fn_auditoria_borrado_fases() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select coalesce(
    (select id from usuarios where auth_user_id = auth.uid()),
    (select created_by from expedientes where id = old.expediente_id)
  ) into v_usuario_id;

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (v_usuario_id, 'eliminar_fase_expediente', 'expediente_fase', old.id, to_jsonb(old));
  return old;
end;
$$ language plpgsql security definer;

create or replace function fn_auditoria_borrado_audiencias() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select coalesce(
    (select id from usuarios where auth_user_id = auth.uid()),
    (select created_by from expedientes where id = old.expediente_id)
  ) into v_usuario_id;

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (v_usuario_id, 'eliminar_audiencia', 'audiencia', old.id, to_jsonb(old));
  return old;
end;
$$ language plpgsql security definer;
