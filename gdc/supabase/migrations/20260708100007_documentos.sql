create type estado_documento as enum (
  'generado',
  'validado',
  'en_correccion',
  'confirmado'
);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  tipo_documento_id int references tipos_documento(id) not null,
  estado estado_documento not null default 'generado',
  generado_por uuid references usuarios(id) not null,
  contenido_texto text, -- texto plano generado por código, el que el Asistente traslada al plugin oficial
  archivo_docx_path text, -- ruta en Supabase Storage del .docx generado (metadata únicamente, no el documento legal final)
  observaciones_juez text, -- comentarios cuando el documento pasa a 'en_correccion'
  confirmado_por uuid references usuarios(id), -- Juez que confirma el cierre del ciclo
  fecha_confirmacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documentos_expediente on documentos(expediente_id);
create index idx_documentos_estado on documentos(estado);

-- Transiciones válidas de estado (a validar en la capa de aplicación):
-- generado -> validado -> confirmado
-- validado -> en_correccion -> generado (rehacer)
