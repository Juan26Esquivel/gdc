# Comparativo: GDC vs. cuadro Excel "MUNICIPAL SEGUNDO CIVIL — Seguimiento de procesos"

**Fecha del análisis:** 23 de agosto de 2026
**Fuente 1 (sistema):** código y documentación del proyecto GDC (`docs_extra/REQUERIMIENTOS_GDC.md`, migraciones SQL en `gdc/supabase/migrations/`)
**Fuente 2 (proceso actual):** `docs_extra/base_formato_xlxs/MUNICIPAL SEGUNDO CIVIL-Seguimiento de procesos.xlsx`

---

## 1. Qué es cada uno

El Excel es la herramienta que el Juzgado Segundo Municipal Civil usa **hoy** para llevar el control de sus expedientes: seis pestañas, una por tipo de trámite, donde alguien anota manualmente fechas, montos y notas de estado a medida que el expediente avanza.

GDC es el sistema que se está construyendo para reemplazar ese control manual con una base de datos real (Supabase/PostgreSQL), con roles de usuario, validaciones automáticas, generación de documentos y un panel de control para el Juez.

La pregunta de fondo de este comparativo es: **¿todo lo que hoy se anota a mano en el Excel tiene dónde registrarse en GDC?** La respuesta corta es: en su mayoría sí, pero hay campos y hasta un tipo de proceso completo que el Excel usa activamente y que GDC todavía no contempla.

---

## 2. Qué pestañas tiene el Excel vs. qué tipos de proceso tiene GDC

El Excel tiene **6 pestañas** con datos reales (una de ellas, Secuestro, está vacía pero existe como plantilla):

| Pestaña del Excel | Filas con datos | ¿A qué tipo de proceso de GDC correspondería? |
|---|---|---|
| PROCESOS ORDINARIOS | 184 | Declarativo → subtipo Ordinario ✅ (ya existe en GDC) |
| PROCESOS SUMARIOS | 184 | Declarativo → subtipo Sumario ✅ (ya existe en GDC) |
| PROCESOS EJECUTIVOS | 184 | Ejecución — pero **sin subtipo cargado todavía en GDC** (ver sección 4) |
| PROCESOS SUCESIONES | 188 | Jurisdicción voluntaria — **sin subtipo cargado todavía en GDC** |
| MATRIMONIOS | 184 | Matrimonio ✅ (tipo existe, pero sin campos propios — ver sección 3) |
| SECUESTRO | 0 (vacía, solo encabezados) | **No corresponde a ninguno de los 6 tipos catalogados en GDC** |

Nota sobre "Secuestro": la Ley 402 no lo trata como un tipo de proceso autónomo — normalmente es una medida cautelar dentro de otro proceso (por ejemplo, dentro de un Ejecutivo). Que el despacho le dedique una pestaña propia sugiere que en la práctica sí lo gestionan como un flujo separado. **Esto es una pregunta para el usuario, no una conclusión mía**: ¿"Secuestro" debe ser un tipo de proceso adicional en GDC, o es una fase/anotación dentro de un expediente Ejecutivo ya existente?

También noto que el Excel no tiene ninguna pestaña para **"Desacato a los tribunales"** ni **"Declarativos especiales"**, dos de los 6 tipos que GDC sí tiene catalogados. Puede ser que el despacho simplemente no haya tenido casos de ese tipo en este período, no necesariamente que el Excel no los contemple.

---

## 3. Campos que el Excel registra y GDC (hoy) no tiene en su modelo de datos

Revisé la tabla `expedientes` de GDC (migración `20260708100004_expedientes.sql`) y hoy solo guarda: número de expediente, tipo de proceso, subtipo, cuantía, si es lanzamiento, fecha de notificación de la demanda, quién lo creó y fechas de sistema. Comparado con lo que el Excel captura por expediente, faltan estos campos:

| Campo en el Excel | Aparece en | Falta en GDC porque... |
|---|---|---|
| **Físico o Electrónico** | Todas las pestañas | El expediente puede tramitarse en papel o de forma electrónica; GDC no distingue esto hoy. |
| **Pretensión** (ej. "CONTRACTUAL", "DAÑOS Y PERJUICIOS", "LANZAMIENTO POR INTRUSO", "LANZAMIENTO POR MORA") | Ordinarios, Sumarios | Es el motivo específico del reclamo dentro del tipo de proceso. GDC solo guarda tipo/subtipo, no este nivel de detalle. |
| **Despacho del Juez** (ej. "SEGUNDO MUNICIPAL") | Todas | GDC no guarda a qué despacho pertenece el expediente — relevante para cuando haya más de un despacho usando el sistema (ver sección 5). |
| **Municipal o Circuito** | Todas | Nivel de jurisdicción del expediente; no existe como campo en GDC. |
| **Fecha de presentación** | Sumarios, Ejecutivos, Sucesiones | GDC solo tiene `fecha_notificacion_demanda`; no registra cuándo se *presentó* la demanda, solo cuándo se notificó. |
| **OBSERVACIÓN** (texto libre de estado: "DESISTIDO", "PENDIENTE NOTIFICAR", "EMPLAZADO", "CUMPLIENDO EMBARGO", "ESPERANDO PUBLICACIONES", "NO ADMITIDO", etc.) | Todas | Esto es, en la práctica, el "estado real" del expediente día a día. GDC solo modela 4 fases fijas (Admisión, Notificación, Audiencia preliminar, Audiencia de fondo); no tiene un campo de observación/estado libre que capture matices como "desistido" o "no admitido". |
| **Archivo** | Todas | No está claro si es un número de archivo físico o un check de archivado; GDC no tiene equivalente. |
| **Notas** | Varias | Campo de comentarios libres adicional a Observación; GDC no tiene un campo de notas generales en el expediente (sí tiene observaciones, pero ligadas a un documento específico, no al expediente). |
| **Estado Agenda** (ej. "AGENDADO") | Ordinarios, Sumarios, Ejecutivos | GDC calcula fechas límite de audiencia, pero no tiene un flag explícito de "ya se agendó / falta agendar". |
| **Monto de mandamiento de pago** | Ejecutivos | GDC sí tiene un campo de cuantía (`cuantia`, con el tope de B/.10,000), pero en el Excel este monto se anota como texto libre (ej. "2,422.98", "00.00"), sin validación — GDC en este punto ya es una mejora real. |
| **Fecha de decretado el embargo / Edicto Emplazatorio / Fecha de publicación** | Ejecutivos, Sucesiones, Matrimonios | Trámites intermedios propios de Ejecutivos y Sucesiones que GDC no modela todavía como fechas propias del expediente. |
| **Tipo de sucesión** (Testada/Intestada) y **Tipos de bienes** | Sucesiones | GDC no tiene un subtipo cargado para Jurisdicción voluntaria (ver sección 4), así que hoy no distingue esto. |
| **Ubicación** (Dentro/Fuera) y **Estatus** (Realizado) | Matrimonios | GDC tiene el tipo "Matrimonio" catalogado pero, al no tener subtipos ni fases propias para este tipo, no captura estos dos datos que el despacho sí usa activamente. |

---

## 4. Un hallazgo importante: los plazos y subtipos solo están cargados para "Declarativo"

Revisé el *seed* de datos de GDC (`gdc/supabase/seed.sql`) y confirmé algo que ya estaba anotado como pendiente en el documento de requerimientos: **solo existen subtipos configurados para el tipo "Declarativo"** (Ordinario y Sumario, con sus plazos de 20-60 y 10-20 días respectivamente).

Los otros tipos de proceso — Ejecución, Jurisdicción voluntaria, Desacato, Matrimonio — están catalogados como tipos, pero **sin ningún subtipo cargado**. Y el Excel demuestra que en la práctica sí existen subtipos activos y con volumen real de casos:

- **Ejecutivos**: 184 expedientes reales, con su propio flujo (mandamiento de pago → notificación → embargo → edicto).
- **Sucesiones**: 188 expedientes reales, distinguidos entre Testada e Intestada.
- **Matrimonios**: 184 expedientes reales, con estatus "Realizado".

Es decir: el módulo de Expedientes de GDC ya está construido para soportar múltiples tipos y subtipos, pero **la configuración (los datos) de esos subtipos todavía no se ha cargado** para nada que no sea Declarativo. Sin esa carga, hoy no seria posible registrar en GDC, por ejemplo, un expediente Ejecutivo con el mismo nivel de detalle que tiene en el Excel.

---

## 5. Una coincidencia que vale la pena señalar: multi-despacho

El nombre del archivo — "MUNICIPAL **SEGUNDO CIVIL**" — y el campo "Despacho del Juez" (que en todas las filas dice "SEGUNDO MUNICIPAL") confirman que este Excel es específico de **un solo despacho entre varios que probablemente existen** (Primero, Segundo, Tercero Municipal Civil, etc.).

Esto refuerza directamente el requerimiento HU-18-EXTRA / RF-32 de GDC, que ya prevé (aunque todavía sin implementar) la necesidad de un campo `despacho_id` para operar en modo multi-despacho. Si la idea es que este mismo sistema eventualmente sirva a más de un juzgado, vale la pena confirmar si ese campo se prioriza pronto, porque el Excel muestra que **cada despacho ya lleva su propio cuadro por separado hoy**.

---

## 6. Lo que GDC ya hace y el Excel no puede hacer

Para que el comparativo no quede solo en lo que falta, esto es lo que GDC aporta por encima de un Excel:

- **Validación real de montos**: el Excel registra el monto del mandamiento de pago como texto libre, sin ningún control; GDC ya valida el tope de B/.10,000 (salvo lanzamientos) al momento de registrar el expediente.
- **Cálculo automático de plazos**: en el Excel, alguien tiene que calcular a mano la ventana de la audiencia preliminar/de fondo; GDC lo calcula solo a partir de la fecha de notificación.
- **Generación y ciclo de vida de documentos**: el Excel no tiene ningún concepto de "Proveído/Providencia/Auto/Sentencia/Oficio" ni de su estado (generado → validado → en corrección → confirmado); esto es funcionalidad completamente nueva que el despacho no tenía antes.
- **Trazabilidad y auditoría**: quién hizo cada cambio y cuándo, algo que un Excel compartido no puede garantizar de forma confiable.
- **Roles y permisos**: en el Excel cualquiera con acceso al archivo puede editar cualquier celda; GDC restringe por rol (un Asistente solo ve sus expedientes asignados, por ejemplo).
- **Panel del Juez en tiempo real** y **calendario de audiencias**: no existen como tales en el Excel, que es una tabla estática.

---

## 7. Recomendación y preguntas para decidir contigo

Antes de tocar código, esto es lo que yo priorizaría conversar, porque son decisiones de producto, no técnicas:

1. **¿"Secuestro" es un tipo de proceso nuevo o una fase dentro de Ejecutivo?** Definir esto antes de tocar el catálogo.
2. **¿Se necesita el campo "Físico o Electrónico" y "Municipal o Circuito" en GDC?** Si el despacho maneja ambos tipos de expediente, es una validación sencilla de agregar.
3. **¿El campo "OBSERVACIÓN" de texto libre debe pasar a GDC?** Ahora mismo el modelo de fases de GDC es más rígido (4 fases fijas) que el flujo real que muestra el Excel (con estados intermedios como "desistido", "no admitido", "pendiente notificar"). Hay que decidir si esos estados se agregan como una fase más, como un campo de estado aparte, o si se mantienen como notas libres.
4. **¿Se cargan ya los subtipos y plazos de Ejecutivo, Jurisdicción voluntaria y Matrimonio?** Sin esto, esos tres tipos de proceso (que representan más de la mitad de las filas con datos reales en el Excel: 184+188+184 = 556 de 924 expedientes) no se pueden registrar en GDC con el mismo detalle que hoy tienen en el cuadro.
5. **Prioridad del campo `despacho_id`** (RF-32), dado que el Excel confirma que ya existe más de un despacho llevando su propio control por separado.

No hice ningún cambio en el código ni en la base de datos — este documento es solo el análisis comparativo que pediste. Dime cuál de estos puntos quieres que resolvamos primero y armamos el plan.
