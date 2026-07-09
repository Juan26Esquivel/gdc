-- RLS por rol, según la matriz de permisos de la sección 2 de REQUERIMIENTOS_GDC.md.
-- Administrador siempre tiene acceso total (fn_usuario_rol() = 'administrador' en todas las tablas).

-- usuarios
alter table usuarios enable row level security;

create policy usuarios_select_propio_o_admin on usuarios for select
  using (auth_user_id = auth.uid() or fn_usuario_rol() = 'administrador');

create policy usuarios_admin_write on usuarios for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- tipos_proceso (catálogo de solo lectura para todos, escritura solo Admin)
alter table tipos_proceso enable row level security;

create policy tipos_proceso_select on tipos_proceso for select
  using (auth.role() = 'authenticated');

create policy tipos_proceso_admin_write on tipos_proceso for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- subtipos_proceso
alter table subtipos_proceso enable row level security;

create policy subtipos_proceso_select on subtipos_proceso for select
  using (auth.role() = 'authenticated');

create policy subtipos_proceso_admin_write on subtipos_proceso for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- tipos_documento
alter table tipos_documento enable row level security;

create policy tipos_documento_select on tipos_documento for select
  using (auth.role() = 'authenticated');

create policy tipos_documento_admin_write on tipos_documento for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- expedientes: Juez ve todos, Asistente solo los asignados, Analista sin acceso
alter table expedientes enable row level security;

create policy expedientes_select on expedientes for select
  using (
    fn_usuario_rol() in ('administrador', 'juez')
    or (fn_usuario_rol() = 'asistente' and fn_expediente_asignado(id))
  );

create policy expedientes_admin_write on expedientes for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- expediente_fases: visibilidad heredada del expediente; escritura solo Admin por ahora
alter table expediente_fases enable row level security;

create policy expediente_fases_select on expediente_fases for select
  using (
    exists (
      select 1 from expedientes e
      where e.id = expediente_fases.expediente_id
        and (
          fn_usuario_rol() in ('administrador', 'juez')
          or (fn_usuario_rol() = 'asistente' and fn_expediente_asignado(e.id))
        )
    )
  );

create policy expediente_fases_admin_write on expediente_fases for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- asignaciones: Admin gestiona; Asistente ve solo las suyas; Juez ve todas
alter table asignaciones enable row level security;

create policy asignaciones_select on asignaciones for select
  using (
    fn_usuario_rol() in ('administrador', 'juez')
    or (fn_usuario_rol() = 'asistente' and asistente_id = fn_usuario_id())
  );

create policy asignaciones_admin_write on asignaciones for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- documentos: Asistente genera/rehace sobre expedientes asignados; Juez revisa/confirma; Admin todo
alter table documentos enable row level security;

create policy documentos_select on documentos for select
  using (
    fn_usuario_rol() in ('administrador', 'juez')
    or (
      fn_usuario_rol() = 'asistente'
      and exists (select 1 from expedientes e where e.id = documentos.expediente_id and fn_expediente_asignado(e.id))
    )
  );

create policy documentos_asistente_insert on documentos for insert
  with check (
    fn_usuario_rol() = 'asistente'
    and exists (select 1 from expedientes e where e.id = expediente_id and fn_expediente_asignado(e.id))
  );

create policy documentos_asistente_update on documentos for update
  using (
    fn_usuario_rol() = 'asistente'
    and exists (select 1 from expedientes e where e.id = documentos.expediente_id and fn_expediente_asignado(e.id))
  )
  with check (
    fn_usuario_rol() = 'asistente'
    and exists (select 1 from expedientes e where e.id = expediente_id and fn_expediente_asignado(e.id))
  );

create policy documentos_juez_update on documentos for update
  using (fn_usuario_rol() = 'juez')
  with check (fn_usuario_rol() = 'juez');

create policy documentos_admin_write on documentos for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- audiencias: visibilidad heredada del expediente; escritura solo Admin por ahora
alter table audiencias enable row level security;

create policy audiencias_select on audiencias for select
  using (
    fn_usuario_rol() in ('administrador', 'juez')
    or (
      fn_usuario_rol() = 'asistente'
      and exists (select 1 from expedientes e where e.id = audiencias.expediente_id and fn_expediente_asignado(e.id))
    )
  );

create policy audiencias_admin_write on audiencias for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- kpis_config: Analista y Admin configuran/alimentan; Juez solo consulta
alter table kpis_config enable row level security;

create policy kpis_config_select on kpis_config for select
  using (fn_usuario_rol() in ('administrador', 'juez', 'analista_datos'));

create policy kpis_config_write on kpis_config for all
  using (fn_usuario_rol() in ('administrador', 'analista_datos'))
  with check (fn_usuario_rol() in ('administrador', 'analista_datos'));

-- campos_restringidos: lectura para cualquier autenticado (para bloquear campos en formularios); escritura solo Admin
alter table campos_restringidos enable row level security;

create policy campos_restringidos_select on campos_restringidos for select
  using (auth.role() = 'authenticated');

create policy campos_restringidos_admin_write on campos_restringidos for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- auditoria: solo Admin lee; cualquier autenticado puede insertar su propia entrada; inmutable (sin update/delete)
alter table auditoria enable row level security;

create policy auditoria_select_admin on auditoria for select
  using (fn_usuario_rol() = 'administrador');

create policy auditoria_insert_propio on auditoria for insert
  with check (usuario_id = fn_usuario_id() or fn_usuario_rol() = 'administrador');

-- configuracion_sistema: lectura para cualquier autenticado; solo Admin actualiza
alter table configuracion_sistema enable row level security;

create policy configuracion_sistema_select on configuracion_sistema for select
  using (auth.role() = 'authenticated');

create policy configuracion_sistema_admin_update on configuracion_sistema for update
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');
