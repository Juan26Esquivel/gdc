-- OT-03 sección 3.3: abonos a un embargo decretado en un expediente
-- Ejecutivo. El saldo pendiente es un cálculo derivado (vista con
-- security_invoker, para que respete el RLS de quien consulta, no del dueño
-- de la vista) — nunca una columna almacenada, para que no se desincronice
-- si un abono se corrige o elimina.

alter table expedientes add column monto_embargo_decretado numeric(12,2);

create table embargo_abonos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null,
  registrado_por uuid references usuarios(id) not null,
  created_at timestamptz not null default now()
);

create index idx_embargo_abonos_expediente on embargo_abonos(expediente_id);

alter table embargo_abonos enable row level security;

-- Mismo criterio de visibilidad que eventos_expediente/documentos.
create policy embargo_abonos_select on embargo_abonos for select
  using (
    exists (
      select 1 from expedientes e
      where e.id = embargo_abonos.expediente_id
        and (
          fn_usuario_rol() = 'administrador'
          or (fn_usuario_rol() = 'juez' and e.despacho_id = fn_usuario_despacho())
          or (fn_usuario_rol() = 'analista_datos' and e.despacho_id = fn_usuario_despacho())
          or (fn_usuario_rol() = 'asistente' and e.despacho_id = fn_usuario_despacho() and fn_expediente_asignado(e.id))
        )
    )
  );

create policy embargo_abonos_insert on embargo_abonos for insert
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

create policy embargo_abonos_admin_write on embargo_abonos for all
  using (fn_usuario_rol() = 'administrador')
  with check (fn_usuario_rol() = 'administrador');

create trigger trg_broadcast_embargo_abonos
  after insert or update or delete on embargo_abonos
  for each row execute function fn_broadcast_cambio();

-- Cada abono registrado genera automáticamente su evento (mismo criterio que
-- documento_generado/expediente_cerrado).
create or replace function fn_registrar_evento_abono_embargo() returns trigger
language plpgsql security definer
as $$
begin
  insert into eventos_expediente (expediente_id, tipo_evento_id, fecha_evento, detalle, registrado_por)
  select NEW.expediente_id, te.id, NEW.fecha,
         'Abono de B/.' || NEW.monto, NEW.registrado_por
  from tipos_evento te
  where te.codigo = 'abono_embargo';
  return NEW;
end;
$$;

create trigger trg_evento_abono_embargo
  after insert on embargo_abonos
  for each row execute function fn_registrar_evento_abono_embargo();

create view vista_embargo_saldos
with (security_invoker = true) as
select
  e.id as expediente_id,
  e.monto_embargo_decretado,
  coalesce(sum(ea.monto), 0) as total_abonado,
  e.monto_embargo_decretado - coalesce(sum(ea.monto), 0) as saldo_pendiente
from expedientes e
left join embargo_abonos ea on ea.expediente_id = e.id
where e.monto_embargo_decretado is not null
group by e.id, e.monto_embargo_decretado;
