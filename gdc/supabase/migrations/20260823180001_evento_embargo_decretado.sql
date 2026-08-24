-- Confirmación de que el embargo ya fue atendido.
--
-- Pedido del usuario (2026-08-23): la alerta "Ejecutivos aptos para decretar
-- embargo" debe poder marcarse como atendida una vez que se emite la resolución
-- respectiva, para que no se quede encendida sobre un expediente ya trabajado.
--
-- Se modela como evento y no como columna de estado por dos razones: el hecho
-- tiene fecha y autor (que es justo lo que hay que poder auditar después), y al
-- ser evento cuenta como movimiento del expediente para el contador de
-- inactividad — decretar un embargo es trabajo real sobre el expediente, no
-- debería seguir sumando días de "sin trabajar".
--
-- No es `es_generado_por_sistema`: lo registra una persona, sea con un clic
-- desde la alerta del Panel del Juez o desde la pestaña de eventos del
-- expediente (donde además puede dejar en el detalle qué resolución lo decretó).

insert into tipos_evento (codigo, nombre, tipo_proceso_id, alimenta, es_generado_por_sistema)
values (
  'embargo_decretado',
  'Embargo decretado',
  (select id from tipos_proceso where nombre = 'Ejecución'),
  'Ejecutivos aptos para decretar embargo',
  false
);
