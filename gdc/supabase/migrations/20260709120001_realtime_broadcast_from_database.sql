-- Corrige RF-19: "Postgres Changes" (migración 20260709110001) no entrega eventos
-- cuando la política RLS de la tabla depende de funciones SECURITY DEFINER con
-- sub-consultas (fn_usuario_rol(), fn_expediente_asignado()) — limitación conocida
-- del motor de Realtime de Supabase, confirmada en pruebas (con RLS desactivado el
-- evento sí llega; con RLS activado, nunca llega, sin error visible).
--
-- Se migra al patrón recomendado por Supabase: "Broadcast from Database". Un
-- trigger envía una señal ligera (solo tabla + tipo de operación, sin datos de la
-- fila) a un canal; el cliente la recibe y vuelve a pedir los datos por la vía
-- normal (que sí respeta RLS). La autorización para escuchar el canal usa una
-- condición simple (usuario autenticado), evitando el mismo problema.

create policy "autenticados_escuchan_broadcast" on "realtime"."messages"
  for select
  to authenticated
  using (true);

create or replace function fn_broadcast_cambio() returns trigger
language plpgsql security definer
as $$
begin
  perform realtime.send(
    jsonb_build_object('table', TG_TABLE_NAME, 'type', TG_OP),
    'cambio',
    'dashboard-cambios',
    true
  );
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_broadcast_expedientes
  after insert or update or delete on expedientes
  for each row execute function fn_broadcast_cambio();

create trigger trg_broadcast_documentos
  after insert or update or delete on documentos
  for each row execute function fn_broadcast_cambio();

create trigger trg_broadcast_audiencias
  after insert or update or delete on audiencias
  for each row execute function fn_broadcast_cambio();
