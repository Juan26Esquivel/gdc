create table campos_restringidos (
  id serial primary key,
  entidad text not null, -- 'expediente' | 'documento'
  nombre_campo text not null,
  motivo text,
  definido_por uuid references usuarios(id) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (entidad, nombre_campo)
);

-- Pendiente: el Administrador debe indicar qué campos concretos deben poblar esta tabla (ver "Decisiones abiertas" en REQUERIMIENTOS_GDC.md).
