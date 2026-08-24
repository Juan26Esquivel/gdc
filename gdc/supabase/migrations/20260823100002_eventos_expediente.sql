-- OT-03 sección 3.1: registro cronológico y legible de todo lo que le pasa a
-- un expediente. Alimenta las alertas del Panel del Juez (última actividad,
-- notificación pendiente, etc.) — no confundir con `auditoria` (OT-01 4.3).
--
-- "Última actividad" para el umbral de inactividad debe calcularse sobre
-- created_at (cuándo se guardó de verdad), nunca sobre fecha_evento (que el
-- usuario puede backdatear) — ver el riesgo descrito en OT-03 sección 3.1.

create table eventos_expediente (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  tipo_evento_id uuid references tipos_evento(id) not null,
  fecha_evento date not null,
  detalle text,
  registrado_por uuid references usuarios(id), -- null cuando lo genera el sistema
  created_at timestamptz not null default now()
);

create index idx_eventos_expediente_expediente on eventos_expediente(expediente_id, created_at desc);

alter table eventos_expediente enable row level security;

-- Mismo criterio de visibilidad que documentos/expediente_fases (OT-02):
-- Juez y Administrador ven todo el despacho, Asistente solo lo asignado,
-- Analista de Datos solo lectura por despacho.
create policy eventos_expediente_select on eventos_expediente for select
  using (
    exists (
      select 1 from expedientes e
      where e.id = eventos_expediente.expediente_id
        and (
          fn_usuario_rol() = 'administrador'
          or (fn_usuario_rol() = 'juez' and e.despacho_id = fn_usuario_despacho())
          or (fn_usuario_rol() = 'analista_datos' and e.despacho_id = fn_usuario_despacho())
          or (fn_usuario_rol() = 'asistente' and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id))
        )
    )
  );

-- Registro manual: Juez y Asistente (sobre lo asignado) podrán registrar
-- eventos desde la pantalla de OT-04; Administrador siempre puede.
create policy eventos_expediente_insert on eventos_expediente for insert
  with check (
    fn_usuario_rol() = 'administrador'
    or (
      fn_usuario_rol() = 'juez'
      and exists (select 1 from expedientes e where e.id = expediente_id and e.despacho_id = fn_usuario_despacho())
    )
    or (
      fn_usuario_rol() = 'asistente'
      and exists (
        select 1 from expedientes e
        where e.id = expediente_id and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id)
      )
    )
  );

create policy eventos_expediente_admin_write on eventos_expediente for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

-- Realtime: mismo patrón "Broadcast from Database" ya usado (migración
-- 20260709120001) — el Panel del Juez necesita esta señal para sus tarjetas
-- de "movimientos sin trabajar"/"edictos sin publicar" en tiempo real.
create trigger trg_broadcast_eventos_expediente
  after insert or update or delete on eventos_expediente
  for each row execute function fn_broadcast_cambio();

-- Nota: `expedientes` ya tiene trg_broadcast_expedientes (migración
-- 20260709120001) cubriendo CUALQUIER update, así que los cambios de
-- `cerrado`/`monto_embargo_decretado` que se agregan en las migraciones
-- siguientes de esta ficha ya quedan cubiertos sin trigger nuevo.
