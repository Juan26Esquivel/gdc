create or replace function fn_auditoria_borrado_expedientes() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id from usuarios where auth_user_id = auth.uid();

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (
    coalesce(v_usuario_id, old.created_by),
    'eliminar_expediente',
    'expediente',
    old.id,
    to_jsonb(old)
  );

  return old;
end;
$$ language plpgsql security definer;

create or replace function fn_auditoria_borrado_documentos() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id from usuarios where auth_user_id = auth.uid();

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (
    coalesce(v_usuario_id, old.generado_por),
    'eliminar_documento',
    'documento',
    old.id,
    to_jsonb(old)
  );

  return old;
end;
$$ language plpgsql security definer;

create trigger trg_auditoria_borrado_expedientes
  before delete on expedientes
  for each row execute function fn_auditoria_borrado_expedientes();

create trigger trg_auditoria_borrado_documentos
  before delete on documentos
  for each row execute function fn_auditoria_borrado_documentos();
