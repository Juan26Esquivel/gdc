-- OT-02 sección 3.6: nuevo tipo de documento para el cierre de Declarativo
-- por mediación. Mismo criterio que Auto/Sentencia (resuelve el fondo del
-- proceso) para requiere_motivacion.
--
-- [VERIFICAR]: no se encontró en la Ley 402 un artículo que regule el
-- "Acuerdo de Mediación" como documento judicial nombrado (a diferencia de
-- Proveído/Providencia/Auto/Sentencia, que sí tienen numeral propio en el
-- Art. 265). Se deja base_legal en null en vez de inventar una cita, siguiendo
-- la misma disciplina ya usada en supabase/seed.sql para los plazos de
-- audiencia de fondo sin confirmar.
insert into tipos_documento (nombre, categoria, requiere_motivacion, base_legal)
values ('Acuerdo de Mediación', 'resolucion_judicial', true, null);
