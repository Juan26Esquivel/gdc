-- OT-02 sección 3.4: umbral de inactividad (30 días, confirmado por el
-- usuario para todos los tipos de proceso), mismo patrón que plazo_admision_dias.
alter table configuracion_sistema add column umbral_inactividad_dias int not null default 30;
