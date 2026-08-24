# OT-03 — Eventos de negocio, cierre de expediente y abonos de embargo

**Para:** sesión de Claude Code con acceso de escritura al repositorio `gdc/` y a las migraciones de Supabase.
**De:** líder técnico del proyecto (sesión de supervisión, sin acceso de escritura al código).
**Depende de:** OT-02 debe estar aplicada y verificada antes de empezar esta ficha — usa `despacho_id`, `fases_proceso`, los campos nuevos de `expedientes` y el `culmina_proceso`/`motivo_culminacion` de `documentos` que OT-02 crea. Si OT-02 no está lista, no continúes.
**Esta ficha NO incluye:** ninguna pantalla ni componente de UI (eso es OT-04, que depende de esta). Aquí se construye el modelo de datos, los triggers, las políticas RLS y el Realtime — la base de la que OT-04 va a leer y escribir.

---

## 1. Objetivo

Construir la fuente de verdad de "qué le pasó a cada expediente y cuándo" (eventos de negocio, distinta de `auditoria` — ver OT-01, punto 4.3), el modelo real de cierre de expediente (que reemplaza la aproximación actual de "documentos confirmados" descrita en OT-01, punto 3.6), y el seguimiento de abonos a un embargo decretado en un expediente Ejecutivo.

Al terminar, debe ser posible, sin ninguna pantalla todavía (probando con SQL directo o Supabase Studio): registrar un evento sobre un expediente, ver que "última actividad" se actualiza, marcar un documento como `culmina_proceso = true` y que al confirmarse el expediente quede cerrado automáticamente con su motivo, y registrar abonos a un embargo hasta que el saldo llegue a cero.

---

## 2. Contexto que debes leer antes de tocar nada

- `docs_extra/ordenes_tecnicas/OT-01-restructuracion-eventos-cierre-alertas.md` completo, especialmente las secciones 4.3, 4.4 y 5.
- `docs_extra/ordenes_tecnicas/OT-02-modelo-de-datos-base.md` y el resultado real de esa ficha (migraciones que se crearon, nombres finales de columnas — puede que algo se haya nombrado distinto a como está escrito ahí; usa lo que realmente quedó aplicado).
- El ciclo de vida actual de `documentos` (`generado` → `validado` → `en_corrección` → `confirmado`, migración `20260708100007_documentos.sql`) y cómo se transiciona hoy (`gdc/src/app/(app)/documentos/actions.ts`, `gdc/src/lib/estado-documento.ts`). El cierre de expediente de esta ficha se activa en el momento de **confirmación**, no de generación — ver 3.2.
- El patrón "Broadcast from Database" ya implementado para Realtime (migración `20260709120001_realtime_broadcast_from_database.sql`) — vas a replicar ese mismo patrón, no inventar uno nuevo.

---

## 3. Cambios de modelo de datos requeridos

### 3.1 Eventos de expediente

**`tipos_evento`** (catálogo): id, `codigo` (único, ej. `notificacion_registrada`), `nombre` (para mostrar en UI), `tipo_proceso_id` (FK nullable — `null` significa que aplica a cualquier tipo de proceso; con valor, solo aplica al tipo indicado), `alimenta` (texto corto, describe qué panel de alerta actualiza — es metadata para que la UI de OT-04 pueda mostrar la etiqueta "Alimenta: ..." del mockup, no lógica de negocio en sí), `es_generado_por_sistema` (booleano — distingue eventos que el usuario registra manualmente de los que el propio sistema genera, como "Documento generado" cuando de verdad se guarda un documento).

Siembra al menos estos códigos (ajusta nombres si hace falta, pero no reduzcas la cobertura):

| código | tipo de proceso | alimenta |
|---|---|---|
| `notificacion_registrada` | cualquiera | Pendientes de notificar |
| `cambio_fase` | cualquiera | Fase actual del expediente |
| `observacion_actualizada` | cualquiera | Estado visible en el listado general |
| `correccion_fecha_registro` | cualquiera | Semáforo de tiempo en el sistema |
| `override_umbral_inactividad` | cualquiera | Movimientos sin trabajar (excepción) |
| `documento_generado` | cualquiera | Movimientos sin trabajar |
| `abono_embargo` | Ejecución | Saldo del embargo |
| `edicto_emplazatorio_emitido` | Jurisdicción voluntaria | Edictos sin publicar |
| `publicacion_edicto_registrada` | Jurisdicción voluntaria | Edictos sin publicar |
| `estado_matrimonio_actualizado` | Matrimonio | Estado del expediente |
| `expediente_cerrado` | cualquiera, `es_generado_por_sistema = true` | Cierre del expediente |

**`eventos_expediente`**: id, `expediente_id` (FK, not null), `tipo_evento_id` (FK, not null), `fecha_evento` (date, not null — la fecha "real" que el usuario indica, puede ser distinta de hoy), `detalle` (texto, nullable), `registrado_por` (FK a `usuarios`, nullable — nulo cuando `es_generado_por_sistema` del tipo de evento es verdadero), `created_at` (timestamptz, default now — este es el timestamp real de cuándo se guardó el registro, no confundir con `fecha_evento`).

**Distinción importante, no la pierdas:** "última actividad" para la alerta de "movimientos sin trabajar" (umbral de 30 días de OT-01/OT-02) debe calcularse sobre `eventos_expediente.created_at` (cuándo se registró de verdad), nunca sobre `fecha_evento` (que el usuario puede backdatear). Si usas `fecha_evento` para esto, alguien podría "resetear" el contador de inactividad registrando un evento con una fecha vieja sin haber hecho nada hoy — exactamente lo contrario de lo que la alerta busca detectar.

### 3.2 Cierre de expediente

Agrega a `expedientes` (columnas directas, no una tabla aparte — un expediente se cierra una sola vez, no hace falta un historial de cierres):

- `cerrado` (booleano, not null, default false)
- `fecha_cierre` (timestamptz, nullable)
- `tipo_cierre` (texto/enum, nullable: `sentencia` | `acuerdo_mediacion` | `auto` | `estado_matrimonio`)
- `motivo_cierre` (texto, nullable)
- `documento_cierre_id` (FK a `documentos`, nullable — se llena para los cierres vía documento; queda `null` para Matrimonio, que cierra por estado, no por documento)
- `cerrado_por` (FK a `usuarios`, nullable)

**Regla de activación — esto es lo más importante de la ficha:** el cierre por documento (Sentencia, Acuerdo de Mediación, Auto — incluida la adjudicación de bienes de Sucesión, que usa Auto según la decisión 1 de OT-01) se activa **cuando el documento pasa a estado `confirmado`**, no cuando se genera ni cuando se marca `culmina_proceso = true`. Marcar `culmina_proceso` en un documento todavía en estado `generado` o `en_corrección` es solo declarar la intención; el expediente no debe darse por cerrado hasta que el Juez confirme el documento, exactamente igual que el resto del ciclo de vida de documentos ya funciona hoy (RF-12 a RF-15). Implementa esto con un trigger sobre `documentos` (`after update` cuando `estado` cambia a `confirmado` y `culmina_proceso = true`), no en la capa de aplicación — así queda garantizado sin importar desde qué acción se confirme el documento, siguiendo el mismo criterio que ya se usó para los triggers de auditoría de borrado.

Ese mismo trigger debe, en una sola transacción: marcar `expedientes.cerrado = true` con los demás campos, e insertar automáticamente una fila en `eventos_expediente` con el tipo `expediente_cerrado` (`es_generado_por_sistema = true`, `registrado_por = null`).

**Cierre de Matrimonio:** no pasa por documento. Es un campo `estado_matrimonio` en `expedientes` (texto/enum: define al menos `en_tramite`, `celebrado`, `retirado` — usa lo que confirmó el usuario en el mockup, sección "Reglas de cierre por tipo de proceso"). Cuando se actualiza a `celebrado` o `retirado`, un trigger (o la función de aplicación que registra el evento `estado_matrimonio_actualizado` — decide el patrón que prefieras aquí, ya que no depende del ciclo de `documentos`) marca `cerrado = true`, `tipo_cierre = 'estado_matrimonio'`, `documento_cierre_id = null`. A diferencia del cierre por documento, **no se exige `motivo_cierre` obligatorio** para este caso — el propio valor del estado es la justificación, así se confirmó en OT-01.

Agrega un `check` que impida `cerrado = true` sin `fecha_cierre` y sin `tipo_cierre` — igual criterio de reforzar reglas críticas a nivel de base de datos que ya se usó en OT-02.

### 3.3 Abonos a embargo

Agrega a `expedientes` (nullable, solo se usan para Ejecución — mismo criterio que ya usan `cuantia`/`es_lanzamiento` hoy, genéricos en la tabla pero solo poblados para el tipo que corresponde): `monto_embargo_decretado` (numeric, nullable). Se puebla cuando se registra el evento/documento "Auto — Decreta embargo".

Nueva tabla **`embargo_abonos`**: id, `expediente_id` (FK, not null), `monto` (numeric, not null, `check > 0`), `fecha` (date, not null), `registrado_por` (FK usuarios, not null), `created_at`. El saldo pendiente (`monto_embargo_decretado - suma de abonos`) es un cálculo derivado — **no lo guardes como columna**, calcúlalo en la consulta (vista o función SQL simple) para evitar que quede desincronizado si algún abono se corrige o elimina.

Cada abono insertado debe generar automáticamente (trigger, mismo criterio que 3.2) una fila en `eventos_expediente` con tipo `abono_embargo`.

---

## 4. RLS y Realtime

- `eventos_expediente` y `embargo_abonos` necesitan las mismas políticas que ya aplican a `documentos`/`expediente_fases` desde OT-02: Asistente ve solo lo de sus expedientes asignados, Juez y Administrador ven todo el despacho (filtrando por `despacho_id` vía el expediente), Analista de Datos solo lectura. `tipos_evento` es catálogo de solo lectura para cualquier autenticado.
- Extiende el trigger de "Broadcast from Database" (mismo patrón de la migración `20260709120001`) a `eventos_expediente` como mínimo — es la tabla de la que dependen las alertas nuevas del Panel del Juez ("movimientos sin trabajar", "edictos sin publicar") para actualizarse en tiempo real sin recargar la página. Evalúa si `expedientes` (por los cambios de `cerrado`/`monto_embargo_decretado`) también necesita emitir señal — probablemente sí, ya que hoy ya emite para otros cambios de estado.

---

## 5. Fuera de alcance explícito de esta ficha

- Ninguna pantalla, componente ni acción de servidor que el usuario vea directamente (formulario de registrar evento, timeline, tarjetas del dashboard) — eso es OT-04.
- No implementes todavía el catálogo de "Secuestro" ni el subtipo "Ejecutivo Hipotecario" (fuera de alcance también en OT-01/OT-02).
- No reintroduzcas la aproximación vieja de "resueltos = documentos confirmados" en ningún lugar nuevo — con `expedientes.cerrado` ya existe la fuente real; si ves ese patrón viejo en el dashboard actual, señálalo en tu reporte final pero no lo corrijas aquí (la pantalla del dashboard es OT-04, aunque el dato correcto ya lo dejas listo tú).

---

## 6. Riesgos y advertencias

- **No dupliques el concepto de "cierre" en dos lugares.** Si escribes la lógica de cierre tanto en un trigger de base de datos como en la acción de servidor que confirma el documento, van a poder desincronizarse (por ejemplo, si alguien confirma un documento directamente en Supabase Studio, el trigger de base de datos sí dispara pero la lógica de aplicación no correría). Un solo lugar de verdad: el trigger de base de datos descrito en 3.2.
- **Cuidado con la recursión de triggers.** El trigger de cierre en `documentos` inserta en `eventos_expediente` y actualiza `expedientes`; si `expedientes` también tiene triggers de auditoría o de broadcast, verifica que no se disparen en cadena de forma inesperada o duplicada (revisa qué triggers ya existen sobre `expedientes` antes de agregar el nuevo).
- **El `check` de `motivo_omision_umbral` de OT-02 y el nuevo evento `override_umbral_inactividad` deben ir de la mano**: cuando la aplicación active ese override (columna en `expedientes` de OT-02), debe también registrar el evento correspondiente aquí. Como esta ficha construye el catálogo de eventos y OT-02 ya construyó la columna, dejar este vínculo sin conectar sería un cabo suelto — decide si lo conectas tú aquí (recomendado, ya que el catálogo de eventos es tuyo en esta ficha) o lo dejas explícitamente anotado para OT-04.
- **No inventes valores para `tipo_cierre` o `estado_matrimonio` distintos de los ya confirmados** en OT-01 y en el mockup — si te parece que falta un estado intermedio para Matrimonio (por ejemplo algo antes de "Celebrado"), anótalo como pregunta en tu reporte final en vez de decidirlo tú.

---

## 7. Checklist de aceptación (lo que voy a verificar yo al terminar)

- [ ] `tipos_evento` sembrado con al menos los 11 códigos de la tabla de la sección 3.1, cada uno con su `tipo_proceso_id` correcto (o `null` si aplica a todos).
- [ ] `eventos_expediente` existe y permite registrar un evento manual y uno de sistema; "última actividad" se calcula sobre `created_at`, no sobre `fecha_evento` — verificable insertando un evento con `fecha_evento` en el pasado y confirmando que el contador de inactividad igual se resetea a partir de hoy.
- [ ] `expedientes.cerrado` y sus columnas asociadas existen; confirmar un documento con `culmina_proceso = true` cierra el expediente automáticamente y genera el evento `expediente_cerrado`; confirmar un documento con `culmina_proceso = false` **no** cierra nada.
- [ ] Actualizar `estado_matrimonio` a `celebrado` o `retirado` cierra el expediente sin exigir `motivo_cierre`; actualizarlo a cualquier otro valor no lo cierra.
- [ ] `embargo_abonos` permite registrar abonos; el saldo pendiente se calcula correctamente (no como columna almacenada) y cada abono genera su evento correspondiente.
- [ ] RLS de las 3 tablas nuevas (`tipos_evento`, `eventos_expediente`, `embargo_abonos`) verificada con las 4 cuentas de prueba — en particular que un Asistente no vea eventos de expedientes que no tiene asignados.
- [ ] Realtime extendido a `eventos_expediente` (y a `expedientes` si aplicaste el cambio sugerido en 4), verificado insertando un evento desde SQL directo y confirmando que llega una señal por el canal ya existente.
- [ ] `npm run build` y `npm run lint` pasan sin errores ni warnings nuevos.
- [ ] No se construyó ninguna pantalla ni componente de UI en esta ficha.

## 8. Al terminar

Repórtame igual que en OT-02: migraciones nuevas creadas, decisiones de diseño que tuviste que tomar dentro del margen que te dejé (por ejemplo el enum exacto de `estado_matrimonio` si tuviste que definir valores intermedios), cualquier cabo suelto que hayas dejado anotado en vez de decidir por tu cuenta (sección 6), y confirmación de que corriste el checklist de la sección 7. No empieces OT-04 sin que yo confirme que esta ficha quedó aceptada.
