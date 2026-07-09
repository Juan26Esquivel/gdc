create type categoria_documento as enum ('resolucion_judicial', 'comunicacion');

create table tipos_documento (
  id serial primary key,
  nombre text not null unique, -- Proveído, Providencia, Auto, Sentencia, Oficio
  categoria categoria_documento not null,
  requiere_motivacion boolean not null default false, -- true para Auto y Sentencia
  base_legal text
);

-- seed (ver supabase/seed.sql):
-- Proveído       | resolucion_judicial | false | Art. 265 num. 1
-- Providencia    | resolucion_judicial | false | Art. 265 num. 2
-- Auto           | resolucion_judicial | true  | Art. 265 num. 3, Art. 267
-- Sentencia      | resolucion_judicial | true  | Art. 265 num. 4, Art. 269
-- Oficio         | comunicacion        | false | (no regulado en Ley 402; uso administrativo del despacho)
