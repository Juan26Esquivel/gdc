create table tipos_proceso (
  id serial primary key,
  nombre text not null unique, -- Declarativo, Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales, Matrimonio
  descripcion text,
  base_legal text -- ej. 'Ley 402 - Libro Cuarto, Título I' o 'Código de la Familia' (caso Matrimonio)
);

create table subtipos_proceso (
  id serial primary key,
  tipo_proceso_id int references tipos_proceso(id) not null,
  nombre text not null, -- ej. 'Ordinario', 'Sumario' dentro de Declarativo
  plazo_audiencia_min_dias int, -- ej. 20 (Ordinario) o 10 (Sumario) -- audiencia preliminar
  plazo_audiencia_max_dias int, -- ej. 60 (Ordinario) o 20 (Sumario) -- audiencia preliminar
  plazo_audiencia_fondo_min_dias int, -- ventana para audiencia de fondo/final, contada desde el cierre de la audiencia preliminar
  plazo_audiencia_fondo_max_dias int,
  base_legal text, -- ej. 'Art. 619 y 252' / 'Art. 645 num. 8'
  unique (tipo_proceso_id, nombre)
);

-- seed inicial conocido:
-- Declarativo > Ordinario: audiencia preliminar 20-60 días (Art. 619, 252);
--   audiencia de fondo 20-40 días desde el cierre de la preliminar
--   [VERIFICAR ARTÍCULO EXACTO — aparenta ser Art. 255 núm. 8, no confirmado con certeza por errores de OCR conocidos en la transcripción del Código]
-- Declarativo > Sumario: audiencia preliminar 10-20 días (Art. 645 num. 8);
--   audiencia de fondo sin plazo confirmado (columnas quedan null)
-- Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales:
--   investigados — NO tienen una ventana de audiencia parametrizable análoga a Declarativo.
--   Sus plazos son puntuales y dispersos por trámite específico (ver sección "Decisiones abiertas").
-- Matrimonio: fuera del Código Procesal Civil (se rige por Código de Familia), sin parametrizar.
-- Los datos de este seed se insertan en supabase/seed.sql (no en esta migración).
