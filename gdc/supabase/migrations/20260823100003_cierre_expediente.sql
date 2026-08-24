-- OT-03 sección 3.2: modelo real de cierre de expediente — reemplaza la
-- aproximación de "documentos confirmados" descrita en OT-01 sección 3.6.
--
-- Regla de activación (la más importante de la ficha): el cierre se activa
-- cuando el documento pasa a `confirmado` con `culmina_proceso = true`, NUNCA
-- al generarse ni al solo marcar `culmina_proceso` en un documento todavía
-- `generado`/`en_correccion`. Se implementa con un trigger de base de datos
-- (no en la capa de aplicación) para que quede garantizado sin importar desde
-- qué acción se confirme el documento — mismo criterio que los triggers de
-- auditoría de borrado (migración 013). Único lugar de verdad: si se
-- duplicara esta lógica en `gdc/src/app/(app)/documentos/actions.ts`, podría
-- desincronizarse (ej. si alguien confirma un documento desde Supabase
-- Studio, el trigger sí dispara pero la lógica de aplicación no correría).

alter table expedientes
  add column cerrado boolean not null default false,
  add column fecha_cierre timestamptz,
  add column tipo_cierre text check (tipo_cierre in ('sentencia', 'acuerdo_mediacion', 'auto', 'estado_matrimonio')),
  add column motivo_cierre text,
  add column documento_cierre_id uuid references documentos(id),
  add column cerrado_por uuid references usuarios(id);

alter table expedientes add constraint chk_cierre_expediente
  check (not cerrado or (fecha_cierre is not null and tipo_cierre is not null));

-- Se revisaron los triggers ya existentes sobre `expedientes` antes de
-- agregar uno más (OT-03 sección 6, riesgo de recursión): solo existe
-- `trg_broadcast_expedientes` (dispara en cualquier UPDATE, sin volver a
-- tocar `documentos` ni re-disparar este trigger) y los de auditoría de
-- borrado (solo DELETE, no interfieren con un UPDATE). Sin riesgo de cadena.
create or replace function fn_cerrar_expediente_por_documento() returns trigger
language plpgsql security definer
as $$
declare
  v_tipo_cierre text;
begin
  if NEW.estado = 'confirmado' and NEW.culmina_proceso = true
     and (OLD.estado is distinct from NEW.estado or OLD.culmina_proceso is distinct from NEW.culmina_proceso) then

    -- El tipo de cierre se deriva del tipo de documento (Sentencia/Acuerdo de
    -- Mediación tienen su propio valor; cualquier otro —incluido Auto, que
    -- cubre también la adjudicación de bienes de Sucesión, decisión 1 de
    -- OT-01— cae en 'auto' como categoría general de cierre por resolución).
    select case td.nombre
             when 'Sentencia' then 'sentencia'
             when 'Acuerdo de Mediación' then 'acuerdo_mediacion'
             else 'auto'
           end
      into v_tipo_cierre
    from tipos_documento td
    where td.id = NEW.tipo_documento_id;

    update expedientes
      set cerrado = true,
          fecha_cierre = now(),
          tipo_cierre = v_tipo_cierre,
          motivo_cierre = NEW.motivo_culminacion,
          documento_cierre_id = NEW.id,
          cerrado_por = NEW.confirmado_por
      where id = NEW.expediente_id
        and cerrado = false; -- no reabrir ni reescribir un cierre ya existente

    if found then
      insert into eventos_expediente (expediente_id, tipo_evento_id, fecha_evento, detalle, registrado_por)
      select NEW.expediente_id, te.id, current_date,
             'Cierre automático al confirmarse el documento de cierre', null
      from tipos_evento te
      where te.codigo = 'expediente_cerrado';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_cerrar_expediente_documento
  after update on documentos
  for each row execute function fn_cerrar_expediente_por_documento();

-- OT-01 sección 3.1 / OT-03 tabla 3.1: "Documento generado" es uno de los 2
-- eventos generados por el sistema (es_generado_por_sistema = true) — se
-- registra automáticamente cada vez que de verdad se guarda un documento,
-- sin importar desde qué acción.
create or replace function fn_registrar_evento_documento_generado() returns trigger
language plpgsql security definer
as $$
begin
  insert into eventos_expediente (expediente_id, tipo_evento_id, fecha_evento, detalle, registrado_por)
  select NEW.expediente_id, te.id, current_date, null, null
  from tipos_evento te
  where te.codigo = 'documento_generado';
  return NEW;
end;
$$;

create trigger trg_evento_documento_generado
  after insert on documentos
  for each row execute function fn_registrar_evento_documento_generado();
