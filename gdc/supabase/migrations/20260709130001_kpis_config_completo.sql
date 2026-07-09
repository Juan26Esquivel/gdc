-- Módulo 6 (RF-25 a RF-28): completa kpis_config para soportar el configurador
-- real (ver mockup "Configuración de KPIs"). El campo `tipo_calculo` original
-- (texto libre, nunca consumido por ninguna UI) se reemplaza por dos enums
-- explícitos que el motor de cálculo (src/lib/kpis.ts) sabe interpretar sin
-- ambigüedad: no tiene sentido aceptar un tipo_calculo arbitrario si solo un
-- conjunto fijo de combinaciones entidad+métrica tiene una consulta real
-- detrás.

create type entidad_base_kpi as enum ('expediente', 'documento', 'audiencia');
create type metrica_kpi as enum ('conteo', 'porcentaje_cumplimiento', 'promedio_dias');

alter table kpis_config
  add column entidad_base entidad_base_kpi,
  add column metrica metrica_kpi,
  add column umbral_optimo numeric,
  add column umbral_alerta numeric,
  add column umbral_critico numeric;

update kpis_config set entidad_base = 'expediente', metrica = 'conteo' where entidad_base is null;

alter table kpis_config
  alter column entidad_base set not null,
  alter column metrica set not null;

alter table kpis_config drop column tipo_calculo;

-- El Analista de Datos configura y consulta KPIs (RF-25/RF-26), pero las
-- políticas de expedientes/documentos/audiencias (migración 20260709090002)
-- nunca le dieron acceso de lectura a esas tablas — solo a administrador,
-- juez y (para su propio caso) asistente. Sin esto, el motor de cálculo
-- vería siempre 0 filas para un Analista y los KPIs mostrarían valores falsos
-- en vez de reflejar los datos reales del sistema.
create policy expedientes_analista_select on expedientes for select
  using (fn_usuario_rol() = 'analista_datos');

create policy documentos_analista_select on documentos for select
  using (fn_usuario_rol() = 'analista_datos');

create policy audiencias_analista_select on audiencias for select
  using (fn_usuario_rol() = 'analista_datos');
