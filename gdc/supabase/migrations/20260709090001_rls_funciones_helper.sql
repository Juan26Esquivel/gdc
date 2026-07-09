-- Funciones auxiliares para políticas RLS. SECURITY DEFINER: corren con privilegios
-- del dueño (bypass RLS), evitando recursión al consultar `usuarios`/`asignaciones`
-- desde las propias políticas de esas tablas.

create or replace function fn_usuario_rol() returns rol_gdc
language sql security definer stable
set search_path = public
as $$
  select rol from usuarios where auth_user_id = auth.uid();
$$;

create or replace function fn_usuario_id() returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from usuarios where auth_user_id = auth.uid();
$$;

create or replace function fn_expediente_asignado(p_expediente_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from asignaciones
    where expediente_id = p_expediente_id
      and asistente_id = fn_usuario_id()
      and activa = true
  );
$$;

grant execute on function fn_usuario_rol() to authenticated;
grant execute on function fn_usuario_id() to authenticated;
grant execute on function fn_expediente_asignado(uuid) to authenticated;
