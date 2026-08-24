-- OT-03 sección 3.2: cierre de Matrimonio, que no pasa por documento. Valores
-- confirmados en el mockup (docs_extra/makups/diseño_actualizado/reglas_cierre_por_tipo/):
-- "Celebrado" y "Retirado" son los únicos que culminan el proceso; cualquier
-- otro valor (aquí solo 'en_tramite', el default) lo mantiene activo. El
-- mockup menciona de paso un posible estado intermedio ("pendiente de
-- publicación") pero no lo confirma como valor de catálogo — no se inventa
-- aquí, queda anotado en el reporte final de esta ficha por si el líder
-- técnico quiere agregarlo explícitamente más adelante.
--
-- A diferencia del cierre por documento, NO se exige motivo_cierre
-- obligatorio (el propio valor del estado es la justificación — confirmado
-- en OT-01).

-- Nullable sin default (igual criterio que `cuantia`): solo se puebla para
-- expedientes de Matrimonio (la app lo inicializa en 'en_tramite' al crear
-- uno — eso es UI, OT-04); para el resto de tipos de proceso queda en null,
-- no aplica.
alter table expedientes
  add column estado_matrimonio text
    check (estado_matrimonio in ('en_tramite', 'celebrado', 'retirado'));

create or replace function fn_cerrar_expediente_por_matrimonio() returns trigger
language plpgsql security definer
as $$
begin
  if NEW.estado_matrimonio in ('celebrado', 'retirado')
     and OLD.estado_matrimonio is distinct from NEW.estado_matrimonio
     and NEW.cerrado = false then

    update expedientes
      set cerrado = true,
          fecha_cierre = now(),
          tipo_cierre = 'estado_matrimonio',
          documento_cierre_id = null,
          cerrado_por = null -- no hay un usuario que "confirme un documento" aquí; el estado es la fuente
      where id = NEW.id;

    insert into eventos_expediente (expediente_id, tipo_evento_id, fecha_evento, detalle, registrado_por)
    select NEW.id, te.id, current_date,
           'Cierre automático — Estado de Matrimonio actualizado a: ' || NEW.estado_matrimonio, null
    from tipos_evento te
    where te.codigo = 'expediente_cerrado';
  end if;
  return NEW;
end;
$$;

create trigger trg_cerrar_expediente_matrimonio
  after update of estado_matrimonio on expedientes
  for each row execute function fn_cerrar_expediente_por_matrimonio();
