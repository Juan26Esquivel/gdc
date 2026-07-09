create table expedientes (
  id uuid primary key default gen_random_uuid(),
  numero_expediente text not null unique,
  tipo_proceso_id int references tipos_proceso(id) not null,
  subtipo_proceso_id int references subtipos_proceso(id), -- nullable, no todos los tipos tienen subtipo aún parametrizado
  cuantia numeric(12,2), -- null si es indeterminada
  es_lanzamiento boolean not null default false, -- excepción de tope de cuantía
  fecha_notificacion_demanda date, -- ancla para el cálculo de plazos de audiencia
  created_by uuid references usuarios(id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expedientes_tipo_proceso on expedientes(tipo_proceso_id);
create index idx_expedientes_numero on expedientes(numero_expediente);

-- Regla de negocio (validación a nivel de aplicación y trigger de respaldo):
-- cuantia <= configuracion_sistema.tope_cuantia (migración 20260708100012) a menos que es_lanzamiento = true
