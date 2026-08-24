# OT-04 — Pantallas del mockup y alertas en tiempo real

**Para:** sesión de Claude Code con acceso de escritura al repositorio `gdc/`.
**De:** líder técnico del proyecto (sesión de supervisión, sin acceso de escritura al código).
**Depende de:** OT-02 y OT-03 deben estar aplicadas y aceptadas antes de empezar esta ficha — ambas ya fueron verificadas y aceptadas por el líder técnico (23 de agosto de 2026). Si algo de lo que describe esta ficha no coincide con lo que OT-02/OT-03 realmente dejaron aplicado (nombres de columna, de tabla, de código de evento), usa lo que de verdad quedó en el esquema — no lo que está escrito aquí si hay contradicción, y anótalo en tu reporte final.
**Esta ficha SÍ incluye:** pantallas, componentes de servidor/cliente, acciones de formulario, y la extensión de las suscripciones Realtime del lado de la aplicación. No incluye ningún cambio nuevo de modelo de datos — si durante la construcción descubres que falta una columna o tabla que OT-02/OT-03 no contemplaron, no la agregues tú: anótalo en el reporte final y espera instrucción.

---

## 1. Objetivo

Construir, sobre el modelo de datos que ya dejaron OT-02 y OT-03, las pantallas de la propuesta visual (`docs_extra/makups/diseño_actualizado/`) que hoy no existen en la aplicación real, y adaptar las que ya existen para que reflejen el modelo nuevo. Al terminar, el Juez debe poder abrir el Panel Principal y ver los 5 puntos de alerta que pidió, con datos reales y actualización en tiempo real (no solo al recargar la página); el Asistente debe poder registrar un expediente nuevo en dos pasos (tipo → datos) y actualizar eventos sobre un expediente existente; y cualquier usuario debe poder consultar las reglas de cierre por tipo de proceso como referencia.

---

## 2. Contexto que debes leer antes de tocar nada

- `docs_extra/ordenes_tecnicas/OT-01-restructuracion-eventos-cierre-alertas.md` completo — ahí está el porqué de cada regla de negocio que estas pantallas exponen.
- `docs_extra/ordenes_tecnicas/OT-02-modelo-de-datos-base.md` y `OT-03-eventos-cierre-abonos-embargo.md` completos, y el resultado real de ambas (nombres finales de tablas/columnas que quedaron aplicados — usa `gdc/src/lib/supabase/database.types.ts` regenerado como fuente de verdad, no lo que está escrito en las fichas si hay diferencia).
- Los 7 mockups exportados, cada uno en su propia carpeta bajo `docs_extra/makups/diseño_actualizado/`: `panel_principal_juez/code.html`, `vista_general_expedientes/code.html`, `detalle_expediente_ejecutivo/code.html`, `nuevo_expediente_paso1_tipo/code.html`, `nuevo_expediente_paso2_datos/code.html`, `actualizacion_eventos/code.html`, `reglas_cierre_por_tipo/code.html`. Son la referencia visual y de contenido — el objetivo no es copiar el CSS exacto, sino la estructura de información, los campos, y las etiquetas que muestran.
- Código de aplicación ya existente que vas a extender, no reemplazar desde cero: `gdc/src/app/(app)/dashboard/page.tsx`, `gdc/src/app/(app)/dashboard/realtime-refresh.tsx`, `gdc/src/app/(app)/expedientes/page.tsx`, `nuevo-expediente-dialog.tsx`, `actions.ts`, `avanzar-fase-form.tsx`, `filtros-expedientes.tsx`, `gdc/src/lib/fases.ts`, `gdc/src/lib/catalogos.ts`, `gdc/src/lib/kpis.ts`, `gdc/src/lib/plazo-audiencia.ts`.
- El patrón "Broadcast from Database" ya implementado y ya extendido por OT-03 a `eventos_expediente` — revisa cómo `realtime-refresh.tsx` se suscribe hoy al canal de `expedientes`/`documentos` para replicar el mismo patrón, no inventar uno nuevo.

---

## 3. Alcance: qué construir, pantalla por pantalla

### 3.1 Panel Principal del Juez (`panel_principal_juez`) — reemplaza `dashboard/page.tsx`

Esta es la pantalla más importante de la ficha porque es la que el usuario pidió explícitamente con 5 puntos. Cada punto se corresponde con una tarjeta del mockup:

1. **Tipos de proceso: cantidades.** Barra por tipo de proceso (`tipos_proceso`) con el conteo de expedientes activos (`cerrado = false`) de cada uno. Reemplaza la tarjeta "Carga de Trabajo por Fase" actual, que agrupaba por fase — esta agrupa por tipo de proceso completo, tal como muestra el mockup (Declarativo Ordinario, Declarativo Sumario, Ejecución, Jurisdicción voluntaria, Matrimonio; Secuestro se muestra deshabilitado/en gris si ya existe algún expediente heredado, no como opción activa — sigue fuera de catálogo por la decisión 2 de OT-01).
2. **Alertas por semáforo, listado de expedientes por tiempos.** Ver cálculo exacto en la sección 4. Franjas Verde/Amarillo/Ámbar/Rojo/Negro con el conteo de cada una, más una tabla debajo con columnas Número, Tipo de proceso, Fase actual, Fecha de registro, Tiempo en el sistema — filtrable por tipo mediante los "pills" del mockup. Cada fila debe permitir navegar al detalle del expediente.
3. **Análisis de movimientos sin trabajar.** Tarjeta con los expedientes cuyo último evento en `eventos_expediente.created_at` (nunca `fecha_evento` — ver la advertencia de OT-03, sección 3.1) supera `configuracion_sistema.umbral_inactividad_dias` (30 por defecto), **excluyendo** los que tengan `omitir_umbral_inactividad = true` en `expedientes`. Un expediente sin ningún evento todavía se cuenta usando su `created_at` como referencia (el mockup lo etiqueta "Sin eventos registrados · umbral 30 días").
4. **Pendientes de notificar luego de admitidos.** Expedientes cuya fase activa es "Admisión" (vía `expediente_fases`/`fases_proceso`, ya no el enum) y no tienen fecha de notificación registrada — esta tarjeta ya existe parcialmente hoy como "Críticos (Art. 395)"; consérvala pero verifica que siga funcionando contra `fases_proceso.nombre = 'Admisión'` en vez del valor de enum viejo.
5. **Edictos sin publicar (más de 30 días).** Expedientes de Jurisdicción voluntaria con un evento `edicto_emplazatorio_emitido` registrado hace más de 30 días **sin** un evento posterior `publicacion_edicto_registrada` para el mismo expediente. Esta tarjeta es nueva — no existe hoy en ninguna forma aproximada.

Todas las tarjetas deben suscribirse al canal Realtime existente extendido por OT-03 (`eventos_expediente`, y `expedientes` para los cambios de `cerrado`/fase) para refrescarse solas, replicando el patrón de `realtime-refresh.tsx`.

**Importante — no dupliques la aproximación vieja.** El dashboard actual usa `documentos.estado = 'confirmado'` como proxy de "expediente resuelto" (RF-17, señalado como limitación honesta en OT-01 sección 3.6). Ahora que `expedientes.cerrado` existe de verdad (OT-03), cualquier métrica de "resueltos" debe usar `cerrado = true`, no la aproximación vieja. Elimínala al construir esta pantalla — no dejes que convivan dos números distintos de "resueltos" en la aplicación.

### 3.2 Vista general de Expedientes (`vista_general_expedientes`) — extiende `expedientes/page.tsx`

La tabla ya existe pero le faltan columnas que el mockup sí muestra: Tipo/subtipo (ya existe), **Pretensión**, **Físico o electrónico**, Fecha admisión (ya existe como parte del flujo), **Estado (observación)** — el texto libre que alimenta el evento `observacion_actualizada`, Plazo audiencia (ya existe vía `calcularEstadoPlazo`), Asignado (ya existe). Agrega las columnas nuevas leyendo los campos que OT-02 agregó a `expedientes` (`pretension`, `fisico_electronico`) y el evento/observación más reciente de tipo `observacion_actualizada` para la columna de estado. Las tarjetas de resumen arriba de la tabla (Expedientes activos, Pendientes de agenda, Vencidos/críticos, Sin clasificar) se calculan igual que hoy, ajustando "Sin clasificar" a expedientes sin `tipo_proceso_id` reconocido en el catálogo activo (Secuestro, si llega a existir algún registro heredado).

### 3.3 Detalle de expediente (`detalle_expediente_ejecutivo`) — nueva ruta, o extiende la vista de documentos existente

El mockup muestra un detalle con pestañas: **Datos generales**, **Documentos** (ya existe en `expedientes/[id]/documentos/`), **Eventos y trazabilidad** (nueva, ver 3.5). La pestaña "Datos generales" muestra los campos nuevos de OT-02 (físico/electrónico, municipal/circuito, despacho, fechas), la "Línea de trámite" (los pasos del catálogo `fases_proceso` del tipo correspondiente, marcando cuáles ya se completaron con su fecha), el estado/observación editable, notas, asignación, documentos generados recientes, y auditoría reciente. Decide si esta vista reemplaza o convive con la ruta de documentos ya existente (`expedientes/[id]/documentos/page.tsx`) — lo más simple es que esa ruta se convierta en una pestaña dentro de esta vista de detalle en vez de duplicar la navegación; usa tu criterio y explica la decisión en tu reporte final.

### 3.4 Registro de expediente en dos pasos (`nuevo_expediente_paso1_tipo` + `nuevo_expediente_paso2_datos`) — reemplaza `nuevo-expediente-dialog.tsx`

Hoy el registro es un diálogo de un solo paso. El mockup pide un flujo de dos pantallas (no un diálogo modal):

- **Paso 1 — Tipo de proceso:** tarjetas seleccionables por tipo (Declarativo Ordinario, Declarativo Sumario, Ejecución, Jurisdicción voluntaria, Matrimonio), con Secuestro visible pero deshabilitado ("Pendiente definir en catálogo") — no lo actives como opción seleccionable, sigue fuera de alcance (decisión 2 de OT-01).
- **Paso 2 — Datos del expediente:** formulario dividido en las secciones que muestra el mockup — Identificación (número, despacho, físico/electrónico, municipal/circuito), Datos del proceso (pretensión, monto/cuantía con la validación de tope ya existente de RF-34-36, reutilízala tal cual), Fechas (presentación, admisión opcional, **fecha de registro en el sistema** — con el aviso explícito "Esta fecha alimenta el semáforo de alertas del Panel del Juez", igual texto que el mockup, para que quien registra entienda su importancia), Asignación (asistente responsable). Panel lateral de "Vista previa" con el resumen y el semáforo inicial (Verde · 0 meses, ya que un expediente recién creado siempre nace en verde).

El formulario y su validación de tope de cuantía reutilizan la lógica ya existente en `crearExpediente` (`expedientes/actions.ts`) — no la reescribas desde cero, extiéndela con los campos nuevos y con la creación de la fase inicial que ya implementa hoy (correcto, según lo verificado en OT-02).

Los campos específicos por tipo de proceso que el Excel diferencia (ej. "Monto de mandamiento de pago" solo aplica a Ejecución) deben mostrarse condicionalmente según el tipo elegido en el Paso 1 — no muestres campos irrelevantes para un tipo que no los usa.

### 3.5 Actualización de Eventos (`actualizacion_eventos`) — pestaña nueva dentro del detalle de expediente

Formulario "Registrar nuevo evento" con selector de `tipos_evento` (filtrado por `tipo_proceso_id` del expediente — o `null`/cualquiera), cada opción mostrando su etiqueta "Alimenta: ..." tal como el mockup (el campo `alimenta` de OT-03 es exactamente para esto). Campos condicionales según el tipo de evento elegido:

- **Documento generado (Auto — decreta embargo u otro):** este caso en particular normalmente se dispara desde el flujo de generación de documentos existente (`documentos/actions.ts`), no manualmente desde aquí — verifica cómo el mockup lo presenta como preseleccionado y decide si esta opción del selector debe estar deshabilitada para entrada manual (para no duplicar el evento que el trigger de OT-03 ya genera automáticamente al confirmarse el documento) o si aplica solo quede disponible para los tipos de evento que **no** son `es_generado_por_sistema`. Los eventos con `es_generado_por_sistema = true` (`documento_generado`, `expediente_cerrado`) **no deben ser seleccionables manualmente** en este formulario — el catálogo ya los distingue justamente para esto.
- **Toggle "Este Auto/documento culmina el proceso"** con motivo obligatorio — este toggle vive en la pantalla de generación/confirmación de documentos (`culmina_proceso`/`motivo_culminacion` de `documentos`, OT-02), no en el formulario de eventos manuales. Si lo replicas aquí también, verifica que sea el mismo campo subyacente y no una copia paralela.
- **Actualización de monto de embargo (abono):** monto y fecha, inserta en `embargo_abonos` (el evento `abono_embargo` lo genera el trigger de OT-03 automáticamente — no lo dupliques aquí).
- **Corrección de fecha de registro:** actualiza `expedientes.fecha_registro` y registra el evento `correccion_fecha_registro` — esta es la vía por la que el Juez corrige la fecha que alimenta el semáforo, tal como pidió explícitamente ("la misma fecha debe ser editable por el juez").
- **Override de umbral de inactividad:** activa `omitir_umbral_inactividad` + `motivo_omision_umbral` (obligatorio) en `expedientes`, y registra el evento `override_umbral_inactividad` — conecta este cabo suelto que OT-03 dejó anotado explícitamente para esta ficha (sección 6 de OT-03).

Recordatorio visible en el formulario, igual que en el mockup: "Todo expediente necesita movimiento cada 30 días" (o el valor configurado en `configuracion_sistema.umbral_inactividad_dias`, no un texto fijo de "30" si el Administrador lo cambió).

Debajo, **Historial de eventos**: listado cronológico descendente de `eventos_expediente` para ese expediente, mostrando tipo, quién lo registró (o "Sistema" si `registrado_por` es nulo), detalle, y la etiqueta "Alimenta: ..." de su tipo — igual estructura que el mockup.

### 3.6 Reglas de cierre por tipo de proceso (`reglas_cierre_por_tipo`) — pantalla de referencia estática

Pantalla informativa (no transaccional) accesible desde Administración, que explica en lenguaje simple cómo culmina cada uno de los 4 grupos, igual que el mockup: Declarativo (Sentencia/Acuerdo de Mediación/Auto + toggle con motivo obligatorio), Ejecución (Auto decreta embargo → fase Cumplimiento de embargo, con abonos, y el mismo toggle de culminación anticipada), Jurisdicción voluntaria (adjudicación de bienes vía Auto), Matrimonio (solo por Estado = Celebrado/Retirado, sin documento de cierre). Puede construirse como contenido mayormente estático con los datos reales del catálogo (`tipos_documento`, `tipos_evento`) donde aplique, sin necesidad de lógica compleja — es una pantalla de consulta, no de captura.

---

## 4. Cálculo del semáforo — especificación exacta

Sobre `expedientes.fecha_registro` (nunca `created_at`), calcular los meses transcurridos hasta hoy:

| Color | Rango |
|---|---|
| Verde | ≤ 3 meses |
| Amarillo | > 3 y ≤ 6 meses |
| Ámbar | > 6 y ≤ 9 meses |
| Rojo | > 9 y ≤ 12 meses |
| Negro | > 12 meses |

Aplica únicamente a expedientes con `cerrado = false` — un expediente cerrado no debe seguir sumando al semáforo del Panel Principal (no tiene sentido alertar sobre un expediente que ya terminó). Implementa el cálculo como una función reutilizable (ej. `lib/semaforo.ts`, siguiendo el mismo patrón que ya existe en `lib/plazo-audiencia.ts`) para no duplicar la lógica entre el Panel Principal, la vista general y el detalle de expediente.

---

## 5. RLS y Realtime del lado de la aplicación

No hay cambios de política RLS en esta ficha (eso ya lo hizo OT-02/OT-03) — solo verifica que las consultas nuevas de estas pantallas efectivamente respeten lo que RLS ya filtra (ej. un Asistente no debería poder ni siquiera consultar expedientes que no tiene asignados al construir la vista de detalle; si el `select` no lanza error pero devuelve vacío para ese caso, es RLS funcionando correctamente, no un bug).

Todas las pantallas con datos que alimentan alertas (Panel Principal, y la pestaña de eventos del detalle) deben suscribirse al Realtime ya extendido por OT-03, replicando el componente `realtime-refresh.tsx` existente — no inventes un mecanismo de polling nuevo.

---

## 6. Fuera de alcance explícito de esta ficha

- Cualquier cambio de modelo de datos no contemplado por OT-02/OT-03 — si falta algo, repórtalo, no lo agregues.
- El catálogo de "Secuestro" como tipo de proceso habilitado, y el subtipo "Ejecutivo Hipotecario" — siguen fuera de alcance (decisiones 2 y 5 de OT-01). Se muestran deshabilitados donde el mockup los muestra deshabilitados, nunca como opción funcional.
- Cualquier campo o pantalla que el mockup no contemple — si durante la construcción ves un vacío entre lo que el mockup pide y lo que haría falta para que tenga sentido, resuélvelo con el criterio más simple y explícalo en tu reporte, en vez de inventar alcance nuevo sin avisar.

---

## 7. Riesgos y advertencias

- **No conviertas el Panel Principal en una sola consulta gigante.** Cinco tarjetas con lógicas distintas es mejor como consultas separadas (aunque corran en paralelo con `Promise.all`, como ya hace `dashboard/page.tsx` hoy) que como un único `select` con joins acumulados difíciles de mantener y de depurar si una tarjeta empieza a fallar.
- **El semáforo y el contador de inactividad son cálculos distintos que no deben confundirse**: el semáforo usa `fecha_registro` (editable, refleja "cuánto lleva el expediente en el sistema"); el contador de inactividad usa `eventos_expediente.created_at` (no editable, refleja "cuánto hace que no se le hace nada"). Un expediente puede estar en semáforo verde y aun así aparecer en "movimientos sin trabajar" si nadie lo ha tocado, y viceversa — no los mezcles en una sola función.
- **RNF-05 (menos de 2 segundos):** el Panel Principal consulta varias tablas a la vez; si alguna consulta se vuelve lenta con datos reales, considera índices adicionales (coordinar conmigo antes de agregar cualquier índice nuevo, ya que eso sí sería un cambio de esquema fuera del alcance declarado de esta ficha) antes de optimizar prematuramente en el código.
- **No reintroduzcas el enum `fase_expediente` en ningún lugar nuevo** — cualquier comparación de fase debe ir contra `fases_proceso.nombre` o `fase_id`, nunca contra un string fijo que asuma el modelo viejo.

---

## 8. Checklist de aceptación (lo que voy a verificar yo al terminar)

- [ ] Panel Principal del Juez muestra los 5 puntos pedidos por el usuario, con datos reales (no de ejemplo) y coherentes con las reglas de esta ficha.
- [ ] El semáforo se calcula exactamente con los 5 rangos de la sección 4, sobre `fecha_registro`, excluyendo expedientes cerrados.
- [ ] "Movimientos sin trabajar" usa `eventos_expediente.created_at`, respeta `omitir_umbral_inactividad`, y usa el valor configurado de `umbral_inactividad_dias` (no un 30 fijo en el código).
- [ ] "Edictos sin publicar" detecta correctamente expedientes con `edicto_emplazatorio_emitido` sin `publicacion_edicto_registrada` posterior, pasados 30 días.
- [ ] La aproximación vieja de "resueltos = documentos confirmados" fue eliminada del dashboard, reemplazada por `expedientes.cerrado`.
- [ ] El flujo de registro de expediente en dos pasos funciona de principio a fin para al menos un tipo de cada grupo (Declarativo, Ejecución, Jurisdicción voluntaria, Matrimonio), guardando todos los campos nuevos de OT-02.
- [ ] La pantalla de Actualización de Eventos permite registrar cada tipo de evento no generado por el sistema, conecta correctamente el override de umbral de inactividad (cabo suelto de OT-03), y no permite seleccionar manualmente los eventos `es_generado_por_sistema = true`.
- [ ] El historial de eventos del detalle de expediente muestra los eventos en orden cronológico con su etiqueta "Alimenta: ...".
- [ ] La pantalla de reglas de cierre por tipo de proceso está accesible y refleja correctamente los 4 grupos.
- [ ] Todas las pantallas nuevas respetan RLS (probado con las 4 cuentas de prueba, en particular que un Asistente no vea expedientes fuera de su asignación).
- [ ] Las tarjetas que alimentan alertas se actualizan en tiempo real (verificable insertando un evento desde SQL directo mientras la pantalla está abierta, sin recargar).
- [ ] `npm run build` y `npm run lint` pasan sin errores ni warnings nuevos.
- [ ] Secuestro y Ejecutivo Hipotecario permanecen deshabilitados/fuera de alcance en toda pantalla nueva.

## 9. Al terminar

Repórtame igual que en OT-02 y OT-03: pantallas y archivos creados o modificados y por qué, cualquier decisión de diseño que hayas tenido que tomar dentro del margen que te dejé (por ejemplo cómo resolviste la convivencia entre la vista de detalle nueva y la ruta de documentos existente, sección 3.3), cualquier vacío entre el mockup y el modelo real que hayas tenido que resolver con tu propio criterio, y confirmación de que corriste el checklist de la sección 8 tú mismo antes de avisarme. Voy a revisar el resultado —pantallas, lógica de alertas, que el build pase— antes de dar por buena la ficha; no voy a tocar el código, solo a auditarlo.
