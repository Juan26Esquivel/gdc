-- OT-02 sección 4: con despacho_id ya agregado (20260823090001), las
-- políticas RLS existentes que hoy filtran solo por rol deben sumar el filtro
-- de despacho. Administrador se mantiene sin filtro (rol único = superadmin,
-- ve todos los despachos — REQUERIMIENTOS_GDC.md sección 2). Juez y Analista
-- quedan acotados a su propio despacho; Asistente ya estaba acotado por
-- asignación y aquí se refuerza también por despacho, en profundidad.
--
-- Se repasó el archivo completo de 20260709090002_rls_politicas.sql y las
-- políticas de analista agregadas en 20260709130001_kpis_config_completo.sql
-- (OT-02 sección 4 pide explícitamente no asumir que son solo dos o tres).

create or replace function fn_usuario_despacho() returns uuid
language sql security definer stable
set search_path = public
as $$
  select despacho_id from usuarios where auth_user_id = auth.uid();
$$;

grant execute on function fn_usuario_despacho() to authenticated;

-- expedientes
drop policy expedientes_select on expedientes;
create policy expedientes_select on expedientes for select
  using (
    fn_usuario_rol() = 'administrador'
    or (fn_usuario_rol() = 'juez' and despacho_id = fn_usuario_despacho())
    or (fn_usuario_rol() = 'asistente' and despacho_id = fn_usuario_despacho() and fn_expediente_asignado(id))
  );

drop policy expedientes_analista_select on expedientes;
create policy expedientes_analista_select on expedientes for select
  using (fn_usuario_rol() = 'analista_datos' and despacho_id = fn_usuario_despacho());

-- expediente_fases (visibilidad heredada del expediente)
drop policy expediente_fases_select on expediente_fases;
create policy expediente_fases_select on expediente_fases for select
  using (
    exists (
      select 1 from expedientes e
      where e.id = expediente_fases.expediente_id
        and (
          fn_usuario_rol() = 'administrador'
          or (fn_usuario_rol() = 'juez' and e.despacho_id = fn_usuario_despacho())
          or (fn_usuario_rol() = 'asistente' and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id))
        )
    )
  );

-- asignaciones
drop policy asignaciones_select on asignaciones;
create policy asignaciones_select on asignaciones for select
  using (
    fn_usuario_rol() = 'administrador'
    or (
      fn_usuario_rol() = 'juez'
      and exists (
        select 1 from expedientes e
        where e.id = asignaciones.expediente_id and e.despacho_id = fn_usuario_despacho()
      )
    )
    or (fn_usuario_rol() = 'asistente' and asistente_id = fn_usuario_id())
  );

-- documentos
drop policy documentos_select on documentos;
create policy documentos_select on documentos for select
  using (
    fn_usuario_rol() = 'administrador'
    or (
      fn_usuario_rol() = 'juez'
      and exists (
        select 1 from expedientes e
        where e.id = documentos.expediente_id and e.despacho_id = fn_usuario_despacho()
      )
    )
    or (
      fn_usuario_rol() = 'asistente'
      and exists (
        select 1 from expedientes e
        where e.id = documentos.expediente_id
          and e.despacho_id = fn_usuario_despacho()
          and fn_expediente_asignado(e.id)
      )
    )
  );

drop policy documentos_asistente_insert on documentos;
create policy documentos_asistente_insert on documentos for insert
  with check (
    fn_usuario_rol() = 'asistente'
    and exists (
      select 1 from expedientes e
      where e.id = expediente_id and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id)
    )
  );

drop policy documentos_asistente_update on documentos;
create policy documentos_asistente_update on documentos for update
  using (
    fn_usuario_rol() = 'asistente'
    and exists (
      select 1 from expedientes e
      where e.id = documentos.expediente_id and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id)
    )
  )
  with check (
    fn_usuario_rol() = 'asistente'
    and exists (
      select 1 from expedientes e
      where e.id = expediente_id and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id)
    )
  );

drop policy documentos_juez_update on documentos;
create policy documentos_juez_update on documentos for update
  using (
    fn_usuario_rol() = 'juez'
    and exists (
      select 1 from expedientes e
      where e.id = documentos.expediente_id and e.despacho_id = fn_usuario_despacho()
    )
  )
  with check (
    fn_usuario_rol() = 'juez'
    and exists (
      select 1 from expedientes e
      where e.id = expediente_id and e.despacho_id = fn_usuario_despacho()
    )
  );

drop policy documentos_analista_select on documentos;
create policy documentos_analista_select on documentos for select
  using (
    fn_usuario_rol() = 'analista_datos'
    and exists (
      select 1 from expedientes e
      where e.id = documentos.expediente_id and e.despacho_id = fn_usuario_despacho()
    )
  );

-- audiencias (visibilidad heredada del expediente)
drop policy audiencias_select on audiencias;
create policy audiencias_select on audiencias for select
  using (
    exists (
      select 1 from expedientes e
      where e.id = audiencias.expediente_id
        and (
          fn_usuario_rol() = 'administrador'
          or (fn_usuario_rol() = 'juez' and e.despacho_id = fn_usuario_despacho())
          or (fn_usuario_rol() = 'asistente' and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id))
        )
    )
  );

drop policy audiencias_analista_select on audiencias;
create policy audiencias_analista_select on audiencias for select
  using (
    fn_usuario_rol() = 'analista_datos'
    and exists (
      select 1 from expedientes e
      where e.id = audiencias.expediente_id and e.despacho_id = fn_usuario_despacho()
    )
  );

-- Nota: las políticas *_admin_write (expedientes, expediente_fases,
-- asignaciones, documentos, audiencias) no cambian — Administrador sigue sin
-- filtro de despacho, es superadmin global (REQUERIMIENTOS_GDC.md sección 2).
-- documentos_juez_update ya solo cubre UPDATE (no INSERT/DELETE), igual que
-- antes de esta migración.
