-- OT-03 (docs_extra/ordenes_tecnicas), sección 3.1: catálogo de tipos de
-- evento de negocio. Distinto de `auditoria` (seguridad/cumplimiento) — ver
-- OT-01 sección 4.3. `es_generado_por_sistema = true` marca los 2 eventos que
-- el propio sistema registra por trigger (documento_generado, expediente_cerrado);
-- los otros 9 los registrará el usuario manualmente desde la pantalla de
-- Actualización de Eventos (OT-04, todavía no construida).

create table tipos_evento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo_proceso_id int references tipos_proceso(id), -- null = aplica a cualquier tipo
  alimenta text not null, -- metadata para la UI ("Alimenta: ..." del mockup), no lógica de negocio
  es_generado_por_sistema boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tipos_evento enable row level security;

create policy tipos_evento_select on tipos_evento for select
  using (auth.role() = 'authenticated');

create policy tipos_evento_admin_write on tipos_evento for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

insert into tipos_evento (codigo, nombre, tipo_proceso_id, alimenta, es_generado_por_sistema) values
  ('notificacion_registrada', 'Notificación registrada', null, 'Pendientes de notificar', false),
  ('cambio_fase', 'Cambio de fase', null, 'Fase actual del expediente', false),
  ('observacion_actualizada', 'Observación actualizada', null, 'Estado visible en el listado general', false),
  ('correccion_fecha_registro', 'Corrección de fecha de registro', null, 'Semáforo de tiempo en el sistema', false),
  ('override_umbral_inactividad', 'Override de umbral de inactividad', null, 'Movimientos sin trabajar (excepción)', false),
  ('documento_generado', 'Documento generado', null, 'Movimientos sin trabajar', true),
  ('abono_embargo', 'Abono a embargo', (select id from tipos_proceso where nombre = 'Ejecución'), 'Saldo del embargo', false),
  ('edicto_emplazatorio_emitido', 'Edicto emplazatorio emitido', (select id from tipos_proceso where nombre = 'Jurisdicción voluntaria'), 'Edictos sin publicar', false),
  ('publicacion_edicto_registrada', 'Publicación de edicto registrada', (select id from tipos_proceso where nombre = 'Jurisdicción voluntaria'), 'Edictos sin publicar', false),
  ('estado_matrimonio_actualizado', 'Estado de matrimonio actualizado', (select id from tipos_proceso where nombre = 'Matrimonio'), 'Estado del expediente', false),
  ('expediente_cerrado', 'Expediente cerrado', null, 'Cierre del expediente', true);
