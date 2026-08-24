-- Plazo para publicar el edicto emplazatorio en sucesiones, configurable.
--
-- Aclarado por el usuario (2026-08-23): el mes es el que tiene el interesado para
-- publicar en un diario de circulación nacional el aviso del edicto emplazatorio
-- emitido en un proceso de sucesión, contado en MESES CALENDARIO desde la
-- emisión del edicto. Si no publica, se le puede hacer una anotación de reitero.
--
-- Hasta ahora la tarjeta "Edictos sin publicar" del Panel del Juez usaba 30 días
-- fijos escritos en el código, que no es lo mismo que un mes calendario (febrero
-- son 28, agosto 31) y que además nadie podía ajustar sin tocar código.

alter table configuracion_sistema
  add column plazo_publicacion_edicto_meses int not null default 1;

comment on column configuracion_sistema.plazo_publicacion_edicto_meses is
  'Meses calendario que tiene el interesado para publicar el aviso del edicto emplazatorio en un diario de circulación nacional (sucesiones / jurisdicción voluntaria). Pasado el plazo, el expediente aparece en la alerta de edictos sin publicar.';

-- La anotación de reitero es un evento, no un estado: puede repetirse tantas
-- veces como el despacho reitere, y lo que interesa es el rastro de cada una
-- (cuándo y quién), no un valor único. Al ser evento, además cuenta como
-- movimiento del expediente para el contador de inactividad.
insert into tipos_evento (codigo, nombre, tipo_proceso_id, alimenta, es_generado_por_sistema)
values (
  'reitero_publicacion_edicto',
  'Reitero de publicación de edicto',
  (select id from tipos_proceso where nombre = 'Jurisdicción voluntaria'),
  'Edictos sin publicar',
  false
);
