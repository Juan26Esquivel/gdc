-- OT-02 (docs_extra/ordenes_tecnicas), sección 3.2: reemplaza el enum fijo
-- `fase_expediente` (diseñado solo para Declarativo) por un catálogo por tipo
-- de proceso, mismo espíritu que subtipos_proceso. Ver OT-01 sección 4.1 sobre
-- por qué NO se reutiliza el enum agregándole valores.
--
-- Alcance de esta ficha (confirmado con el usuario): solo Declarativo,
-- Ejecución y Jurisdicción voluntaria reciben catálogo de fases. Matrimonio no
-- participa (usa el campo de Estado que se construye en OT-03). "Declarativos
-- especiales" y "Desacato a los tribunales" quedan fuera de alcance por ahora,
-- igual que "Secuestro" (OT-01 decisión 2) — existen en tipos_proceso pero sin
-- expedientes reales hoy y sin fases propias diseñadas todavía; un expediente
-- de estos 2 tipos no tendrá fase inicial hasta una ficha futura que las
-- defina (ver el ajuste defensivo en expedientes/actions.ts).

create table fases_proceso (
  id uuid primary key default gen_random_uuid(),
  tipo_proceso_id int references tipos_proceso(id) not null,
  nombre text not null,
  orden int not null,
  es_fase_inicial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo_proceso_id, orden)
);

alter table fases_proceso enable row level security;

create policy fases_proceso_select on fases_proceso for select
  using (auth.role() = 'authenticated');

create policy fases_proceso_admin_write on fases_proceso for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

insert into fases_proceso (tipo_proceso_id, nombre, orden, es_fase_inicial)
select id, 'Admisión', 1, true from tipos_proceso where nombre = 'Declarativo'
union all
select id, 'Notificación de la demanda', 2, false from tipos_proceso where nombre = 'Declarativo'
union all
select id, 'Audiencia preliminar', 3, false from tipos_proceso where nombre = 'Declarativo'
union all
select id, 'Audiencia de fondo', 4, false from tipos_proceso where nombre = 'Declarativo'
union all
select id, 'Admisión', 1, true from tipos_proceso where nombre = 'Ejecución'
union all
select id, 'Notificación', 2, false from tipos_proceso where nombre = 'Ejecución'
union all
select id, 'Cumplimiento de embargo', 3, false from tipos_proceso where nombre = 'Ejecución'
-- Remate: fase opcional según el tipo de bien embargado (OT-01 decisión 5) —
-- no todo expediente la atraviesa, pero es una fase más del catálogo, sin
-- lógica condicional especial a nivel de modelo (OT-02 sección 3.2).
union all
select id, 'Remate', 4, false from tipos_proceso where nombre = 'Ejecución'
union all
select id, 'Presentación', 1, true from tipos_proceso where nombre = 'Jurisdicción voluntaria'
union all
select id, 'Admisión', 2, false from tipos_proceso where nombre = 'Jurisdicción voluntaria'
union all
select id, 'Edicto emplazatorio', 3, false from tipos_proceso where nombre = 'Jurisdicción voluntaria'
union all
select id, 'Publicación', 4, false from tipos_proceso where nombre = 'Jurisdicción voluntaria'
union all
select id, 'Adjudicación', 5, false from tipos_proceso where nombre = 'Jurisdicción voluntaria';

create index idx_fases_proceso_tipo on fases_proceso(tipo_proceso_id);

-- Migración de datos: expediente_fases.fase (enum) -> fase_id (FK). Se verificó
-- contra la base real antes de escribir esto: solo hay 12 filas, todas de
-- expedientes Declarativo o Ejecución, y todas usan nombres de fase que existen
-- tal cual en el catálogo nuevo para su propio tipo de proceso — no hay
-- expedientes de Jurisdicción voluntaria ni Matrimonio todavía. El remapeo es
-- por posición (mismo criterio "mismo orden, mismo significado" de OT-01 4.1):
-- el número de posición del valor viejo del enum (1-4) se casa con `orden` en
-- el catálogo nuevo, para el tipo de proceso real de cada expediente.
alter table expediente_fases add column fase_id uuid references fases_proceso(id);

-- Nota: no se puede usar `update ... from ... join ... on` referenciando la
-- tabla objetivo (ef) dentro del JOIN — Postgres no la deja entrar en scope
-- ahí (42P01). Se usa una subconsulta correlacionada en su lugar.
update expediente_fases ef
set fase_id = (
  select fp.id
  from expedientes e
  join fases_proceso fp on fp.tipo_proceso_id = e.tipo_proceso_id
  where e.id = ef.expediente_id
    and fp.orden = case ef.fase
          when 'admision' then 1
          when 'notificacion_demanda' then 2
          when 'audiencia_preliminar' then 3
          when 'audiencia_fondo' then 4
        end
);

-- Salvaguarda: si algún registro no se pudo remapear (ej. un tipo de proceso
-- sin catálogo de fases todavía), se aborta la migración en vez de perder el
-- dato en silencio con un `not null` que fallaría de todas formas más abajo,
-- pero con un mensaje más claro de qué pasó.
do $$
declare
  sin_remapear int;
begin
  select count(*) into sin_remapear from expediente_fases where fase_id is null;
  if sin_remapear > 0 then
    raise exception 'No se pudieron remapear % fila(s) de expediente_fases al nuevo catálogo de fases_proceso', sin_remapear;
  end if;
end $$;

alter table expediente_fases alter column fase_id set not null;
alter table expediente_fases drop column fase;
drop type fase_expediente;

create index idx_expediente_fases_fase on expediente_fases(fase_id);
