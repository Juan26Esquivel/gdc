# OT-02 — Modelo de datos base: despachos, fases por tipo de proceso, campos nuevos de expediente y umbral de inactividad

**Para:** sesión de Claude Code con acceso de escritura al repositorio `gdc/` y a las migraciones de Supabase.
**De:** líder técnico del proyecto (sesión de supervisión, sin acceso de escritura al código).
**Depende de:** `docs_extra/ordenes_tecnicas/OT-01-restructuracion-eventos-cierre-alertas.md` — léelo primero completo, ahí está el porqué de cada decisión de esta ficha.
**Esta ficha NO incluye:** la tabla de eventos de negocio, el modelo de cierre de expediente, ni los abonos a embargo (eso es OT-03, que depende de esta), ni las pantallas nuevas (OT-04, que depende de OT-02 y OT-03). No construyas nada de eso todavía aunque lo veas mencionado en OT-01 — esta ficha es solo la base de datos.

---

## 1. Objetivo

Dejar el modelo de datos de GDC listo para soportar: múltiples despachos, fases de expediente propias por tipo de proceso (en vez del enum fijo actual que solo sirve para Declarativo), los campos de expediente que usa el Excel real del despacho y que hoy no existen, el umbral de inactividad de 30 días con override por expediente, y la marca de "este documento culmina el proceso" en `documentos`.

Al terminar esta ficha, el modelo debe soportar registrar un expediente completo de cualquiera de los 5 tipos habilitados (Declarativo Ordinario, Declarativo Sumario, Ejecución, Jurisdicción voluntaria, Matrimonio — Secuestro sigue fuera de alcance, decisión 2 de OT-01) con todos sus campos, aunque las pantallas para hacerlo desde la UI todavía no existan (eso es OT-04). Verificar con inserts directos vía SQL o Supabase Studio es válido para esta ficha.

---

## 2. Contexto que debes leer antes de tocar nada

- `docs_extra/ordenes_tecnicas/OT-01-restructuracion-eventos-cierre-alertas.md` completo.
- `docs_extra/comparativo_gdc_vs_excel.md`, para entender de dónde salen los campos nuevos.
- Las migraciones actuales relevantes: `20260708100002_tipos_proceso.sql`, `20260708100004_expedientes.sql`, `20260708100005_expediente_fases.sql`, `20260708100007_documentos.sql`, `20260708100012_configuracion_sistema.sql`, `20260709090001_rls_funciones_helper.sql`, `20260709090002_rls_politicas.sql`.
- `gdc/src/lib/fases.ts`, `gdc/src/lib/catalogos.ts`, `gdc/src/lib/supabase/database.types.ts` — código de aplicación que hoy asume el enum `fase_expediente` y el modelo actual de `expedientes`. Vas a tener que actualizarlo para que compile contra el modelo nuevo, aunque las pantallas que lo usan de verdad (el flujo de registro por tipo) se construyan recién en OT-04.

---

## 3. Cambios de modelo de datos requeridos

### 3.1 Tabla `despachos` + `despacho_id`

Nueva tabla `despachos`: id, nombre (ej. "Segundo Municipal Civil"), tipo (Municipal | Circuito), activo, timestamps. Sembrar una sola fila para el despacho actual ("Segundo Municipal Civil", Municipal) — es el único despacho real hoy, pero la tabla debe existir desde ya para que el resto del modelo no vuelva a asumir un único despacho implícito.

`despacho_id` (FK a `despachos`, `not null`) se agrega en:
- `expedientes` — cada expediente pertenece a un despacho.
- `usuarios` — cada usuario (Juez, Asistente, Analista, Administrador) pertenece a un despacho. Sin esto, `despacho_id` en `expedientes` es solo decorativo: para que las políticas RLS puedan filtrar "solo lo de mi despacho" (ver 4), el sistema necesita saber a qué despacho pertenece quien está consultando. Sembrar todos los usuarios de prueba existentes con el despacho único creado arriba.

No agregues `despacho_id` a tablas que ya cuelgan de `expedientes` por FK (`expediente_fases`, `asignaciones`, `documentos`, `audiencias`) — se infiere siempre a través de `expediente_id`, agregarlo ahí sería redundante y una fuente de inconsistencia si algún día no coincidieran.

### 3.2 Reemplazo del enum `fase_expediente` por un catálogo `fases_proceso`

Esto es el cambio más delicado de la ficha (ver advertencias en la sección 6).

Nueva tabla `fases_proceso` (catálogo, mismo espíritu que `subtipos_proceso`): id, `tipo_proceso_id` (FK), `nombre`, `orden` (entero, define la secuencia), `es_fase_inicial` (booleano), timestamps. Ejemplo de filas a sembrar:

- Declarativo (Ordinario y Sumario comparten fases, ya que hoy el enum era único para ambos): Admisión (1) → Notificación de la demanda (2) → Audiencia preliminar (3) → Audiencia de fondo (4).
- Ejecución: Admisión (1) → Notificación (2) → Cumplimiento de embargo (3) → Remate (4, opcional — no todo expediente la atraviesa, ver nota abajo).
- Jurisdicción voluntaria (Sucesión): Presentación (1) → Admisión (2) → Edicto emplazatorio (3) → Publicación (4) → Adjudicación (5).
- Matrimonio: no participa de este catálogo. Su seguimiento es por el campo de Estado descrito en OT-01 (Celebrado/Retirado/otros), no por fases — no siembres filas de `fases_proceso` para Matrimonio.

Sobre "Remate" en Ejecución: por la decisión 5 de OT-01, no es un tipo ni subtipo distinto, es una fase más del mismo Ejecutivo Simple que solo aplica según el tipo de bien embargado. Modélala como una fase más en el catálogo, no le agregues lógica especial de "condicional" en el modelo — la decisión de si un expediente concreto pasa por Remate o no es una decisión de negocio de cada caso, no una regla del catálogo.

`expediente_fases` cambia su columna `fase` (hoy `fase_expediente` enum) por `fase_id` (FK a `fases_proceso`). Mantén el resto de la tabla igual (`fecha_inicio`, `fecha_fin`, `observaciones`) — ese patrón de historial ya funciona bien y no hay que rediseñarlo.

**Migración de datos existentes:** los expedientes Declarativo que ya tengan filas en `expediente_fases` con el enum viejo deben remapearse a los `fase_id` correspondientes del nuevo catálogo (mismo orden, mismo significado) — no se pierden datos, solo cambia la referencia. Escribe esa migración de datos explícitamente, no asumas que la tabla está vacía.

### 3.3 Campos nuevos en `expedientes`

Agregar:
- `fisico_electronico` (enum o texto corto: 'fisico' | 'electronico')
- `municipal_circuito` (enum o texto corto: 'municipal' | 'circuito')
- `pretension` (texto, nullable — no todos los tipos lo usan igual, ver Excel)
- `notas` (texto, nullable)
- `fecha_registro` (date, not null). Al migrar, poblar con la fecha de `created_at` de cada expediente existente. A partir de esta migración, el Juez puede editarla desde la aplicación (eso es UI, corresponde a OT-04) — aquí solo debe existir la columna y quedar clara en un comentario de la migración que es la fecha que alimenta el semáforo del Panel del Juez (OT-01, sección 3.1), nunca `created_at`.
- `omitir_umbral_inactividad` (booleano, not null, default false)
- `motivo_omision_umbral` (texto, nullable). Agrega un `check` a nivel de base de datos que obligue a que este campo no sea nulo/vacío cuando `omitir_umbral_inactividad = true` — no dependas solo de la validación de la aplicación para esta regla, ya que es exactamente el tipo de regla que conviene reforzar en la base de datos (ver `check` similar en `configuracion_sistema.modo_validacion_cuantia`).
- `despacho_id` (ver 3.1)

### 3.4 `configuracion_sistema`

Agregar `umbral_inactividad_dias` (int, not null, default 30) — mismo patrón que `plazo_admision_dias`.

### 3.5 `documentos`

Agregar:
- `culmina_proceso` (booleano, not null, default false)
- `motivo_culminacion` (texto, nullable, con el mismo tipo de `check` que 3.3: obligatorio si `culmina_proceso = true`)

No agregues todavía la lógica de "esto cierra el expediente" (eso es el modelo de cierre de OT-03) — esta ficha solo dispone el campo en `documentos`. OT-03 es quien decide qué pasa en el resto del sistema cuando `culmina_proceso` se marca en verdadero.

### 3.6 `tipos_documento`

Sembrar una fila nueva: **Acuerdo de Mediación**, categoría `resolucion_judicial`, `requiere_motivacion = true` (mismo criterio que Sentencia y Auto, ya que también resuelve el fondo de un proceso Declarativo). Base legal: revisa si la Ley 402 lo regula explícitamente antes de sembrar un valor en `base_legal` — si no encuentras el artículo exacto, dejalo como `null` o anota `[VERIFICAR]` en vez de inventar una cita, siguiendo la misma disciplina que ya usa el resto del seed (ver ejemplos de `[VERIFICAR ARTÍCULO EXACTO]` en `seed.sql`).

---

## 4. RLS — qué hay que revisar o crear

- Nueva función helper `fn_usuario_despacho()` (mismo patrón que `fn_usuario_rol()`/`fn_usuario_id()`, `security definer`), que devuelve el `despacho_id` del usuario autenticado.
- Todas las políticas existentes sobre `expedientes`, `documentos`, `audiencias`, `expediente_fases`, `asignaciones` que hoy filtran solo por rol deben sumar el filtro `despacho_id = fn_usuario_despacho()` (a través del expediente correspondiente cuando la tabla no tiene la columna directamente). Repasa una por una las políticas de `20260709090002_rls_politicas.sql` y las agregadas en `20260709130001_kpis_config_completo.sql` — no asumas que son solo dos o tres, verifica el archivo completo.
- `fases_proceso` y `despachos` son catálogos de solo lectura para cualquier usuario autenticado (mismo criterio que `tipos_proceso`/`subtipos_proceso`/`tipos_documento` hoy).
- No toques ni relajes ninguna política existente para "hacer que funcione más rápido" — si una política nueva no compila o genera recursión, resuélvelo con el mismo patrón `security definer` ya usado, no desactivando RLS temporalmente sin autorización (recuerda la regla de este proyecto sobre RLS: cualquier desactivación temporal para diagnosticar requiere autorización explícita puntual y reversión inmediata en el mismo turno).

---

## 5. Código de aplicación que vas a necesitar tocar para que el proyecto siga compilando

Esta ficha es de modelo de datos, pero un cambio de este tamaño no puede dejar el build roto. Como mínimo:

- Regenerar `gdc/src/lib/supabase/database.types.ts` contra el esquema nuevo.
- `gdc/src/lib/fases.ts` — hoy seguramente tipa contra el enum `fase_expediente`; debe adaptarse a que las fases ahora vienen de una tabla/catálogo.
- `gdc/src/lib/catalogos.ts` y cualquier lugar que lea `tipos_proceso`/`subtipos_proceso` — revisa si asumen que todo expediente tiene fases de audiencia (ya no es cierto para Sucesión/Matrimonio).
- `gdc/src/app/(app)/expedientes/actions.ts` y `nuevo-expediente-dialog.tsx` — el formulario actual de creación de expediente no tiene los campos nuevos ni el flujo de selección de tipo primero (eso se construye en OT-04), pero **no debe romperse**: como mínimo, que compile y siga registrando expedientes Declarativo (los únicos con datos reales de prueba hoy) sin los campos nuevos como obligatorios todavía. No es tu trabajo en esta ficha construir el formulario multi-paso del mockup.
- `gdc/src/app/(app)/administracion/configuracion-form.tsx` — agrega el campo `umbral_inactividad_dias` al formulario de configuración general existente (ya edita `tope_cuantia`, `modo_validacion_cuantia`, `plazo_admision_dias`; es el mismo patrón, un campo más).

---

## 6. Riesgos y advertencias

- **Esto es un cambio disruptivo del esquema, no aditivo puro.** Cambiar `expediente_fases.fase` de enum a FK rompe cualquier consulta o componente que hoy compare contra los valores del enum directamente (ej. `fase === 'admision'`). Búscalos todos antes de dar por terminada la ficha — no confíes solo en que `npm run build` pase; revisa también los archivos de `app/(app)/dashboard/` y `app/(app)/calendario/`, que probablemente comparan contra esos valores para las tarjetas de "pendientes de admisión" y el cálculo de plazos.
- **Prueba con las 4 cuentas de prueba ya existentes** (Administrador, Juez, Asistente, Analista) después de aplicar las migraciones — en particular que el login y la carga del dashboard sigan funcionando, porque cualquier política RLS mal escrita rompe silenciosamente esas pantallas sin lanzar un error visible al usuario.
- **No inventes artículos de la Ley 402** para "Acuerdo de Mediación" si no los tienes — sigue la disciplina ya establecida en este proyecto de marcar `[VERIFICAR]` en vez de una cita falsa.
- **No implementes todavía nada de OT-03 ni OT-04** aunque parezca fácil aprovechar el momento — mantener las fichas separadas nos deja puntos de verificación claros entre cada una.

---

## 7. Checklist de aceptación (lo que voy a verificar yo al terminar)

- [ ] `despachos` existe, con una fila sembrada; `despacho_id` presente y `not null` en `expedientes` y `usuarios`, con datos existentes migrados al despacho único.
- [ ] `fases_proceso` existe con las fases correctas de Declarativo, Ejecución y Jurisdicción voluntaria (Matrimonio sin filas, según lo indicado en 3.2); `expediente_fases.fase_id` reemplaza al enum, con los datos existentes remapeados sin pérdida.
- [ ] `expedientes` tiene los 7 campos nuevos de la sección 3.3, incluido el `check` que exige `motivo_omision_umbral` cuando `omitir_umbral_inactividad = true`.
- [ ] `configuracion_sistema.umbral_inactividad_dias` existe, default 30, editable desde el formulario de Administración.
- [ ] `documentos.culmina_proceso` y `motivo_culminacion` existen, con el mismo tipo de `check`.
- [ ] `tipos_documento` incluye "Acuerdo de Mediación" correctamente clasificado.
- [ ] Todas las políticas RLS relevantes filtran por despacho además de por rol; ninguna tabla nueva quedó sin políticas (verificable con `pg_policies`, como ya se hizo en la migración 017 original).
- [ ] `npm run build` y `npm run lint` pasan sin errores ni warnings nuevos.
- [ ] Login y navegación básica funcionan con las 4 cuentas de prueba tras aplicar las migraciones.
- [ ] No se tocó nada de eventos, cierre de expediente, abonos de embargo, ni pantallas nuevas — eso queda para OT-03 y OT-04.

## 8. Al terminar

Repórtame, en lenguaje simple: qué migraciones nuevas se crearon (nombres de archivo), qué archivos de código se tocaron y por qué, cualquier decisión de diseño que hayas tenido que tomar dentro de esta ficha (por ejemplo el tipo exacto elegido para `fisico_electronico`), y confirma que corriste el checklist de la sección 7 tú mismo antes de avisarme. Yo voy a revisar el resultado (migraciones, RLS, que el build pase) antes de dar por buena la ficha — no voy a tocar el código, solo a auditarlo.
