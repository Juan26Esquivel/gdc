-- Bug encontrado en pruebas: la política original solo permitía ver la propia fila
-- (o ser Administrador), por lo que el Juez no podía leer el nombre del Asistente
-- que generó un documento al hacer el join `documentos -> usuarios (generado_por)`
-- (RLS bloquea el embed silenciosamente, devolviendo null en vez de error).
-- Nombre/rol no son datos sensibles; se necesitan para mostrar "generado por",
-- "asignado a", etc. a cualquier rol autenticado. La escritura sigue restringida
-- a Administrador (política usuarios_admin_write, sin cambios).
drop policy usuarios_select_propio_o_admin on usuarios;

create policy usuarios_select on usuarios for select
  using (auth.role() = 'authenticated');
