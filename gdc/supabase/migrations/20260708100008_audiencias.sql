create type tipo_audiencia as enum ('preliminar', 'fondo');

-- Terminología con respaldo directo en el Código Procesal Civil (Ley 402/2023):
-- 'suspendida' (Art. 258 "Suspensión de la audiencia final") y 'continuada' (Art. 259 "Concentración",
-- varias sesiones/recesos como una misma unidad procesal) son términos legales explícitos.
-- El Código NO usa "desierta", "reprogramada" ni "cancelada" para audiencias (esos términos solo
-- aplican a recursos/incidentes); el efecto real de incomparecencia total es la terminación del
-- proceso (Art. 253), no un estado de la audiencia en sí.
create type estado_audiencia as enum (
  'programada',
  'celebrada',
  'suspendida',
  'continuada',
  'terminada_por_incomparecencia'
);

create table audiencias (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  tipo tipo_audiencia not null,
  fecha_programada timestamptz not null,
  -- Para tipo = 'preliminar': fecha_notificacion_demanda + plazo del subtipo.
  -- Para tipo = 'fondo': fecha de cierre de la audiencia 'preliminar' del mismo expediente + plazo_audiencia_fondo del subtipo.
  fecha_limite_calculada timestamptz,
  estado estado_audiencia not null default 'programada',
  created_at timestamptz not null default now()
);

create index idx_audiencias_fecha on audiencias(fecha_programada);
create index idx_audiencias_expediente on audiencias(expediente_id);
