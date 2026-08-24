-- Audiencia especial (Art. 262 y 263, Ley 402).
--
-- Verificado en la transcripción del Código (docs_extra/codigo_procesal_civil,
-- Libro Segundo): el Art. 262 "Audiencia especial" enumera 8 supuestos que se
-- deciden en audiencia especial cuando se practica una medida cautelar
-- (exclusión de bienes del secuestro, rescisión del secuestro, levantamiento,
-- separación del depositario, incidencias de una medida cautelar, reclamaciones
-- al hacer el depósito en caso de embargo, rescisión de embargo o desembargo en
-- procesos ejecutivos, y acumulación de procesos), y cierra con una cláusula
-- abierta: "también se sustanciará en audiencia especial toda petición,
-- incidente y excepción de previo y especial pronunciamiento, y las excepciones
-- en los procesos ejecutivos que requieran pronunciamiento judicial inmediato,
-- así como toda cuestión que no pueda resolverse o no haya sido decidida en la
-- audiencia preliminar". El Art. 263 regula su tramitación.
--
-- Consecuencia de diseño: a diferencia de la preliminar y la de fondo, la
-- audiencia especial NO tiene ventana parametrizable ni depende de una fase del
-- proceso — se convoca cuando surge el incidente que la motiva. Por eso no
-- entra por `avanzarFase` (no es una fase) y no lleva fecha mínima ni límite
-- calculadas: lleva un motivo, que es el supuesto del Art. 262 que la origina.

alter type tipo_audiencia add value 'especial';

-- Motivo de la audiencia. Obligatorio en la práctica para las especiales (es lo
-- que las distingue entre sí), nullable en la columna porque las preliminares y
-- de fondo ya existentes no lo tienen ni lo necesitan.
alter table audiencias add column motivo text;

comment on column audiencias.motivo is
  'Para audiencias especiales: el supuesto del Art. 262 que la motiva (o la cuestión concreta, si cae en la cláusula abierta del último párrafo). Nulo en preliminares y de fondo.';

-- La escritura sobre `audiencias` sigue siendo solo del Administrador (migración
-- 20260709090002): programar y reprogramar audiencias es acto del despacho, no
-- del asistente. No se amplía aquí.
