-- Calendario de días no hábiles, base para todo cálculo de términos procesales.
--
-- Confirmado por el usuario el 2026-08-23: los términos de contestación (10 días
-- en Ordinario, 5 en Sumario), la ventana de 20-60 días de la audiencia
-- preliminar y los términos de los procesos ejecutivos (8 días para excepción,
-- día 9 de 10 para decretar embargo) se cuentan todos en DÍAS HÁBILES. El
-- sistema no tenía ningún concepto de día hábil hasta ahora: incluso el plazo de
-- admisión del Art. 395, que la ley cuenta en hábiles, se calculaba como días
-- calendario.
--
-- Se modela como tabla administrable y no como lista fija en el código (decisión
-- del usuario): las fechas movibles cambian cada año y una lista en el código se
-- desactualiza en silencio, dejando todos los plazos mal calculados sin que nadie
-- lo note.

create table dias_no_habiles (
  fecha date primary key,
  descripcion text not null,
  created_at timestamptz not null default now()
);

comment on table dias_no_habiles is
  'Días que no cuentan como hábiles para términos procesales: feriados nacionales, días de duelo y receso judicial. Los sábados y domingos NO se cargan aquí — se excluyen por cálculo.';

alter table dias_no_habiles enable row level security;

-- Todos los roles necesitan leerla: cualquier pantalla que muestre un plazo
-- (Panel del Juez, Calendario, listado de expedientes) depende de este cálculo.
create policy dias_no_habiles_select on dias_no_habiles for select
  using (auth.role() = 'authenticated');

create policy dias_no_habiles_admin_write on dias_no_habiles for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- Siembra: feriados nacionales de fecha FIJA de Panamá, para 2025-2027 (2025
-- incluido porque las alertas cuentan hacia atrás sobre expedientes ya abiertos).
--
-- Deliberadamente NO se siembran las fechas movibles (Martes de Carnaval y
-- Viernes Santo, que dependen de la Pascua y cambian cada año) ni un eventual
-- receso judicial del Órgano Judicial: no se inventan fechas que no se pueden
-- confirmar desde aquí. El Administrador las agrega desde la pantalla de
-- Administración, y mientras falten, los plazos que cruzan esas semanas quedarán
-- calculados por debajo del término real.
insert into dias_no_habiles (fecha, descripcion)
select make_date(anio, mes, dia), descripcion
from (values
  (1, 1, 'Año Nuevo'),
  (1, 9, 'Día de los Mártires'),
  (5, 1, 'Día del Trabajador'),
  (11, 3, 'Separación de Panamá de Colombia'),
  (11, 4, 'Día de la Bandera'),
  (11, 5, 'Día de Colón'),
  (11, 10, 'Primer Grito de Independencia de la Villa de los Santos'),
  (11, 28, 'Independencia de Panamá de España'),
  (12, 8, 'Día de la Madre'),
  (12, 20, 'Día de Duelo Nacional [VERIFICAR si es no laborable]'),
  (12, 25, 'Navidad')
) as feriado(mes, dia, descripcion)
cross join (values (2025), (2026), (2027)) as anios(anio);
