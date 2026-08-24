-- Término de contestación de la demanda, y la ventana completa de la audiencia.
--
-- Confirmado por el usuario el 2026-08-23: la ventana de 20-60 días de la
-- audiencia preliminar NO se cuenta desde la notificación de la demanda (como
-- venía calculando `avanzarFase`), sino desde el VENCIMIENTO DEL TÉRMINO DE
-- CONTESTACIÓN, que es de 10 días hábiles en Ordinario y 5 en Sumario. Ese
-- término no existía como dato en ninguna tabla, así que la fecha límite que
-- mostraba el Calendario estaba corrida hacia atrás.
--
-- Vive en `subtipos_proceso` y no en `configuracion_sistema` porque su valor
-- depende del subtipo, igual que los plazos de audiencia que ya están ahí.

alter table subtipos_proceso add column plazo_contestacion_dias int;

comment on column subtipos_proceso.plazo_contestacion_dias is
  'Días hábiles del término de contestación de la demanda. Es el ancla de la ventana de la audiencia preliminar: la ventana empieza a contarse cuando este término vence, no cuando se notifica.';

update subtipos_proceso set plazo_contestacion_dias = 10 where nombre = 'Ordinario';
update subtipos_proceso set plazo_contestacion_dias = 5 where nombre = 'Sumario';

-- La tabla solo guardaba la última fecha posible (`fecha_limite_calculada`), así
-- que el mínimo del rango se configuraba en Administración pero no se usaba en
-- ningún cálculo ni se mostraba en ninguna pantalla: no existía el "esta
-- audiencia puede celebrarse entre tal y tal fecha" que pidió el usuario.
alter table audiencias add column fecha_minima_calculada timestamptz;

comment on column audiencias.fecha_minima_calculada is
  'Primera fecha posible de la audiencia (mínimo del rango del subtipo, en días hábiles). Junto con fecha_limite_calculada forma la ventana dentro de la cual la audiencia puede celebrarse.';
