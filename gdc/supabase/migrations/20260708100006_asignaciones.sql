create table asignaciones (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  asistente_id uuid references usuarios(id) not null,
  asignado_por uuid references usuarios(id) not null,
  fecha_asignacion timestamptz not null default now(),
  activa boolean not null default true
);

create index idx_asignaciones_asistente on asignaciones(asistente_id) where activa = true;
