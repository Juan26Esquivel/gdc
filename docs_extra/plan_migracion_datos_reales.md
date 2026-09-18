# Plan de migración: datos reales del despacho → GDC

**Fecha del análisis:** 18 de septiembre de 2026
**Fuente 1 (origen):** `docs_extra/base_formato_xlxs/MUNICIPAL SEGUNDO CIVIL-Seguimiento de procesos.xlsx`
**Fuente 2 (destino):** Supabase de producción del proyecto GDC (verificado en vivo, con consulta de solo lectura, el 18 de septiembre de 2026)
**Precede a este documento:** `docs_extra/comparativo_gdc_vs_excel.md` (23 de agosto de 2026) — varias de las brechas que ese documento señalaba ya se cerraron con las fichas OT-01 a OT-04 y el trabajo posterior (embargo, mandamiento de pago, audiencia especial, estado del proceso). Este documento reemplaza esas conclusiones con el estado real de hoy.

Este documento es **solo el plan**. No se ha escrito ni ejecutado ninguna migración de datos todavía — hay decisiones de producto (sección 4) que necesito que confirmes antes de tocar la base de datos real, tal como indica el `CLAUDE.md` del proyecto para cambios de datos en producción.

---

## 1. Qué hay en el Excel (verificado fila por fila)

El archivo tiene 6 pestañas. La mayoría de las filas son plantilla vacía; estas son las filas con datos reales:

| Pestaña | Filas reales | Tipo de proceso GDC |
|---|---|---|
| PROCESOS ORDINARIOS | 3 | Declarativo → Ordinario |
| PROCESOS SUMARIOS | 10 | Declarativo → Sumario |
| PROCESOS EJECUTIVOS | 58 | Ejecución (sin subtipo cargado) |
| PROCESOS SUCESIONES | 47 | Jurisdicción voluntaria (sin subtipo cargado) |
| MATRIMONIOS | 8 | Matrimonio |
| SECUESTRO | 0 (solo encabezados) | No aplica — nada que migrar |

**Total: 126 expedientes reales.** Todos son "Electrónico", "Municipal", despacho "SEGUNDO MUNICIPAL" — coincide exactamente con el único despacho ya sembrado en la base (`Segundo Municipal Civil`, id `8ae21946-...`).

**Estado real de Supabase hoy (verificado en vivo, no supuesto):** 6 expedientes de prueba, 0 filas en `eventos_expediente` y `embargo_abonos`, 13 en `expediente_fases`, 4 audiencias, 7 documentos. Confirma lo que dijiste: es basura de prueba, segura de reemplazar.

**Un hallazgo que requiere tu revisión antes de nada:** el expediente `1245092026` aparece **tanto en la pestaña Ejecutivos como en Matrimonios**. `numero_expediente` tiene una restricción `unique` en la base — no se puede insertar dos veces. Es casi seguro un error de tecleo en el Excel (dos casos distintos con el mismo número), pero no puedo saber cuál es el correcto sin que alguien lo confirme contra el expediente físico/electrónico real.

---

## 2. Mapeo campo a campo

### Comunes a todas las pestañas

| Columna Excel | Destino GDC | Notas |
|---|---|---|
| Número de expediente | `expedientes.numero_expediente` | Único — ver el duplicado de la sección 1 |
| Físico o Electrónico | `expedientes.fisico_electronico` | "Electrónico" → `electronico` (único valor real presente) |
| Tipo de proceso | `expedientes.tipo_proceso_id` (+ `subtipo_proceso_id` cuando aplica) | Ver sección 3 |
| DESPACHO DEL JUEZ | `expedientes.despacho_id` | Siempre el único despacho ya sembrado |
| MUNICIPAL o CIRCUITO | `expedientes.municipal_circuito` | "MUNICIPAL" → `municipal` (único valor real presente) |
| OBSERVACIÓN | Ver sección 4, punto C | No hay una sola columna equivalente; depende del valor |
| Archivo / Estado Agenda | `expedientes.notas` (texto libre, concatenado) | No existe columna equivalente hoy; ver sección 4, punto F |
| Notas | `expedientes.notas` | Se concatena junto con Archivo/Estado Agenda si ambos existen |

### PROCESOS ORDINARIOS / SUMARIOS (Declarativo)

| Columna Excel | Destino GDC |
|---|---|
| Pretensión | `expedientes.pretension` (texto libre, coincide con el propósito de la columna) |
| Fecha de presentación (solo Sumarios) | Ver sección 4, punto D |
| Fecha de admisión | `expediente_fases` (fase "Admisión", `fecha_inicio`) |
| Fecha de notificación de la parte demandada | `expedientes.fecha_notificacion_demanda` si es fecha real; si es texto ("ENVIADA 11/8", "EMPLAZADO") ver sección 4, punto E |
| Fecha de audiencia preliminar / de fondo | `audiencias` (tipo `preliminar`/`fondo`, `fecha_programada`) — solo si hay fecha real |

### PROCESOS EJECUTIVOS (Ejecución)

| Columna Excel | Destino GDC |
|---|---|
| MONTO DE MANDAMIENTO DE PAGO | `expedientes.monto_embargo_decretado` + evento `mandamiento_pago_librado` | 2 de 58 montos reales **superan el tope de cuantía de B/.10,000** (10,064.96 y 10,903.57) — el tope hoy solo se valida a nivel de aplicación, no en la base, así que la migración por SQL no se bloquea, pero avísote para que sepas que esos 2 casos quedarán marcados si luego se edita el monto desde la interfaz sin marcar `es_lanzamiento` |
| Fecha de presentación | Ver sección 4, punto D |
| Fecha de admisión | `expediente_fases` (fase "Admisión") |
| Fecha de notificación de la parte demandada | Igual que Declarativo — mixto fecha/texto, ver sección 4 punto E |
| Fecha de decretado el embargo | Evento `embargo_decretado` (fecha = esta fecha) |
| Fecha de Edicto Emplazatorio | Ver sección 4, punto G — el tipo de evento existente para edictos está reservado hoy solo a Jurisdicción voluntaria |

### PROCESOS SUCESIONES (Jurisdicción voluntaria)

| Columna Excel | Destino GDC |
|---|---|
| Tipo de sucesión (Testada/Intestada) | Ver sección 4, punto H — hoy no hay subtipos cargados para este tipo de proceso |
| Fecha de presentación / admisión | Igual patrón que arriba |
| FECHA DE EDICTO EMPLAZAT. | Evento `edicto_emplazatorio_emitido` (aquí sí coincide exactamente con el tipo de proceso al que está restringido el catálogo) |
| TIPOS DE BIENES | Sin datos reales en ninguna de las 47 filas — nada que migrar |

### MATRIMONIOS

| Columna Excel | Destino GDC |
|---|---|
| ESTATUS | `expedientes.estado_matrimonio`: "REALIZADO" → `celebrado` (cierra el expediente automáticamente vía trigger, correcto porque ya ocurrió en la realidad); "PENDIENTE DE CELEBRAR" → `en_tramite` |
| Ubicación (Dentro/Fuera) | Ver sección 4, punto F — no existe columna; propuesto: `notas` |

---

## 3. Subtipo y fases por tipo de proceso

- **Declarativo** (Ordinario/Sumario): ya tiene subtipo cargado — se usa directo.
- **Ejecución**: no tiene subtipo cargado (solo Declarativo lo tiene hoy). `subtipo_proceso_id` queda en `null` para estos 58 expedientes — es válido, la columna es nullable, y los plazos propios de Ejecución (excepción, embargo) viven en `configuracion_sistema`, no en `subtipos_proceso`.
- **Jurisdicción voluntaria**: mismo caso — sin subtipo cargado, `subtipo_proceso_id` en `null`, salvo que decidas cargar Testada/Intestada como subtipos ahora (sección 4, punto H).
- **Matrimonio**: no participa del catálogo de fases (decisión ya tomada en OT-02) — se cierra por `estado_matrimonio`, no por fase.

---

## 4. Decisiones — **todas resueltas el 18 de septiembre de 2026**

Todas las decisiones de esta sección ya fueron confirmadas. El SQL final vive en
`gdc/supabase/migrations/20260918090001_migracion_datos_reales_excel.sql` y aplica
exactamente lo que se resolvió aquí:

- **A** → se conserva `1245092026` en Ejecutivos, se excluye de Matrimonios.
- **B** → los casos "NO PRESENTADA" se migran igual, con nota explícita.
- **C** → observación libre va a `notas` + evento de bitácora (`observacion_actualizada`); "DESISTIDO" usa `estado_proceso`.
- **D** → `fecha_registro` = presentación, si no hay, admisión, si no hay, fecha de la migración con nota.
- **E** (criterio adoptado, no bloqueante) → fecha real limpia → columna; texto libre → `notas` + evento `notificacion_registrada`.
- **F** (criterio adoptado, no bloqueante) → Archivo/Estado Agenda/Ubicación preservados en `notas`.
- **G** (criterio adoptado, no bloqueante) → el evento de edicto se registra igual para Ejecutivos, aunque el catálogo lo define hoy solo para Jurisdicción Voluntaria.
- **H** → se cargan los subtipos "Testada" e "Intestada" bajo Jurisdicción Voluntaria.
- **I** → `created_by` = Leonardo Gomez.

Quedan documentadas abajo tal como se plantearon originalmente, para trazabilidad.

**A. El expediente duplicado `1245092026`** (Ejecutivos y Matrimonios) — ¿cuál es el caso real? Mientras no lo confirmes, ese expediente queda fuera de la migración (no de los otros 125).

**B. Filas con OBSERVACIÓN = "NO PRESENTADA" / "NO PRESENTADA LA DEMANDA"** (5 casos: 2 en Ordinarios, 1 en Ejecutivos, y varios en Sucesiones bajo "NO PRESENTADA") — son números de expediente asignados en el libro del despacho, pero la demanda nunca se presentó formalmente. ¿Se migran igual como expedientes (con `estado_proceso` quizás en un valor nuevo que hoy no existe en el catálogo, ya que "no presentada" no es lo mismo que "desistido"), o se excluyen de esta migración por no ser casos reales todavía?

**C. El resto de valores de OBSERVACIÓN** (p. ej. "PENDIENTE NOTIFICAR", "CUMPLIENDO EMBARGO", "POR NOTIFICAR", "DECRETAR EMBARGO", "ESPERANDO PUBLICACIONES") no tienen una columna equivalente de "estado libre" en GDC — son más bien anotaciones de trabajo en curso. Propongo: guardar el texto tal cual en `notas` (nada se pierde) y, además, crear un registro en `eventos_expediente` con el tipo `observacion_actualizada` y ese texto como `detalle`, fechado en la fecha de registro del expediente — así queda en la bitácora de eventos del expediente, visible en la pestaña de Eventos. **Excepción:** "DESISTIDO" sí tiene equivalente exacto: `estado_proceso = 'desistido'` (cierra el expediente automáticamente, correcto). ¿Apruebas este criterio?

**D. Qué fecha alimenta `fecha_registro`** (el campo que mueve el semáforo de tiempo del Panel del Juez): para Sumarios, Ejecutivos y Sucesiones existe "Fecha de presentación"; para Ordinarios no existe esa columna (solo hay Fecha de admisión, casi siempre vacía en los 3 casos reales). Propongo: usar Fecha de presentación cuando exista; si no, Fecha de admisión; si tampoco, la fecha de hoy con una nota explícita de que se desconoce la fecha real. Esto es importante porque estos son casos de meses de antigüedad — si se usa la fecha de hoy por defecto, el semáforo los mostraría como "recién ingresados" cuando no lo son. ¿Confirmas ese orden de prioridad?

**E. La columna "Fecha de notificación de la parte demandada" mezcla fechas reales con texto libre** ("ENVIADA 11/8", "EMPLAZADO", "NEGATIVA 19-8", "PENDIENTE"). Propongo: fecha real y limpia → `expedientes.fecha_notificacion_demanda`; cualquier otro valor → se preserva tal cual en `notas` y como evento `notificacion_registrada`, y la columna queda en `null` (no se inventa una fecha). ¿Confirmas?

**F. "Archivo", "Estado Agenda" (Declarativo/Ejecutivos) y "Ubicación" (Matrimonios)** no tienen columna propia en GDC hoy. Propongo guardarlas como texto dentro de `notas` en vez de proponer columnas nuevas (eso sería alcance de una ficha OT nueva, no de esta migración de datos). ¿De acuerdo, o prefieres que levante esa necesidad como columnas reales antes de migrar?

**G. Ejecutivos con "Fecha de Edicto Emplazatorio"** (6 de 58 casos): el tipo de evento `edicto_emplazatorio_emitido` está reservado hoy solo a Jurisdicción voluntaria (`tipo_proceso_id` en el catálogo). Puedo registrar el evento igual (la base no lo impide), pero probablemente no aparezca en la tarjeta "Edictos sin publicar" del Panel del Juez si esa tarjeta filtra por tipo de proceso. ¿Prefieres que lo registre igual y luego revisemos esa tarjeta, o que te avise caso por caso para decidir?

**H. Subtipos de Sucesión (Testada/Intestada)**: hoy no hay ningún subtipo cargado para "Jurisdicción voluntaria". ¿Cargo 2 filas nuevas en `subtipos_proceso` (Testada e Intestada) para poder clasificar los 47 casos con ese detalle, o prefieres dejarlo fuera de esta migración (subtipo en `null` para todos) y resolverlo como una ficha aparte?

**I. `created_by` de los expedientes migrados**: la tabla exige un usuario responsable. Hay usuarios de prueba (`Juez de Prueba`, `Administrador de Prueba`, etc.) mezclados con cuentas reales (`Leonardo Gomez`, `Juez`, `asistente`). ¿Qué cuenta real debo usar como `created_by` para los 125 expedientes migrados?

---

## 5. Enfoque de migración propuesto (una vez resueltas las decisiones de arriba)

1. **Respaldo primero**: exportar los 6 expedientes de prueba actuales (y sus filas relacionadas) a un archivo antes de borrarlos — por si acaso, aunque confirmaste que son descartables.
2. Migración dentro de una sola transacción SQL (`begin`/`commit`), para que si algo falla a mitad de camino no quede la base en un estado intermedio.
3. Orden de inserción: `expedientes` → `expediente_fases` (solo donde haya fecha real) → `audiencias` (solo donde haya fecha real) → `eventos_expediente` → `embargo_abonos` (no aplica aquí, no hay abonos históricos en el Excel).
4. Verificación posterior: conteo de filas migradas vs. 125 (o 126 si se resuelve el duplicado) filas reales del Excel, y una revisión visual tuya en la aplicación de una muestra de casos de cada pestaña.
5. Nada se ejecuta contra producción hasta que confirmes las secciones 4.A a 4.I.

---

## 6. Nada se ha tocado todavía

No escribí ni ejecuté ninguna sentencia SQL de migración — este documento es el análisis y el plan. Las consultas que hice contra Supabase fueron todas de solo lectura (conteos y catálogos), tal como exige el `CLAUDE.md` del proyecto antes de diseñar un cambio de datos sin entorno local de ensayo.
