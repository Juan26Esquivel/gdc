# Historias de Usuario — Sistema de Monitoreo Documental y Trazabilidad (Órgano Judicial)

> **Nota de trabajo:** este documento parte de la transcripción de la sesión "Leo" y ya fue validado con tus respuestas de la ronda anterior. Además, para afinar la terminología legal, consulté el **Código Procesal Civil de la República de Panamá (Ley 402 de 9 de octubre de 2023)** que compartiste. Donde el Código aporta una definición más precisa que la transcripción original, lo señalo explícitamente con `[LEY 402]`. Quedan pendientes de tu confirmación los puntos marcados como `[VALIDAR]`.

---

## 1. Contexto del sistema

El sistema es un **gestor documental de apoyo** para un despacho judicial. No reemplaza ni se integra directamente con la plataforma oficial del Órgano Judicial (por restricción legal); en su lugar:

- El **Asistente** genera el contenido del documento (proveído, providencia, auto, sentencia u oficio) en un Word en blanco que el propio gestor le entrega, ya "etiquetado" con el tipo de documento y el expediente al que pertenece.
- Esa información se pega/carga en un **plugin conectado a Open Office/Word** que sí pertenece a la plataforma oficial del Órgano Judicial. Al guardar, el sistema oficial absorbe el texto plano.
- **Los dos sistemas nunca se integran técnicamente entre sí.** El único punto de contacto es que el Asistente traslada manualmente la información generada en el gestor hacia el plugin oficial.
- El gestor, entonces, **no almacena el documento legal en sí**, sino su metadata: tipo de documento, expediente, proceso, fase, fechas, quién lo generó y quién lo firmó.

## 2. Roles identificados

| Rol | Descripción funcional |
|---|---|
| **Juez** (jefe) | No genera documentos. Revisa que el documento esté correcto, hace observaciones y, si está conforme, emite su firma (digital o física, según el tipo de trámite). Consulta el estado de expedientes por fase, calendario de audiencias y reportes/gráficas mensuales e históricos. |
| **Asistente** | Descarga la plantilla en blanco del tipo de documento correspondiente, redacta/carga la información, y la traslada al plugin del sistema oficial. Trabaja sobre expedientes/tareas que le fueron asignados. |
| **Analista de Datos** | Rol enfocado exclusivamente en **alimentar y configurar** los reportes y gráficas estadísticas (volumen de documentos emitidos, expedientes por fase, comparativos mensuales/anuales). No tiene un dashboard propio separado: los KPIs que configura son consumidos por él mismo y por el Juez. |
| **Administrador / Superadministrador** | Es un único rol (no dos niveles distintos). Tiene acceso a todas las funcionalidades del sistema, con permisos completos de lectura, modificación, ingreso, eliminación y restablecimiento sobre cualquier módulo, dato o configuración. |

## 3. Catálogos confirmados

**Tipos de proceso** (6 grupos principales):
1. Declarativo — reclamos entre personas, ej. daños y perjuicios, incumplimiento de compraventa.
2. Declarativos especiales
3. Jurisdicción voluntaria
4. Ejecución — incluye lo antes descrito como cobro de pagarés no pagados y lanzamientos por incumplimiento de contrato de vivienda/arrendamiento.
5. Desacato a los tribunales
6. Matrimonio — no está regulado en el Código Procesal Civil (Ley 402); actualmente se rige por el **Código de la Familia**. Se mantiene como categoría propia del despacho, junto a los otros 5 tipos.

**Tipos de resolución — catálogo confirmado**: la Ley 402 (Art. 265) define 4 clases de resoluciones judiciales:
1. **Proveídos** — resoluciones de mero obedecimiento, se ejecutorían instantáneamente.
2. **Providencias** — disponen sobre el trámite de la actuación, no requieren motivación pero citan el fundamento de derecho; llevan media firma.
3. **Autos** — deciden cuestiones incidentales o accesorias del proceso; deben ser motivados.
4. **Sentencias** — ponen fin al proceso en primera o segunda instancia, resolviendo pretensiones o excepciones.

**Oficio** no es una clase de resolución judicial y no aparece en la Ley 402, pero sí se emite en la práctica del despacho como documento de comunicación. El sistema debe permitir su emisión como un **tipo de documento aparte**, distinto de las 4 resoluciones, sin tratarlo como resolución judicial.

**Fases de expediente** (4, aplican de forma transversal a los 6 tipos de proceso):
1. Admisión
2. Notificación de la demanda
3. Audiencia preliminar
4. Audiencia de fondo

---

## 4. Épicas e Historias de Usuario

### Épica 1 — Gestión de Expedientes y Procesos

**HU-01** — Como *Administrador*, quiero registrar y clasificar cada expediente por tipo de proceso (Declarativo, Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales, Matrimonio), para que el sistema pueda controlar en qué fase se encuentra cada uno.

**HU-02** — Como *Administrador*, quiero asignar un proceso y un número de expediente como una tarea a un Asistente específico, para distribuir la carga de trabajo del despacho.

**HU-03** — Como *Juez*, quiero ver cuántos expedientes tengo pendientes de admisión, agrupados por tipo de proceso, para priorizar mi revisión.

**HU-04** — Como *Juez*, quiero ver el desglose de expedientes por fase dentro de cada tipo de proceso (Admisión, Notificación de la demanda, Audiencia preliminar, Audiencia de fondo), para tener control diario de mi carga de trabajo.

**HU-04-EXTRA** — Como *sistema*, debo calcular automáticamente los plazos para celebrar audiencias en procesos declarativos a partir de la fecha registrada de notificación/traslado de la demanda a la parte demandada, usando un **plazo configurable por subtipo de proceso** (no un único valor fijo), para alertar al Juez y al Asistente sobre los términos que corren.

`[LEY 402 — confirmado y corregido con tu ayuda]`:
- **Proceso Sumario** (Art. 645, num. 8): vencido el término de traslado de la demanda, el juez fija fecha de audiencia preliminar dentro de los **10 a 20 días** siguientes.
- **Proceso Ordinario** (Art. 619, que remite a la regla general del Art. 252): la audiencia preliminar se celebra entre los **20 a 60 días** contados desde el vencimiento del término de traslado de la demanda.

Estos dos son distintos entre sí, y ambos caen dentro del tipo de proceso "Declarativo". `[VALIDAR: para los demás tipos de proceso (Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales, Matrimonio) — ¿existen plazos análogos que deban parametrizarse también, o el cálculo automático de términos aplica únicamente a Declarativo (Ordinario/Sumario) por ahora?]`

---

### Épica 2 — Generación y Plantillas de Documentos

**HU-05** — Como *Asistente*, quiero descargar una plantilla Word en blanco ya asociada al tipo de documento correcto (Proveído, Providencia, Auto, Sentencia u Oficio) y al expediente correspondiente, para no tener que clasificar manualmente el documento después. El sistema debe distinguir internamente que Proveído/Providencia/Auto/Sentencia son resoluciones judiciales, mientras que Oficio es un documento de comunicación aparte.

**HU-06** — Como *Asistente*, quiero cargar/redactar la información del documento en el gestor y luego trasladarla al plugin del sistema oficial del Órgano Judicial, para que el trámite legal quede registrado en la plataforma oficial sin que ambos sistemas se integren directamente.

**HU-07** — Como *Juez*, quiero revisar el documento generado por el Asistente y dejar observaciones si algo no está correcto, para asegurar la calidad antes de firmar.

**HU-08** — Como *Juez*, quiero que el documento pase por un ciclo de estados controlado antes de cerrarse, para asegurar trazabilidad completa del trámite:
1. **Generado** — el Asistente genera el `.docx` desde la plantilla.
2. **Validado** — el sistema valida el documento al momento de generarse el `.docx` (completitud de campos, tipo correcto, expediente correcto).
3. **En corrección** — si el Juez encuentra un error, el documento regresa a este estado para que el Asistente lo rehaga.
4. **Confirmado / firmado externamente** — una vez el Juez da el visto bueno, el sistema no ejecuta ni almacena la firma en sí (eso ocurre en el sistema oficial del Órgano Judicial vía el plugin), pero registra la confirmación de que la firma se realizó en el otro sistema, cerrando el ciclo del expediente en el gestor.

El gestor nunca ejecuta la firma digital: solo modela el estado ("pendiente de firma" / "firmado") y ofrece la opción de **rehacer** (vuelve a "En corrección") o **confirmar** (cierra el ciclo).

---

### Épica 3 — Panel de Control del Juez (Dashboard)

**HU-09** — Como *Juez*, quiero ver una gráfica mensual de cuántos proveídos, providencias, autos, sentencias y oficios remití, con su desglose por tipo, para tener visibilidad de mi productividad.

**HU-10** — Como *Juez*, quiero comparar el volumen de expedientes trabajados este mes contra el mes/año anterior (cuántos entraron, cuántos se resolvieron), para identificar tendencias de carga de trabajo.

**HU-11** — Como *Juez*, quiero un resumen consolidado de "cuánto pendiente tengo" por tipo de proceso y fase, actualizado al día, sin necesidad de pedirlo manualmente.

---

### Épica 4 — Calendario de Audiencias

**HU-12** — Como *Juez*, quiero consultar en un calendario los expedientes que tienen audiencia programada para el siguiente mes, para poder planificar mi agenda.

**HU-13** — Como *Juez*, quiero que el sistema distinga qué expedientes corresponden a cada audiencia próxima, para no confundir trámites al prepararme.

---

### Épica 5 — Reportería y Analítica

**HU-14** — Como *Analista de Datos*, quiero generar reportes de volumen de documentos emitidos (Proveídos, Providencias, Autos, Sentencias y Oficios) por período, para entregar información consolidada al Juez o a instancias superiores.

**HU-15** — Como *Juez* o *Analista de Datos*, quiero ver el histórico comparativo mes a mes y año a año de expedientes ingresados vs. resueltos, manejado mediante **KPIs**, para medir el desempeño del despacho en el tiempo. Ambos roles pueden consultarlo; el Analista de Datos es quien configura y alimenta los KPIs, y el Juez los consume.

---

### Épica 6 — Administración, Seguridad y Configuración

**HU-16** — Como *Administrador*, quiero definir qué campos o tipos de información **no pueden cargarse** en el sistema por ser sensibles o comprometer el expediente, para cumplir con restricciones legales de manejo de información judicial.

**HU-17** — Como *Administrador*, quiero gestionar los procesos y números de expediente disponibles para asignarlos como tareas, para mantener organizado el flujo de trabajo del despacho.

**HU-18** — Como *Administrador*, quiero administrar los usuarios del sistema y sus roles (Juez, Asistente, Analista de Datos), con permisos completos de lectura, modificación, ingreso, eliminación y restablecimiento, para controlar accesos.

**HU-18-EXTRA** — Como *Administrador*, quiero que la arquitectura del sistema quede preparada desde ahora para una futura implementación **multi-tenant** (multi-despacho / multi-circuito), aunque esta primera versión opere para un solo despacho, para evitar retrabajo de arquitectura más adelante.

---

### Épica 7 — Integración con la Plataforma del Órgano Judicial

**HU-19** — Como *Asistente*, quiero que el gestor identifique automáticamente el tipo de documento al momento de generar el Word en blanco, para que al cargarlo en el plugin del sistema oficial no haya error de clasificación.

**HU-20** — Como *sistema*, no debo establecer ninguna integración técnica (API, base de datos compartida, etc.) con la plataforma del Órgano Judicial ni con el plugin de Open Office/Word, dado que ese sistema es de índole legal y está fuera de nuestro alcance — la única vía de intercambio de información es la carga manual que realiza el Asistente.

---

### Épica 8 — Reglas de Negocio sobre Montos y Cuantía

**HU-21** — Como *sistema*, debo limitar el registro de montos por trámite a un **tope de B/.10,000.00 (diez mil balboas)**, salvo en los procesos de **lanzamiento**, los cuales no tienen límite de cuantía. `[LEY 402 — Art. 14 y Art. 52: confirma B/.10,000.00 como el umbral entre menor y mayor cuantía; y el Art. 52, num. 10 confirma textualmente que "los jueces municipales también son competentes para conocer de los procesos de desahucio y lanzamiento, sin consideración a la cuantía". Esto valida exactamente la regla que planteaste.]`

**HU-22** — Como *Administrador*, quiero que el sistema aplique esta validación de tope automáticamente al registrar el monto de un trámite, alertando o bloqueando si se excede sin que el proceso sea de lanzamiento.

> **Respuesta a pregunta abierta (lanzamiento en Ejecutivo Hipotecario):** confirmado. `[LEY 402 — Art. 780]` establece que, en el proceso ejecutivo hipotecario, es en el **auto que aprueba el remate** donde el juez decreta el lanzamiento del deudor o tercero ocupante del inmueble — es decir, se ordena una vez el bien queda adjudicado de forma definitiva, tal como indicaste.

---

## 5. Preguntas abiertas para la siguiente ronda

1. **Plazos por tipo de proceso:** ya distinguimos Ordinario (20-60 días) y Sumario (10-20 días) dentro de Declarativo — ¿los demás tipos de proceso (Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales, Matrimonio) requieren también un cálculo automático de plazos, o por ahora el sistema solo lo aplica a Declarativo?
2. **Qué información no puede cargarse:** aún falta que definas qué campos específicos del expediente/documento debe bloquear el Administrador por ser sensibles.

---

*Siguiente paso: una vez confirmados estos puntos, avanzamos con el stack tecnológico y la redacción de los Requerimientos Funcionales (RF) y No Funcionales (RNF), siguiendo el mismo formato usado en SOYJA y DATA BCBRP.*
