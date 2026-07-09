-- Catálogo de tipos y subtipos de proceso (6 tipos confirmados)
insert into tipos_proceso (nombre, base_legal) values
  ('Declarativo', 'Ley 402 - Libro Cuarto, Título I'),
  ('Declarativos especiales', 'Ley 402 - Libro Cuarto, Título II'),
  ('Jurisdicción voluntaria', 'Ley 402 - Libro Cuarto, Título III'),
  ('Ejecución', 'Ley 402 - Libro Cuarto, Título IV'),
  ('Desacato a los tribunales', 'Ley 402 - Libro Cuarto, Título VI'),
  ('Matrimonio', 'Código de la Familia');

insert into subtipos_proceso (
  tipo_proceso_id, nombre,
  plazo_audiencia_min_dias, plazo_audiencia_max_dias,
  plazo_audiencia_fondo_min_dias, plazo_audiencia_fondo_max_dias,
  base_legal
) values
  (
    (select id from tipos_proceso where nombre = 'Declarativo'), 'Ordinario',
    20, 60,
    20, 40, -- [VERIFICAR ARTÍCULO EXACTO — aparenta ser Art. 255 núm. 8]
    'Art. 619 y 252 (preliminar); Art. 255 núm. 8 (fondo, pendiente de verificar)'
  ),
  (
    (select id from tipos_proceso where nombre = 'Declarativo'), 'Sumario',
    10, 20,
    null, null, -- sin plazo de audiencia de fondo confirmado
    'Art. 645 núm. 8'
  );

-- Catálogo de tipos de documento (4 resoluciones judiciales + Oficio)
insert into tipos_documento (nombre, categoria, requiere_motivacion, base_legal) values
  ('Proveído', 'resolucion_judicial', false, 'Art. 265 núm. 1'),
  ('Providencia', 'resolucion_judicial', false, 'Art. 265 núm. 2'),
  ('Auto', 'resolucion_judicial', true, 'Art. 265 núm. 3, Art. 267'),
  ('Sentencia', 'resolucion_judicial', true, 'Art. 265 núm. 4, Art. 269'),
  ('Oficio', 'comunicacion', false, 'No regulado en Ley 402; uso administrativo del despacho');
