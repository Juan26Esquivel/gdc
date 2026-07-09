create type fase_expediente as enum (
  'admision',
  'notificacion_demanda',
  'audiencia_preliminar',
  'audiencia_fondo'
);

create table expediente_fases (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  fase fase_expediente not null,
  fecha_inicio timestamptz not null default now(),
  fecha_fin timestamptz, -- null mientras la fase esté activa
  observaciones text
);

create index idx_expediente_fases_expediente on expediente_fases(expediente_id);

-- La fase "actual" de un expediente es la fila con fecha_fin is null más reciente.
