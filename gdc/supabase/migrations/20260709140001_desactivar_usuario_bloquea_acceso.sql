-- Módulo 7 (RF-01/RF-31): hasta ahora `usuarios.activo` no tenía ningún efecto
-- real — ni el login, ni el middleware, ni las funciones RLS lo revisaban, así
-- que "desactivar" a un usuario solo cambiaba un valor cosmético en la tabla.
-- Se corrige en la capa de RLS (defensa en profundidad): un usuario inactivo
-- deja de resolver rol/id, por lo que toda política que dependa de
-- fn_usuario_rol()/fn_usuario_id() falla de forma cerrada para él, sin
-- importar si la capa de aplicación también lo bloquea en el login.
create or replace function fn_usuario_rol() returns rol_gdc
language sql security definer stable
set search_path = public
as $$
  select rol from usuarios where auth_user_id = auth.uid() and activo = true;
$$;

create or replace function fn_usuario_id() returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from usuarios where auth_user_id = auth.uid() and activo = true;
$$;
