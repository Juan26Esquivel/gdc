-- OT-02 sección 3.3: campos de expediente que usa el Excel real del despacho
-- y las pantallas nuevas, y que expedientes hoy no tiene.

alter table expedientes
  add column fisico_electronico text check (fisico_electronico in ('fisico', 'electronico')),
  add column municipal_circuito text check (municipal_circuito in ('municipal', 'circuito')),
  add column pretension text, -- motivo del trámite; nullable, no todos los tipos lo usan igual (ver Excel)
  add column notas text,
  add column fecha_registro date,
  add column omitir_umbral_inactividad boolean not null default false,
  add column motivo_omision_umbral text;

-- fecha_registro nace igual a created_at pero, a diferencia de created_at,
-- el Juez puede corregirla desde la aplicación (UI en OT-04). Es la fecha que
-- alimenta el semáforo del Panel del Juez — nunca usar created_at para eso.
update expedientes set fecha_registro = created_at::date where fecha_registro is null;
alter table expedientes alter column fecha_registro set not null;

-- Regla reforzada a nivel de base de datos (no solo en la aplicación), mismo
-- criterio que el check de configuracion_sistema.modo_validacion_cuantia:
-- si se omite el umbral de inactividad, el motivo es obligatorio.
alter table expedientes add constraint chk_motivo_omision_umbral
  check (not omitir_umbral_inactividad or (motivo_omision_umbral is not null and length(trim(motivo_omision_umbral)) > 0));
