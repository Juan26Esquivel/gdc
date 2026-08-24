-- Anulación de audiencias programadas por error.
--
-- Hueco encontrado el 2026-08-23: ninguna acción de la aplicación borraba
-- audiencias. Una audiencia programada por equivocación quedaba en el calendario
-- para siempre, y lo único posible era marcarla "suspendida" o "terminada por
-- incomparecencia" — que significan cosas distintas y falsas: dicen que la
-- audiencia existió y algo pasó con ella, no que nunca debió existir.
--
-- Se modela como ANULACIÓN y no como borrado físico a propósito: en un
-- expediente judicial interesa saber que se señaló una audiencia y se anuló, con
-- su motivo, no que desapareció sin rastro. Mismo criterio que el resto del
-- sistema, donde nada se borra en silencio.

alter type estado_audiencia add value 'anulada';

alter table audiencias add column motivo_anulacion text;

comment on column audiencias.motivo_anulacion is
  'Por qué se anuló la audiencia. Obligatorio en la práctica cuando estado = anulada; nulo en cualquier otro estado.';
