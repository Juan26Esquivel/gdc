-- OT-02 (docs_extra/ordenes_tecnicas): agrega el concepto de despacho, hoy
-- implícito y único. RF-32 pasa de "preparado pero pospuesto" a implementado
-- de verdad: despacho_id deja de ser decorativo porque las políticas RLS
-- (migración 20260823090007) lo usan para filtrar.

create table despachos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('municipal', 'circuito')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table despachos enable row level security;

-- Catálogo de solo lectura para cualquier autenticado, mismo criterio que
-- tipos_proceso/subtipos_proceso/tipos_documento.
create policy despachos_select on despachos for select
  using (auth.role() = 'authenticated');

create policy despachos_admin_write on despachos for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- Único despacho real hoy. Sembrado aquí (no en seed.sql) porque expedientes
-- y usuarios necesitan un despacho_id válido para poblar sus columnas abajo.
insert into despachos (nombre, tipo) values ('Segundo Municipal Civil', 'municipal');

alter table expedientes add column despacho_id uuid references despachos(id);
update expedientes set despacho_id = (select id from despachos limit 1);
alter table expedientes alter column despacho_id set not null;

-- despacho_id en usuarios (no solo en expedientes): sin esto, fn_usuario_despacho()
-- (migración 20260823090007) no tendría de dónde leer a qué despacho pertenece
-- quien consulta, y el filtro por despacho en expedientes sería inaplicable.
alter table usuarios add column despacho_id uuid references despachos(id);
update usuarios set despacho_id = (select id from despachos limit 1);
alter table usuarios alter column despacho_id set not null;

create index idx_expedientes_despacho on expedientes(despacho_id);
create index idx_usuarios_despacho on usuarios(despacho_id);

-- Nota: expediente_fases, asignaciones, documentos, audiencias NO reciben
-- despacho_id propio (decisión OT-02 3.1) — se infiere siempre a través de
-- expediente_id para evitar una segunda fuente de verdad que pudiera
-- desincronizarse del despacho real del expediente.
