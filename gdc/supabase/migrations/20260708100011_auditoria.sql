create table auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) not null,
  accion text not null, -- 'crear_expediente', 'cambiar_estado_documento', 'asignar_tarea', etc.
  entidad text not null,
  entidad_id uuid,
  detalle jsonb,
  created_at timestamptz not null default now()
);

create index idx_auditoria_entidad on auditoria(entidad, entidad_id);
create index idx_auditoria_usuario on auditoria(usuario_id);

-- Nota multi-tenant: todas las tablas del esquema están diseñadas para admitir en una migración
-- futura una columna despacho_id (o tenant_id) sin romper la estructura (HU-18-EXTRA).
