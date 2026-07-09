create table kpis_config (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  tipo_calculo text not null, -- 'conteo_por_tipo_documento', 'comparativo_mensual', 'comparativo_anual', etc.
  configurado_por uuid references usuarios(id) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
