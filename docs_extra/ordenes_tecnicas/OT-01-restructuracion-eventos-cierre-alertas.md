# OT-01 — Restructuración del modelo de datos: eventos, cierre por tipo de proceso y alertas en tiempo real

**Estado:** Decisiones confirmadas por el usuario. Lista para convertirse en fichas de trabajo ejecutables (ver sección 8).
**Autor:** Claude (líder técnico, solo lectura del código — no se modificó nada del proyecto para producir este documento).
**Fecha:** 23 de agosto de 2026.
**Basado en:** el comparativo con el Excel de seguimiento (`docs_extra/comparativo_gdc_vs_excel.md`), la propuesta visual publicada (`docs_extra/makups/diseño_actualizado/`), y una lectura completa de las 23 migraciones actuales de Supabase (`gdc/supabase/migrations/`) y del documento de requerimientos (`docs_extra/REQUERIMIENTOS_GDC.md`).

---

## 1. Por qué este documento existe

Las pantallas nuevas que diseñamos —Panel del Juez con semáforo de tiempos, registro de expedientes por tipo, actualización de eventos, y las reglas de cierre por tipo de proceso— no son solo una capa visual nueva sobre lo que ya existe. Piden información que la base de datos actual de GDC no guarda, y piden un comportamiento (un expediente que "se cierra" formalmente, con motivo) que el sistema hoy no modela en absoluto.

Antes de mandarle esto a un desarrollador, revisé las 23 migraciones ya aplicadas para entender exactamente qué hay construido, qué de eso sigue sirviendo tal cual, y qué parte de la lógica actual va a chocar o quedar contradicha por lo nuevo si no se ajusta a tiempo. Este documento es ese análisis, el plan de qué construir, y las decisiones que ya confirmaste para cerrarlo.

---

## 2. Lo que se mantiene sin tocar

Estas piezas del sistema actual no chocan con nada de lo nuevo y no hay motivo para tocarlas:

- **Usuarios y roles** (`usuarios`, el enum de 4 roles, RF-01 a RF-03): el modelo de roles Juez/Asistente/Analista/Administrador sigue siendo exactamente el mismo.
- **Ciclo de vida del documento en sí** (`documentos.estado`: generado → validado → en_corrección → confirmado): sigue siendo válido tal cual para el proceso de redacción y revisión de un documento individual. Lo nuevo se añade *encima* de esto, no lo reemplaza.
- **Catálogo de tipos de documento existente** (Proveído, Providencia, Auto, Sentencia, Oficio) y la distinción resolución judicial vs. comunicación: se mantiene sin agregar ningún tipo nuevo — ver la decisión 1 de la sección 6, que resuelve la adjudicación de bienes usando el tipo "Auto" que ya existe, no un tipo nuevo.
- **Auditoría técnica** (`auditoria`, los triggers de borrado): sigue siendo el registro de seguridad/cumplimiento. Es importante no confundirla con la tabla de "eventos de negocio" nueva que se propone en la sección 5 — son cosas distintas con propósitos distintos (ver sección 4.3).
- **Tope de cuantía y su validación** (`configuracion_sistema.tope_cuantia`, RF-34 a RF-36): se mantiene igual para expedientes que registran una cuantía única al inicio. Lo nuevo (abonos a un embargo) es una necesidad adicional, no un reemplazo.
- **RLS y las funciones helper** (`fn_usuario_rol`, `fn_usuario_id`, `fn_expediente_asignado`): el patrón se mantiene y se reutiliza para las tablas nuevas — no hay que reinventar el enfoque de permisos, solo extenderlo (ver sección 4.5).
- **Catálogo de subtipos de proceso limitado a Ejecutivo Simple**: no se agrega un subtipo "Hipotecario" por ahora (decisión 5, sección 6).

---

## 3. Lo que hay que modificar

### 3.1 `expedientes` necesita campos que hoy no existen

El Excel y las pantallas nuevas asumen datos que la tabla `expedientes` actual no tiene:

- `fisico_electronico`, `municipal_circuito`, `pretension` (motivo del trámite), `notas`.
- `despacho_id` — **se agrega ahora** (decisión 3, sección 6), no se pospone más.
- `fecha_registro`, editable por el Juez y distinta de `created_at` (que Postgres pone automáticamente y no se puede editar). `fecha_registro` empieza con el valor de `created_at` pero el Juez puede corregirla — es la que alimenta el semáforo del Panel del Juez.
- `omitir_umbral_inactividad` (booleano) + `motivo_omision_umbral` (texto, obligatorio cuando el booleano es verdadero) — ver 3.5.

### 3.2 `expediente_fases` no le sirve a 4 de los 6 tipos de proceso

El enum `fase_expediente` (`admision`, `notificacion_demanda`, `audiencia_preliminar`, `audiencia_fondo`) fue diseñado pensando solo en Declarativo. Las pantallas nuevas ya asumen fases que no existen ahí: "Cumplimiento de embargo" (Ejecución), "Edicto emplazatorio" y "Publicación" (Sucesión), y Matrimonio directamente no usa fases sino un campo de Estado (Celebrado/Retirado). Intentar forzar estas fases dentro del enum actual generaría un catálogo mezclado sin sentido para todos los tipos.

Para Ejecución específicamente: dentro de "Cumplimiento de embargo" puede eventualmente celebrarse un **remate** según el tipo de bien embargado (confirmado en la decisión 5) — esto sigue siendo parte del mismo proceso Ejecutivo Simple regulado por la Ley 402, no un tipo ni subtipo distinto. El catálogo de fases de Ejecución debe dejar espacio para un remate posterior a la fase de cumplimiento, sin que eso implique crear un subtipo "Hipotecario" separado.

### 3.3 `subtipos_proceso` solo trae parámetros de audiencia (Declarativo)

Sus columnas (`plazo_audiencia_min_dias`, etc.) son específicas del cálculo de audiencia preliminar/de fondo. Ejecución y Sucesión necesitan sus propios subtipos (Ejecutivo Simple; Sucesión Testada vs. Intestada) con parámetros completamente distintos (plazo de publicación del edicto, no plazo de audiencia). No conviene forzar esos datos en las mismas columnas. Matrimonio no necesita parametrización de plazos.

### 3.4 `documentos` necesita saber si un documento cierra el expediente

Hoy no existe ningún campo que diga "esta Sentencia/este Auto/este Acuerdo de Mediación pone fin al proceso". El Panel del Juez y la pantalla de Actualización de Eventos ya asumen ese toggle con motivo obligatorio. Esto también resuelve el cierre de Sucesión: la adjudicación de bienes es un **Auto** (decisión 1) que activa este mismo toggle, con su observación describiendo la adjudicación — no hace falta un tipo de documento nuevo para eso.

### 3.5 `configuracion_sistema` necesita el umbral de inactividad, con override por expediente

Confirmaste que el contador de "sin movimiento" es un solo valor (30 días) para todos los tipos, siguiendo el mismo patrón que ya usa `plazo_admision_dias`. Pero además pediste que un expediente puntual pueda **omitir** ese umbral — por ejemplo, un expediente legítimamente detenido en espera de un trámite externo que no depende del despacho. Eso no es una configuración global, es una excepción por expediente: por eso `omitir_umbral_inactividad` y `motivo_omision_umbral` viven en `expedientes` (ver 3.1), no en `configuracion_sistema`. El toggle debe ser visible y auditable — cada vez que se active, debe quedar registrado en `auditoria` y en la tabla de eventos, porque es una decisión que oculta una alerta del Juez y necesita quedar justificada.

### 3.6 El dashboard actual "inventa" un cierre que no existe

Vale la pena que lo sepas porque es la pieza más delicada de todas: el requerimiento RF-17 ya documentaba esta limitación honestamente — hoy, para saber cuántos expedientes se "resolvieron" en el mes, el sistema **aproxima** contando documentos confirmados, porque no existe ningún concepto real de "expediente cerrado". Con el modelo de cierre que estamos diseñando (Sentencia/Acuerdo de Mediación/Auto para Declarativo y Ejecución, el mismo Auto para la adjudicación de Sucesión, Estado para Matrimonio), esa aproximación deja de tener sentido y **debe reemplazarse** por el cierre real. Si el desarrollador no elimina esa lógica aproximada al construir lo nuevo, van a convivir dos nociones distintas de "expediente resuelto" que van a dar números distintos en distintas pantallas — eso confundiría al Juez, no lo ayudaría.

---

## 4. Lo que hay que desechar o evitar para no generar choques

Esto es lo más importante de este documento: no son solo cosas nuevas que agregar, son decisiones que si no se toman a propósito, van a generar contradicciones dentro del propio sistema.

**4.1 — No reutilizar el enum `fase_expediente` para las fases de los otros tipos.** Es tentador simplemente agregarle valores al enum existente (`cumplimiento_embargo`, `edicto_emplazatorio`, etc.), pero eso mezclaría en una sola lista fases que no tienen relación entre sí y que ningún expediente individual atraviesa todas. Lo correcto es que las fases sean un catálogo por tipo de proceso (igual que ya hicimos con `subtipos_proceso`), no un enum fijo de Postgres. Cambiar esto después de que haya datos reales cargados es mucho más costoso que decidirlo ahora.

**4.2 — No usar la tabla `audiencias` para nada que no sea una audiencia real.** Existe la tentación de reusar esa tabla para el plazo del "Edicto emplazatorio" de Sucesión, porque ambas son "una fecha límite calculada". Son conceptualmente distintas: una audiencia es una comparecencia en el despacho, un edicto es una publicación pública. Mezclarlas rompería el significado de la tabla y complicaría cualquier reporte futuro que cuente audiencias reales.

**4.3 — No confundir `auditoria` (seguridad) con los "eventos" de negocio nuevos.** `auditoria` existe para trazabilidad técnica/legal (quién cambió qué, cuándo) y ya está probada con triggers de borrado. Los "eventos" que pide la pantalla de Actualización de Eventos son otra cosa: son la fuente de verdad que alimenta las alertas del Juez en tiempo real (última actividad, notificación pendiente, etc.) y tienen que ser consultables y legibles para el usuario, no solo para una auditoría. Son propósitos distintos — mezclarlos en una sola tabla haría lenta y confusa cualquier consulta de alertas, que necesita correr rápido (RNF-05: menos de 2 segundos). Nota: cuando se active `omitir_umbral_inactividad` (3.5), ese cambio sí debe quedar en ambas — en `auditoria` por ser una acción administrativa sensible, y en la tabla de eventos porque también es parte de la historia legible del expediente.

**4.4 — No cerrar un expediente "silenciosamente" al confirmar cualquier Sentencia/Auto.** Hoy, conceptualmente, nada distingue un Auto que decreta un embargo (no cierra nada) de un Auto que adjudica bienes o pone fin al proceso (sí cierra) — ambos son solo "un Auto confirmado". El toggle con motivo obligatorio que diseñamos existe justamente para que esa decisión sea explícita y quede su razón registrada, nunca inferida automáticamente por tipo de documento.

**4.5 — No olvidar las políticas RLS de las tablas nuevas.** Supabase niega todo por defecto si una tabla tiene RLS activado y no tiene políticas — cualquier tabla nueva (eventos, abonos de embargo, fases por tipo) necesita sus propias políticas replicando la misma matriz de permisos (Juez ve todo el despacho, Asistente solo lo asignado, Analista solo lectura, Administrador todo). Ya pasó una vez en este proyecto (migración 017, "corrección de RLS") que una tabla quedó sin política de lectura y rompió una pantalla — vale la pena que el desarrollador lo tenga presente desde el diseño, no como corrección posterior. Con `despacho_id` agregándose ahora, las políticas también deben empezar a filtrar por despacho, no solo por rol.

**4.6 — Extender el Realtime a las tablas nuevas, no solo a `expedientes`/`documentos`.** El patrón de "Broadcast from Database" que ya se implementó (con la vuelta larga que costó, según RF-19) tiene que replicarse a la tabla de eventos nuevos; si no, las nuevas tarjetas del Panel del Juez ("movimientos sin trabajar", "edictos sin publicar") no se van a actualizar en tiempo real como promete el diseño — se van a quedar mostrando datos viejos hasta que alguien recargue la página.

---

## 5. Entidades de datos nuevas que hacen falta

Esto no es el diseño técnico final (eso lo define el desarrollador), sino la especificación funcional de qué necesita existir, para que la ficha de trabajo sea clara:

- **`despacho_id`** en `expedientes` y en cualquier tabla que hoy asuma un solo despacho — con su tabla `despachos` mínima (id, nombre, tipo Municipal/Circuito). Es el único punto de esta ficha que además toca RF-32 y las políticas RLS existentes, no solo tablas nuevas.
- **Fases por tipo de proceso** (catálogo, reemplaza el enum fijo): cada tipo de proceso tiene su propia lista ordenada de fases con nombre y, cuando aplique, un plazo asociado (ej. Sucesión: Presentación → Admisión → Edicto emplazatorio → Publicación → Adjudicación; Ejecución: Admisión → Notificación → Cumplimiento de embargo → [Remate, opcional según el bien] ).
- **Eventos de expediente**: registro cronológico y legible por el usuario de todo lo que le pasa a un expediente (notificación registrada, cambio de fase, observación actualizada, corrección de fecha de registro, documento generado, abono a embargo, publicación de edicto, activación del override de inactividad). Cada evento tiene un tipo, fecha, quién lo registró, un detalle libre, y sirve como ancla para "última actividad" (alimenta la alerta de 30 días sin movimiento).
- **Cierre de expediente**: información explícita de que un expediente terminó — tipo de cierre (Sentencia/Acuerdo de Mediación/Auto/Estado de matrimonio), fecha, motivo (obligatorio cuando corresponde), y quién lo cerró. Es lo que reemplaza la aproximación actual de "documentos confirmados" mencionada en 3.6. La adjudicación de bienes de Sucesión usa el tipo "Auto" (decisión 1), no un tipo de cierre nuevo.
- **Abonos a embargo**: para Ejecución en fase de cumplimiento — cada abono con monto y fecha, más el saldo restante calculado.
- **Campo "culmina el proceso" + "motivo de culminación"** en el evento de generación de un documento de cierre (Sentencia, Acuerdo de Mediación, Auto), tal como se ve en el mockup.
- **Tipo de documento nuevo: "Acuerdo de Mediación"** — no existe hoy en el catálogo de `tipos_documento` (que solo tiene Proveído/Providencia/Auto/Sentencia/Oficio).
- **Estado de Matrimonio** como campo propio del expediente (no como fase, no como documento) con los valores que correspondan, donde solo "Celebrado" y "Retirado" cierran el expediente.
- **Umbral de inactividad configurable** (`umbral_inactividad_dias`, 30 por defecto) en `configuracion_sistema`, igual patrón que `plazo_admision_dias`, más el override por expediente descrito en 3.5.

**Explícitamente fuera de alcance de esta ficha** (decisiones 2 y 5, sección 6): el catálogo de "Secuestro" como tipo de proceso, y un subtipo "Ejecutivo Hipotecario" separado.

---

## 6. Decisiones — confirmadas por el usuario

1. **Adjudicación de bienes (cierre de Sucesión):** es un documento asociado al tipo **Auto** ya existente en el catálogo, no un tipo de documento nuevo ni un evento sin documento. Usa el mismo toggle "culmina el proceso" + motivo obligatorio que el resto de los Autos de cierre.
2. **"Secuestro" como tipo de proceso:** se omite para este despacho por el momento. Sigue deshabilitado en el mockup (`docs_extra/makups/diseño_actualizado/nuevo_expediente_paso1_tipo/`) y fuera del alcance de esta ficha.
3. **`despacho_id`:** se agrega ahora, como parte de esta misma restructuración — no se pospone más como decía RF-32 hasta hoy.
4. **Umbral de inactividad:** 30 días para todos los tipos de proceso, con la opción de que un expediente puntual lo omita mediante un toggle que exige una observación obligatoria (ver 3.1, 3.5 y 4.3 para el detalle de auditoría de ese override).
5. **Ejecutivo Hipotecario:** se omite como subtipo separado para este despacho. El remate que puede celebrarse según el tipo de bien embargado sigue siendo parte del mismo proceso Ejecutivo Simple (Ley 402), no un tipo ni subtipo distinto — ver la nota de fases en 3.2.

---

## 7. Alcance de reescritura de RF y RNF

**Se reescriben o amplían:**
- Módulo 2 (Expedientes y Procesos): nuevos campos (incluido `despacho_id` y `fecha_registro` editable), fases por tipo en vez de enum fijo, override de umbral de inactividad.
- Módulo 3 (Documentos): toggle de culminación + motivo, tipo de documento nuevo "Acuerdo de Mediación".
- Módulo 4 (Dashboard del Juez): reemplazar RF-17/RF-18 (que hoy aproximan) por las métricas reales del semáforo, movimientos sin trabajar (respetando el override por expediente), pendientes de notificar y edictos sin publicar.
- Módulo 5 (Calendario y Plazos): separar explícitamente "plazos de audiencia" (Declarativo, ya existente) de los nuevos plazos de edicto/publicación (Sucesión) y de la fase de cumplimiento/remate (Ejecución), que no son audiencias.
- RF-32 (preparación multi-tenant): pasa de "preparado pero pospuesto" a "implementado" — se agrega `despacho_id` de verdad, ya no es solo diseño que lo permite.

**Se agregan como módulos nuevos:**
- Módulo 10 — Eventos y Trazabilidad de Negocio.
- Módulo 11 — Cierre de Expedientes por Tipo de Proceso.
- Módulo 12 — Alertas por Tiempo en el Sistema (semáforo y umbral de inactividad con override).

**Se mantienen sin cambios:** Módulo 1 (Usuarios), Módulo 6 (KPIs — con una nota de que en el futuro podría sumar "evento" como entidad base), Módulo 8 (Montos y Cuantía — se mantiene, se le suma la lógica de abonos a embargo como extensión), Módulo 9 (No integración con el Órgano Judicial). Módulo 7 (Administración) se amplía solo con el campo de umbral de inactividad, sin reescribirse por completo.

---

## 8. Cómo sigue esto

Con las 5 decisiones ya confirmadas, el siguiente paso es convertir este documento en fichas técnicas ejecutables (formato ya acordado: qué se pide, archivos/tablas afectadas, riesgos, criterios de aceptación) para pasarle a otra sesión de Claude Code. Por el tamaño del cambio, propongo dividirlo en tres fichas, en este orden de dependencia:

- **OT-02 — Modelo de datos base:** `despacho_id`, fases por tipo de proceso (reemplazo del enum), campos nuevos de `expedientes`, umbral de inactividad y su override, tipo de documento "Acuerdo de Mediación", toggle de culminación en `documentos`. Es la base de la que dependen las otras dos.
- **OT-03 — Eventos, cierre y abonos de embargo:** la tabla de eventos de negocio, el modelo de cierre de expediente, y los abonos a embargo — depende de que OT-02 esté aplicada.
- **OT-04 — Pantallas y alertas en tiempo real:** construir las pantallas del mockup sobre el modelo ya creado, más el Realtime extendido a las tablas nuevas — depende de OT-02 y OT-03.

¿Preparo ya el contenido detallado de OT-02, o prefieres revisar primero este documento completo una vez más antes de que empecemos a redactar fichas ejecutables?
