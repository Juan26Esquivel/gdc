-- OT-02 sección 3.5: marca de "este documento culmina el proceso", con motivo
-- obligatorio cuando aplica. Esta ficha solo dispone el campo — la lógica de
-- qué pasa en el resto del sistema cuando se marca en verdadero (cierre real
-- del expediente) es de OT-03, no de aquí.
alter table documentos
  add column culmina_proceso boolean not null default false,
  add column motivo_culminacion text;

alter table documentos add constraint chk_motivo_culminacion
  check (not culmina_proceso or (motivo_culminacion is not null and length(trim(motivo_culminacion)) > 0));
