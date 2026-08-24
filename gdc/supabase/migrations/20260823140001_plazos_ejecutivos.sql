-- Términos de los procesos ejecutivos: excepción y decreto de embargo.
--
-- Pedido del usuario (transcripción del 2026-08-23): una vez notificada la
-- parte, corren 8 días hábiles para presentar excepción; vencido ese término, el
-- expediente queda apto para decretar el embargo sobre los bienes denunciados,
-- con el día 10 hábil como referencia de límite. Confirmado por el usuario que
-- ambos términos son en DÍAS HÁBILES.
--
-- Van en `configuracion_sistema` y no en `subtipos_proceso` —que es donde viven
-- los plazos de audiencia— por una razón concreta: `subtipos_proceso` no tiene
-- ningún subtipo cargado para Ejecución (solo Declarativo tiene Ordinario y
-- Sumario), así que no habría dónde guardarlos sin antes cargar subtipos, que es
-- una decisión de catálogo aparte. Estos dos términos además aplican a todos los
-- ejecutivos por igual, igual que el plazo de admisión del Art. 395.

alter table configuracion_sistema
  add column plazo_excepcion_ejecutivo_dias int not null default 8,
  add column plazo_embargo_ejecutivo_dias int not null default 10;

comment on column configuracion_sistema.plazo_excepcion_ejecutivo_dias is
  'Días hábiles que tiene la parte notificada para presentar excepción en un proceso ejecutivo. Vencido este término, el expediente queda apto para decretar embargo.';

comment on column configuracion_sistema.plazo_embargo_ejecutivo_dias is
  'Días hábiles desde la notificación que se toman como referencia de límite para decretar el embargo en un proceso ejecutivo.';
