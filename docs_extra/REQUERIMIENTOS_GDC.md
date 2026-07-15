# GDC — Gestor Documental y de Trazabilidad de Expedientes
## Documento de Requerimientos Funcionales y No Funcionales

> Basado en: transcripción de sesión de descubrimiento ("Leo"), rondas de validación con el usuario, y consulta directa al **Código Procesal Civil de la República de Panamá (Ley 402 de 9 de octubre de 2023)**. Este documento está redactado para consumo directo de Claude Code.

---

## 0. Descripción General

GDC es un sistema de apoyo administrativo para un despacho judicial civil en Panamá. Permite:

- Clasificar y dar seguimiento a expedientes por tipo de proceso y fase.
- Generar (por código, sin plantillas `.docx` predefinidas por ahora) los documentos judiciales — Proveído, Providencia, Auto, Sentencia — y el documento administrativo de comunicación **Oficio**.
- Controlar el ciclo de vida de cada documento (Generado → Validado → En corrección → Confirmado) sin ejecutar ni almacenar firmas digitales, ya que estas ocurren en la plataforma oficial del Órgano Judicial.
- Dar visibilidad al Juez de su carga de trabajo (expedientes por fase, calendario de audiencias, productividad mensual).
- Permitir que un rol de Analista de Datos configure y alimente KPIs consumidos tanto por él como por el Juez.
- Aplicar reglas de negocio propias del despacho: tope de cuantía de B/.10,000.00 por trámite (salvo lanzamientos) y cálculo de plazos de audiencia según el subtipo de proceso declarativo.

**Fuera de alcance explícito:** GDC **no se integra técnicamente** con la plataforma del Órgano Judicial ni con su plugin de Open Office/Word. El único punto de contacto entre ambos sistemas es manual: el Asistente traslada el contenido generado en GDC hacia el plugin oficial.

---

## 1. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 + React 19 |
| Estilos / UI | Tailwind CSS 4 + shadcn/ui |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Generación de documentos `.docx` | `docx` (npm, construcción por código — sin plantillas predefinidas por ahora) |
| Calendario de audiencias | `react-big-calendar` |
| Gráficas / KPIs | Recharts |
| Deploy | Vercel |

> Nota de arquitectura: dado que aún no existen plantillas `.docx` de referencia, los documentos se generan armando el `.docx` desde código (estructura, encabezados y contenido definidos programáticamente). Cuando existan plantillas oficiales, se puede migrar a `docxtemplater` sin cambiar el modelo de datos.

---

## 2. Roles y Permisos

| Módulo / Acción | Juez | Asistente | Analista de Datos | Administrador |
|---|---|---|---|---|
| Ver expedientes propios / asignados | ✅ (todos los del despacho) | ✅ (solo asignados) | ❌ | ✅ (todos) |
| Crear / clasificar expedientes | ❌ | ❌ | ❌ | ✅ |
| Asignar expedientes como tarea | ❌ | ❌ | ❌ | ✅ |
| Generar documento (.docx) | ❌ | ✅ | ❌ | ✅ |
| Revisar / dejar observaciones sobre documento | ✅ | ❌ | ❌ | ✅ |
| Cambiar estado de documento (validar, corregir, confirmar) | ✅ (revisar y confirmar) | ✅ (generar y rehacer) | ❌ | ✅ (todos los estados) |
| Ver dashboard de pendientes por fase | ✅ | ❌ | ❌ | ✅ |
| Ver calendario de audiencias | ✅ | ✅ (solo asignados) | ❌ | ✅ |
| Configurar/alimentar KPIs y reportes | ❌ (solo consulta) | ❌ | ✅ | ✅ |
| Consultar KPIs y reportes históricos | ✅ | ❌ | ✅ | ✅ |
| Definir campos restringidos (información sensible) | ❌ | ❌ | ❌ | ✅ |
| Administrar usuarios y roles | ❌ | ❌ | ❌ | ✅ |
| Configurar parámetros de plazos por tipo/subtipo de proceso | ❌ | ❌ | ❌ | ✅ |
| Configurar tope de cuantía y excepciones | ❌ | ❌ | ❌ | ✅ |

> El Administrador es un **rol único** (Administrador = Superadministrador) con acceso total: lectura, modificación, ingreso, eliminación y restablecimiento sobre cualquier módulo.

---

## 3. Modelo de Datos (SQL — Migraciones)

Las migraciones se numeran secuencialmente desde `001` (proyecto nuevo).

### 001 — Roles y Usuarios

```sql
create type rol_gdc as enum ('juez', 'asistente', 'analista_datos', 'administrador');

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null unique,
  nombre_completo text not null,
  rol rol_gdc not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_usuarios_rol on usuarios(rol);
```

### 002 — Catálogo de Tipos de Proceso y Subtipos

```sql
create table tipos_proceso (
  id serial primary key,
  nombre text not null unique, -- Declarativo, Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales, Matrimonio
  descripcion text,
  base_legal text -- ej. 'Ley 402 - Libro Cuarto, Título I' o 'Código de la Familia' (caso Matrimonio)
);

create table subtipos_proceso (
  id serial primary key,
  tipo_proceso_id int references tipos_proceso(id) not null,
  nombre text not null, -- ej. 'Ordinario', 'Sumario' dentro de Declarativo
  plazo_audiencia_min_dias int, -- ej. 20 (Ordinario) o 10 (Sumario) -- audiencia preliminar
  plazo_audiencia_max_dias int, -- ej. 60 (Ordinario) o 20 (Sumario) -- audiencia preliminar
  plazo_audiencia_fondo_min_dias int, -- ventana para audiencia de fondo/final, contada desde el cierre de la audiencia preliminar
  plazo_audiencia_fondo_max_dias int,
  base_legal text, -- ej. 'Art. 619 y 252' / 'Art. 645 num. 8'
  unique (tipo_proceso_id, nombre)
);

-- seed inicial conocido:
-- Declarativo > Ordinario: audiencia preliminar 20-60 días (Art. 619, 252);
--   audiencia de fondo 20-40 días desde el cierre de la preliminar
--   [VERIFICAR ARTÍCULO EXACTO — aparenta ser Art. 255 núm. 8, no confirmado con certeza por errores de OCR conocidos en la transcripción del Código]
-- Declarativo > Sumario: audiencia preliminar 10-20 días (Art. 645 num. 8);
--   audiencia de fondo sin plazo confirmado (columnas quedan null)
-- Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales:
--   investigados — NO tienen una ventana de audiencia parametrizable análoga a Declarativo.
--   Sus plazos son puntuales y dispersos por trámite específico (ver sección "Decisiones abiertas").
-- Matrimonio: fuera del Código Procesal Civil (se rige por Código de Familia), sin parametrizar.
```

### 003 — Catálogo de Tipos de Documento (Resoluciones + Oficio)

```sql
create type categoria_documento as enum ('resolucion_judicial', 'comunicacion');

create table tipos_documento (
  id serial primary key,
  nombre text not null unique, -- Proveído, Providencia, Auto, Sentencia, Oficio
  categoria categoria_documento not null,
  requiere_motivacion boolean not null default false, -- true para Auto y Sentencia
  base_legal text
);

-- seed:
-- Proveído       | resolucion_judicial | false | Art. 265 num. 1
-- Providencia    | resolucion_judicial | false | Art. 265 num. 2
-- Auto           | resolucion_judicial | true  | Art. 265 num. 3, Art. 267
-- Sentencia      | resolucion_judicial | true  | Art. 265 num. 4, Art. 269
-- Oficio         | comunicacion        | false | (no regulado en Ley 402; uso administrativo del despacho)
```

### 004 — Expedientes

```sql
create table expedientes (
  id uuid primary key default gen_random_uuid(),
  numero_expediente text not null unique,
  tipo_proceso_id int references tipos_proceso(id) not null,
  subtipo_proceso_id int references subtipos_proceso(id), -- nullable, no todos los tipos tienen subtipo aún parametrizado
  cuantia numeric(12,2), -- null si es indeterminada
  es_lanzamiento boolean not null default false, -- excepción de tope de cuantía
  fecha_notificacion_demanda date, -- ancla para el cálculo de plazos de audiencia
  created_by uuid references usuarios(id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expedientes_tipo_proceso on expedientes(tipo_proceso_id);
create index idx_expedientes_numero on expedientes(numero_expediente);

-- Regla de negocio (validación a nivel de aplicación y trigger de respaldo):
-- cuantia <= configuracion_sistema.tope_cuantia (migración 012) a menos que es_lanzamiento = true
```

### 005 — Fases de Expediente (histórico)

```sql
create type fase_expediente as enum (
  'admision',
  'notificacion_demanda',
  'audiencia_preliminar',
  'audiencia_fondo'
);

create table expediente_fases (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  fase fase_expediente not null,
  fecha_inicio timestamptz not null default now(),
  fecha_fin timestamptz, -- null mientras la fase esté activa
  observaciones text
);

create index idx_expediente_fases_expediente on expediente_fases(expediente_id);

-- La fase "actual" de un expediente es la fila con fecha_fin is null más reciente.
```

### 006 — Asignaciones de Tareas (Administrador → Asistente)

```sql
create table asignaciones (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  asistente_id uuid references usuarios(id) not null,
  asignado_por uuid references usuarios(id) not null,
  fecha_asignacion timestamptz not null default now(),
  activa boolean not null default true
);

create index idx_asignaciones_asistente on asignaciones(asistente_id) where activa = true;
```

### 007 — Documentos (ciclo de vida)

```sql
create type estado_documento as enum (
  'generado',
  'validado',
  'en_correccion',
  'confirmado'
);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  tipo_documento_id int references tipos_documento(id) not null,
  estado estado_documento not null default 'generado',
  generado_por uuid references usuarios(id) not null,
  contenido_texto text, -- texto plano generado por código, el que el Asistente traslada al plugin oficial
  archivo_docx_path text, -- ruta en Supabase Storage del .docx generado (metadata únicamente, no el documento legal final)
  observaciones_juez text, -- comentarios cuando el documento pasa a 'en_correccion'
  confirmado_por uuid references usuarios(id), -- Juez que confirma el cierre del ciclo
  fecha_confirmacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documentos_expediente on documentos(expediente_id);
create index idx_documentos_estado on documentos(estado);

-- Transiciones válidas de estado (a validar en la capa de aplicación):
-- generado -> validado -> confirmado
-- validado -> en_correccion -> generado (rehacer)
```

### 008 — Calendario de Audiencias

```sql
create type tipo_audiencia as enum ('preliminar', 'fondo');

-- Terminología con respaldo directo en el Código Procesal Civil (Ley 402/2023):
-- 'suspendida' (Art. 258 "Suspensión de la audiencia final") y 'continuada' (Art. 259 "Concentración",
-- varias sesiones/recesos como una misma unidad procesal) son términos legales explícitos.
-- El Código NO usa "desierta", "reprogramada" ni "cancelada" para audiencias (esos términos solo
-- aplican a recursos/incidentes); el efecto real de incomparecencia total es la terminación del
-- proceso (Art. 253), no un estado de la audiencia en sí.
create type estado_audiencia as enum (
  'programada',
  'celebrada',
  'suspendida',
  'continuada',
  'terminada_por_incomparecencia'
);

create table audiencias (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) not null,
  tipo tipo_audiencia not null,
  fecha_programada timestamptz not null,
  -- Para tipo = 'preliminar': fecha_notificacion_demanda + plazo del subtipo.
  -- Para tipo = 'fondo': fecha de cierre de la audiencia 'preliminar' del mismo expediente + plazo_audiencia_fondo del subtipo.
  fecha_limite_calculada timestamptz,
  estado estado_audiencia not null default 'programada',
  created_at timestamptz not null default now()
);

create index idx_audiencias_fecha on audiencias(fecha_programada);
create index idx_audiencias_expediente on audiencias(expediente_id);
```

### 009 — Configuración de KPIs y Reportes

```sql
create table kpis_config (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  tipo_calculo text not null, -- 'conteo_por_tipo_documento', 'comparativo_mensual', 'comparativo_anual', etc.
  configurado_por uuid references usuarios(id) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
```

### 010 — Restricciones de Campos Sensibles

```sql
create table campos_restringidos (
  id serial primary key,
  entidad text not null, -- 'expediente' | 'documento'
  nombre_campo text not null,
  motivo text,
  definido_por uuid references usuarios(id) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (entidad, nombre_campo)
);

-- Pendiente: Juan debe indicar qué campos concretos deben poblar esta tabla (ver "Decisiones abiertas").
```

### 011 — Auditoría

```sql
create table auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) not null,
  accion text not null, -- 'crear_expediente', 'cambiar_estado_documento', 'asignar_tarea', etc.
  entidad text not null,
  entidad_id uuid,
  detalle jsonb,
  created_at timestamptz not null default now()
);

create index idx_auditoria_entidad on auditoria(entidad, entidad_id);
create index idx_auditoria_usuario on auditoria(usuario_id);
```

> Nota multi-tenant: todas las tablas anteriores están diseñadas para admitir en una migración futura una columna `despacho_id` (o `tenant_id`) sin romper la estructura, cumpliendo con HU-18-EXTRA (preparación para multi-tenant sin implementarlo aún).

### 012 — Configuración General del Sistema

```sql
create table configuracion_sistema (
  id int primary key default 1 check (id = 1), -- singleton: una sola fila
  tope_cuantia numeric(12,2) not null default 10000.00, -- Art. 14 y 52 Ley 402: umbral entre menor y mayor cuantía
  modo_validacion_cuantia text not null default 'bloquear' check (modo_validacion_cuantia in ('bloquear', 'alertar')),
  plazo_admision_dias int not null default 30, -- Art. 395: días hábiles para notificar auto admisorio/mandamiento de pago tras presentar la demanda; aplica transversalmente a los 6 tipos de proceso
  actualizado_por uuid references usuarios(id), -- nullable: no hay usuarios todavía en el momento de esta migración; la app lo setea la primera vez que un Administrador real edite la configuración
  updated_at timestamptz not null default now()
);

-- fila única inicial, sin actualizado_por (se completa cuando el primer Administrador real la edite)
insert into configuracion_sistema (id) values (1);
```

> Reemplaza el tope de cuantía hardcodeado de la migración 004 (RF-36: ajustable sin despliegue de código) y agrega `modo_validacion_cuantia` (RF-35: alertar o bloquear según configuración del Administrador). `plazo_admision_dias` es el plazo transversal del Art. 395, usado para alertar cuando un expediente lleva más de 30 días hábiles en fase `admision` sin pasar a `notificacion_demanda` (ver RF-24).

### 013 — Auditoría Automática de Borrados

```sql
create or replace function fn_auditoria_borrado_expedientes() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id from usuarios where auth_user_id = auth.uid();

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (
    coalesce(v_usuario_id, old.created_by),
    'eliminar_expediente',
    'expediente',
    old.id,
    to_jsonb(old)
  );

  return old;
end;
$$ language plpgsql security definer;

create or replace function fn_auditoria_borrado_documentos() returns trigger as $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id from usuarios where auth_user_id = auth.uid();

  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (
    coalesce(v_usuario_id, old.generado_por),
    'eliminar_documento',
    'documento',
    old.id,
    to_jsonb(old)
  );

  return old;
end;
$$ language plpgsql security definer;

create trigger trg_auditoria_borrado_expedientes
  before delete on expedientes
  for each row execute function fn_auditoria_borrado_expedientes();

create trigger trg_auditoria_borrado_documentos
  before delete on documentos
  for each row execute function fn_auditoria_borrado_documentos();
```

> Garantiza a nivel de base de datos (no solo de aplicación) que toda eliminación de un expediente o documento quede registrada en `auditoria` con el contenido completo de la fila borrada (`to_jsonb(old)`), incluso si ocurre fuera del flujo normal de la app Next.js. El usuario responsable se resuelve por `auth.uid()`; si el borrado ocurre sin sesión autenticada (ej. script administrativo directo sobre Supabase), se usa como respaldo quien creó/generó el registro.

### 014 — Funciones Helper para RLS

```sql
create or replace function fn_usuario_rol() returns rol_gdc
language sql security definer stable
set search_path = public
as $$
  select rol from usuarios where auth_user_id = auth.uid();
$$;

create or replace function fn_usuario_id() returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from usuarios where auth_user_id = auth.uid();
$$;

create or replace function fn_expediente_asignado(p_expediente_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from asignaciones
    where expediente_id = p_expediente_id
      and asistente_id = fn_usuario_id()
      and activa = true
  );
$$;
```

> `SECURITY DEFINER` + `stable`: estas funciones corren con privilegios del dueño (bypass RLS), evitando recursión al consultar `usuarios`/`asignaciones` desde las propias políticas de esas tablas. Son la base de todas las políticas RLS de la migración 015.

### 015 — Políticas RLS (implementa RF-02 y la matriz de la sección 2)

RLS habilitado en las 13 tablas de negocio. Resumen por tabla (SQL completo en `gdc/supabase/migrations/20260709090002_rls_politicas.sql`):

| Tabla | Regla |
|---|---|
| `usuarios` | Lectura para cualquier autenticado (ver migración 017 — corrección); escritura solo Administrador. |
| `tipos_proceso`, `subtipos_proceso`, `tipos_documento` | Lectura para cualquier autenticado (catálogos); escritura solo Administrador. |
| `expedientes` | Juez y Administrador ven todos; Asistente solo los asignados (`fn_expediente_asignado`); escritura solo Administrador. |
| `expediente_fases` | Visibilidad heredada del expediente; escritura solo Administrador (no asignada a nadie más en la matriz). |
| `asignaciones` | Juez/Administrador ven todas; Asistente ve solo las propias; escritura solo Administrador. |
| `documentos` | Juez/Administrador ven todos; Asistente ve/inserta/actualiza solo los de expedientes asignados (generar/rehacer); Juez además puede actualizar (revisar/confirmar); borrado solo Administrador. |
| `audiencias` | Visibilidad heredada del expediente; escritura solo Administrador. |
| `kpis_config` | Analista/Administrador configuran y alimentan; Juez solo consulta. |
| `campos_restringidos` | Lectura para cualquier autenticado (para bloquear campos en formularios); escritura solo Administrador. |
| `auditoria` | Solo Administrador lee; cualquier autenticado inserta su propia entrada (`usuario_id = fn_usuario_id()`); sin `update`/`delete` para nadie (log inmutable). |
| `configuracion_sistema` | Lectura para cualquier autenticado; solo Administrador actualiza. |

> **Nota:** aunque las políticas fallen o estén mal, el editor SQL del dashboard de Supabase y el CLI usan una conexión que no está sujeta a RLS (rol `postgres`/`service_role`) — RLS solo afecta a la futura app Next.js conectada como usuario autenticado. Tres decisiones no cubiertas explícitamente por la matriz de la sección 2 (marcadas arriba) se resolvieron con el criterio más conservador y quedan abiertas a ajuste: acceso de lectura a `auditoria` restringido a Administrador, lectura de `campos_restringidos` abierta a cualquier autenticado, y escritura de `expediente_fases`/`audiencias` restringida a Administrador.

### 016 — Storage: bucket de `.docx` (RF-11)

```sql
-- Bucket privado. Convención de ruta: {expediente_id}/{documento_id}.docx
insert into storage.buckets (id, name, public)
values ('documentos-docx', 'documentos-docx', false)
on conflict (id) do nothing;

create policy documentos_docx_select on storage.objects for select
  using (
    bucket_id = 'documentos-docx'
    and (
      fn_usuario_rol() in ('administrador', 'juez')
      or (
        fn_usuario_rol() = 'asistente'
        and fn_expediente_asignado(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- (insert/update con la misma regla; ver gdc/supabase/migrations/20260709100001_storage_documentos.sql)
```

> El primer segmento de la ruta del archivo es el `expediente_id`, lo que permite reutilizar `fn_expediente_asignado` (migración 014) también para el acceso a Storage.

### 017 — Corrección de RLS: lectura de `usuarios` (bug encontrado en pruebas)

```sql
drop policy usuarios_select_propio_o_admin on usuarios;

create policy usuarios_select on usuarios for select
  using (auth.role() = 'authenticated');
```

> **Bug real detectado al verificar el Módulo 3 (Documentos) en navegador**: con la política original (solo fila propia o Administrador), el Juez no podía ver el nombre del Asistente que generó un documento — el `join` embebido `documentos → usuarios (generado_por)` se resolvía en `null` (RLS bloquea el embed silenciosamente, sin lanzar error). Nombre y rol no son datos sensibles y se necesitan para mostrar "generado por", "asignado a", etc. a cualquier rol; la escritura sobre `usuarios` se mantiene restringida a Administrador (`usuarios_admin_write`, sin cambios).

### 018 — Realtime vía Postgres Changes (RF-19, intento inicial — reemplazado por la migración 019)

```sql
alter publication supabase_realtime add table expedientes;
alter publication supabase_realtime add table documentos;
alter publication supabase_realtime add table audiencias;
```

> Habilita las tablas para Postgres Changes. **No fue suficiente**: en pruebas, insertar una fila directamente en la base de datos nunca disparó el evento hacia el navegador (confirmado inspeccionando el WebSocket), incluso con la suscripción exitosa ("Subscribed to PostgreSQL"). Con una prueba autorizada de desactivar RLS temporalmente en `expedientes`, el evento sí llegó de inmediato — confirmando que el bloqueo es una limitación conocida del motor de Postgres Changes de Supabase con políticas RLS que dependen de funciones `SECURITY DEFINER` con sub-consultas (exactamente `fn_usuario_rol()`/`fn_expediente_asignado()`, migración 014). Se mantiene esta migración aplicada (no hace daño dejar las tablas en la publicación) pero el mecanismo real usado es el de la migración 019.

### 019 — Realtime vía Broadcast from Database (RF-19, solución real)

```sql
create policy "autenticados_escuchan_broadcast" on "realtime"."messages"
  for select
  to authenticated
  using (true);

create or replace function fn_broadcast_cambio() returns trigger
language plpgsql security definer
as $$
begin
  perform realtime.send(
    jsonb_build_object('table', TG_TABLE_NAME, 'type', TG_OP),
    'cambio',
    'dashboard-cambios',
    true
  );
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_broadcast_expedientes
  after insert or update or delete on expedientes
  for each row execute function fn_broadcast_cambio();
-- (mismo patrón para documentos y audiencias)
```

> Patrón recomendado por Supabase para evitar la limitación de la migración 018: el trigger envía una señal ligera (solo tabla + tipo de operación, **sin** el contenido de la fila) a un canal privado; el cliente la recibe y vuelve a pedir los datos por la vía normal (que sí respeta RLS con normalidad, ya que es una consulta `SELECT` corriente vía PostgREST, no una evaluación de RLS dentro del motor de Realtime). La autorización del canal usa una condición simple (`using (true)` para cualquier `authenticated`) que no depende de las funciones `SECURITY DEFINER` problemáticas.
>
> Incluso con esto, el canal seguía devolviendo `Unauthorized` hasta corregir un segundo problema, esta vez del lado del cliente: `@supabase/ssr` no sincroniza automáticamente el JWT de sesión con `supabase.realtime` (a diferencia del cliente estándar de `supabase-js`). Hubo que llamar `supabase.realtime.setAuth(session.access_token)` explícitamente antes de suscribirse (`gdc/src/app/(app)/dashboard/realtime-refresh.tsx`). Diagnosticado en conjunto con el usuario usando el **Realtime Inspector** del dashboard de Supabase, que permitió confirmar que el canal sí era accesible en general (aislando el problema al cliente de la app, no al proyecto).

### 020 — `kpis_config` completo + acceso de lectura del Analista de Datos (RF-25 a RF-28)

```sql
create type entidad_base_kpi as enum ('expediente', 'documento', 'audiencia');
create type metrica_kpi as enum ('conteo', 'porcentaje_cumplimiento', 'promedio_dias');

alter table kpis_config
  add column entidad_base entidad_base_kpi not null,
  add column metrica metrica_kpi not null,
  add column umbral_optimo numeric,
  add column umbral_alerta numeric,
  add column umbral_critico numeric;

alter table kpis_config drop column tipo_calculo;

-- El Analista de Datos nunca había tenido política de SELECT sobre
-- expedientes/documentos/audiencias (migración 015 solo cubría
-- administrador/juez/asistente-asignado) — sin esto, el motor de cálculo de
-- KPIs vería siempre 0 filas para ese rol.
create policy expedientes_analista_select on expedientes for select
  using (fn_usuario_rol() = 'analista_datos');
create policy documentos_analista_select on documentos for select
  using (fn_usuario_rol() = 'analista_datos');
create policy audiencias_analista_select on audiencias for select
  using (fn_usuario_rol() = 'analista_datos');
```

> El campo `tipo_calculo` original (texto libre) nunca fue consumido por ninguna UI — se reemplaza por `entidad_base` + `metrica`, dos enums que el motor de cálculo (`gdc/src/lib/kpis.ts`) sabe interpretar sin ambigüedad. Solo 9 combinaciones son válidas (3 entidades × 3 métricas) y cada una mapea a una consulta real y documentada en el código (conteo mensual, tasa de cumplimiento de plazos/celebración, o promedio de días), nunca a una cifra inventada. Los umbrales (óptimo/alerta/crítico, en %) solo tienen efecto visual sobre KPIs de métrica "porcentaje de cumplimiento".

### 021 — Desactivar usuario bloquea acceso real (RF-01/RF-31)

```sql
create or replace function fn_usuario_rol() returns rol_gdc
language sql security definer stable set search_path = public
as $$
  select rol from usuarios where auth_user_id = auth.uid() and activo = true;
$$;

create or replace function fn_usuario_id() returns uuid
language sql security definer stable set search_path = public
as $$
  select id from usuarios where auth_user_id = auth.uid() and activo = true;
$$;
```

> Hallazgo durante la construcción del Módulo 7: `usuarios.activo` nunca tuvo ningún efecto real — ni el login, ni el middleware, ni las funciones de RLS lo revisaban, así que "desactivar" a alguien solo cambiaba un valor cosmético. Se corrige en la capa de RLS (defensa en profundidad): un usuario inactivo deja de resolver rol/id, por lo que **toda** política que dependa de estas dos funciones falla de forma cerrada para él. Además, `gdc/src/lib/supabase/middleware.ts` ahora consulta `usuarios.activo` en cada request a una ruta protegida y cierra la sesión (`supabase.auth.signOut()`) apenas la detecta desactivada, redirigiendo a `/login` con un mensaje claro.
>
> **Bug encontrado y corregido durante la verificación en navegador:** la primera versión de ese cambio en el middleware llamaba a `signOut()` (que limpia las cookies de sesión en el response rastreado por `@supabase/ssr`) pero luego devolvía un `NextResponse.redirect()` **nuevo**, descartando esas cookies — la sesión nunca se cerraba de verdad y el usuario desactivado seguía entrando. Se corrigió trasladando explícitamente las cookies del response rastreado al response de redirección antes de devolverlo.

### 022 — Borrado en cascada de expedientes + auditoría completa (RF-33-EXTRA)

```sql
-- expediente_fases, asignaciones, audiencias, documentos → expedientes pasan
-- a ON DELETE CASCADE (antes ON DELETE NO ACTION por defecto: ningún
-- expediente real podía borrarse, ya que la fase "admisión" se crea
-- automáticamente al crearlo). documentos ya tenía su propio trigger de
-- auditoría de borrado (migración 013); se agregan los mismos para
-- expediente_fases y audiencias, para que el borrado en cascada no elimine
-- esas filas en silencio (violaría RNF-03/RNF-09).
create trigger trg_auditoria_borrado_fases
  before delete on expediente_fases
  for each row execute function fn_auditoria_borrado_fases();

create trigger trg_auditoria_borrado_audiencias
  before delete on audiencias
  for each row execute function fn_auditoria_borrado_audiencias();
```

> Decisión tomada con el usuario: `asignaciones` sí queda en cascada pero **sin** trigger de auditoría propio (menor riesgo/valor que fases y audiencias). El nombre exacto de cada restricción de llave foránea se busca dinámicamente en la migración (`pg_constraint`) en vez de asumirlo, para no depender de cómo Postgres las nombró automáticamente.

### 023 — Intento de respaldo en los triggers de fases/audiencias (limitación conocida)

> Al limpiar expedientes de prueba con un script que usa la `service_role key` (sin sesión de usuario autenticada), los triggers de `fn_auditoria_borrado_fases`/`fn_auditoria_borrado_audiencias` fallaban por violar el `not null` de `auditoria.usuario_id` — sin `auth.uid()`, no tenían de dónde tomar un usuario de respaldo. Se intentó agregar un respaldo consultando `expedientes.created_by` vía `expediente_id`, pero **no funciona para el caso de cascada** (que es el caso real de uso de RF-33-EXTRA): para cuando el trigger de `expediente_fases`/`audiencias` se ejecuta, la fila padre en `expedientes` **ya fue borrada** por el trigger `BEFORE DELETE` de esa tabla, así que la sub-consulta no encuentra nada. **Limitación aceptada**: estos dos triggers solo funcionan de forma completa dentro de una sesión autenticada real (que es como los usa la aplicación — el Administrador siempre tiene una sesión al eliminar desde `/expedientes`); un borrado hecho directamente con la `service_role key` fuera de la app fallaría. No afecta el flujo real del producto, solo scripts de mantenimiento fuera de la aplicación.

---

## 4. Requerimientos Funcionales

### Módulo 1 — Gestión de Roles y Usuarios

**RF-01.** El sistema debe permitir al Administrador crear, editar, desactivar y restablecer usuarios, asignándoles uno de los 4 roles: Juez, Asistente, Analista de Datos, Administrador. **Implementado por completo** (Módulo 7): crear/listar (`/usuarios`, cliente admin de Supabase en `gdc/src/lib/supabase/admin.ts`, requiere `SUPABASE_SECRET_KEY` server-side), editar nombre/rol, activar/desactivar (con efecto real de bloqueo, ver RF-31 y migración 021) y restablecer contraseña, todo desde el panel lateral de detalle del usuario.

**RF-02.** El sistema debe restringir el acceso a cada módulo según la tabla de permisos de la sección 2, validando el rol en cada request (RLS de Supabase + validación en el backend). **Implementado** en las migraciones 014–015 (funciones helper + políticas por tabla).

**RF-03.** El sistema debe registrar en la tabla `auditoria` cualquier cambio de rol o desactivación de usuario. **Implementado** (Módulo 7): `editar_usuario` registra cambios de rol/nombre; `activar_usuario`/`desactivar_usuario` registran cada cambio de estado — ver `gdc/src/lib/auditoria.ts` y `/auditoria`.

### Módulo 2 — Gestión de Expedientes y Procesos

**RF-04.** El sistema debe permitir al Administrador registrar un expediente indicando: número de expediente, tipo de proceso (de los 6 catalogados), subtipo (cuando aplique, ej. Ordinario/Sumario dentro de Declarativo), cuantía (o indicar que es indeterminada), y si corresponde a un lanzamiento. **Implementado** (`gdc/src/app/(app)/expedientes/`), incluyendo la validación del tope de cuantía (RF-35/36) al momento de crear el expediente.

**RF-05.** El sistema debe permitir al Administrador asignar un expediente como tarea a un Asistente específico. **Implementado** (columna "Asignado a" en `/expedientes`): una sola asignación activa por expediente (se desactiva la anterior al reasignar). Verificado que un Asistente autenticado solo ve, vía RLS, los expedientes que tiene asignados.

**RF-06.** El sistema debe mostrar al Juez la cantidad de expedientes pendientes de admisión, agrupados por tipo de proceso.

**RF-07.** El sistema debe mostrar al Juez el desglose de expedientes por fase (Admisión, Notificación de la demanda, Audiencia preliminar, Audiencia de fondo) dentro de cada tipo de proceso.

**RF-08.** El sistema debe registrar el historial de cambios de fase de cada expediente (tabla `expediente_fases`), conservando fecha de inicio y fin de cada fase. **Implementado**: fase `admision` se crea automáticamente al registrar el expediente; el Administrador avanza manualmente de fase desde el listado (cierra la fase activa y abre la siguiente en el mismo orden de `ORDEN_FASES`), pidiendo `fecha_notificacion_demanda` al entrar a la fase `notificacion_demanda`.

### Módulo 3 — Generación y Ciclo de Vida de Documentos

**RF-09.** El sistema debe permitir al Asistente generar por código (sin plantilla `.docx` predefinida) un documento del tipo correspondiente (Proveído, Providencia, Auto, Sentencia u Oficio), asociado al expediente correcto. **Implementado** (`gdc/src/app/(app)/documentos/`), restringido a expedientes asignados al Asistente (vía RLS).

**RF-10.** El sistema debe distinguir internamente que Proveído, Providencia, Auto y Sentencia son **resoluciones judiciales**, mientras que Oficio es un **documento de comunicación** aparte (`categoria_documento`). **Implementado** desde la migración 003; el catálogo se usa tal cual en el selector de tipo de documento.

**RF-11.** El sistema debe generar el archivo `.docx` usando la librería `docx` (construcción por código), incluyendo como mínimo: tipo de documento, número de expediente, tipo de proceso, fecha, y espacio para el contenido redactado por el Asistente. **Implementado** (`gdc/src/lib/documentos/generar-docx.ts`), subido a Supabase Storage (bucket privado `documentos-docx`, migración 016) y descargable vía URL firmada.

**RF-12.** El sistema debe permitir al Juez revisar el documento **validado** (la validación de completitud ocurre automáticamente al generarse el `.docx`, no es una acción de rol) y dejar observaciones cuando no esté correcto, cambiando su estado a `en_correccion`. **Implementado y verificado end-to-end** con un usuario Juez real.

**RF-13.** El sistema debe llevar el documento por el siguiente ciclo de estados: `generado` → `validado` (al momento de generarse el `.docx`) → (`en_correccion` si el Juez lo rechaza, regresando a `generado` tras la corrección) → `confirmado` (cuando el Juez confirma que la firma se realizó en el sistema oficial del Órgano Judicial). **Implementado**: la transición a `validado` es automática (en el mismo insert/update, sin pasar visiblemente por `generado`), consistente con la redacción de RF-12.

**RF-14.** El sistema **no debe** ejecutar, generar ni almacenar ninguna firma digital o física; únicamente modela el estado del documento y permite al Juez **confirmar** (cerrar el ciclo) o solicitar **rehacer** (regresar a corrección). **Implementado**: sin ningún campo ni lógica de firma; solo estado + metadata.

**RF-15.** El sistema debe registrar quién generó, quién revisó y quién confirmó cada documento, con las fechas correspondientes. **Implementado**: `generado_por`/`confirmado_por`/`fecha_confirmacion` en la tabla; "quién revisó" se infiere de `observaciones_juez` + `updated_at` (no hay un campo `revisado_por` separado — ver Decisiones Abiertas).

### Módulo 4 — Panel de Control del Juez (Dashboard)

**RF-16.** El sistema debe mostrar al Juez una gráfica mensual del volumen de documentos remitidos, desglosada por tipo (Proveído, Providencia, Auto, Sentencia, Oficio). **Implementado** (`/dashboard`, Recharts): "Documentos Emitidos Este Mes", conteo real por `tipo_documento`.

**RF-17.** El sistema debe permitir al Juez comparar el volumen de expedientes trabajados en el mes actual contra el mes y el año anterior (expedientes ingresados vs. resueltos). **Implementado parcialmente**: comparativo de expedientes *ingresados* mes actual vs. mes anterior. No hay comparativo contra el año anterior todavía (poca antigüedad de datos para probarlo con sentido), y "resueltos" se aproxima con documentos confirmados en vez de un estado de expediente cerrado (el modelo no tiene ese concepto).

**RF-18.** El sistema debe mostrar al Juez un resumen consolidado y actualizado al día del total de expedientes pendientes, agrupado por tipo de proceso y fase. **Implementado parcialmente**: "Carga de Trabajo por Fase" agrupa por fase (Recharts); el agrupado adicional por tipo de proceso no se implementó todavía (con un solo tipo de proceso con datos reales — Declarativo — un desglose 2D no aporta información distinta por ahora).

**RF-19.** El sistema debe actualizar el dashboard del Juez en tiempo real (o near real-time) usando Supabase Realtime cuando cambie el estado de un expediente o documento. **Implementado y verificado end-to-end**, con una vuelta larga: la primera implementación (Postgres Changes, migración 20260709110001) nunca entregaba eventos — bug real de la plataforma, confirmado insertando datos directamente en la base mientras se inspeccionaba el WebSocket del navegador, y aislado con una prueba autorizada de desactivar/reactivar RLS (el evento sí llegaba sin RLS). Postgres Changes de Supabase no entrega eventos de forma confiable cuando la política RLS depende de funciones `SECURITY DEFINER` con sub-consultas (`fn_usuario_rol()`, `fn_expediente_asignado()`), que es exactamente nuestro caso. Se migró al patrón "Broadcast from Database" (migración 20260709120001: trigger que envía una señal ligera — solo tabla + tipo de operación, sin contenido de la fila — a un canal privado autorizado por una política simple en `realtime.messages`). Aun así, el canal seguía rechazando la conexión con `Unauthorized` hasta corregir un segundo problema: `@supabase/ssr` no sincroniza automáticamente el JWT de sesión con el cliente de Realtime (a diferencia del cliente estándar de `supabase-js`) — hubo que llamar `supabase.realtime.setAuth(session.access_token)` explícitamente antes de suscribirse (`gdc/src/app/(app)/dashboard/realtime-refresh.tsx`).

### Módulo 5 — Calendario y Plazos de Audiencias

**RF-20.** El sistema debe mostrar al Juez un calendario con los expedientes que tienen audiencia programada para el mes siguiente. **Implementado** (`/calendario`, `react-big-calendar`): vista mensual con navegación, por defecto abre en el mes siguiente al actual.

**RF-21.** El sistema debe distinguir claramente qué expediente corresponde a cada audiencia mostrada en el calendario. **Implementado**: cada evento muestra número de expediente + tipo de audiencia; al hacer clic se abre un panel con el detalle completo.

**RF-22.** El sistema debe calcular automáticamente la ventana de fecha límite para la audiencia preliminar de un expediente Declarativo, a partir de la `fecha_notificacion_demanda`, usando el plazo configurado según el subtipo:
 - Ordinario: entre 20 y 60 días después de la notificación.
 - Sumario: entre 10 y 20 días después de la notificación.

 **Implementado**: al avanzar un expediente a la fase `audiencia_preliminar` (`gdc/src/app/(app)/expedientes/actions.ts`, `avanzarFase`), el sistema pide la fecha programada y calcula `fecha_limite_calculada = fecha_notificacion_demanda + plazo_audiencia_max_dias` del subtipo, verificado con datos reales (Ordinario: notificación + 60 días).

**RF-22-EXTRA.** El sistema debe calcular automáticamente la ventana de fecha límite para la audiencia de **fondo/final** de un expediente Declarativo Ordinario, a partir de la fecha real de **cierre** de su audiencia preliminar (no de `fecha_notificacion_demanda`), usando `plazo_audiencia_fondo_min_dias`/`max_dias` del subtipo:
 - Ordinario: entre 20 y 40 días después del cierre de la audiencia preliminar. `[VERIFICAR ARTÍCULO EXACTO — aparenta ser Art. 255 núm. 8, no confirmado con certeza por errores de OCR conocidos en la transcripción del Código]`
 - Sumario: sin plazo de audiencia de fondo confirmado por ahora (columnas quedan `null`).

 **Implementado**: al avanzar a `audiencia_fondo`, el ancla usada como "cierre de la preliminar" es la `fecha_programada` de la audiencia preliminar existente (el esquema no tiene un campo `fecha_cierre` separado); `fecha_limite_calculada = esa fecha + plazo_audiencia_fondo_max_dias`. Verificado con datos reales.

**RF-23.** El sistema debe permitir al Administrador configurar (agregar/editar) los plazos de `subtipos_proceso` para nuevos subtipos o tipos de proceso a medida que se definan (ver decisiones abiertas). **Implementado** en el panel de Administración (Módulo 7, `/administracion`) — ver RF-30.

**RF-24.** El sistema debe alertar al Juez y al Asistente cuando un expediente se acerque o exceda la ventana de plazo calculada para su audiencia. **Implementado parcialmente**: la barra de plazo en `/expedientes` (`gdc/src/lib/plazo-audiencia.ts`) colorea en rojo cuando faltan ≤3 días o está vencido, ámbar cuando lleva ≥70% del plazo transcurrido, verde en el resto — verificado con datos reales (audiencia Ordinario mostrando "20d restantes" en verde). Falta una alerta activa (notificación/banner), hoy es solo visual en la tabla.

**RF-24-EXTRA.** El sistema debe alertar al Juez y al Asistente cuando un expediente lleve más de `plazo_admision_dias` (30 días hábiles por defecto, Art. 395, `configuracion_sistema`) en fase `admision` sin haber pasado a `notificacion_demanda`. Esta regla es transversal a los 6 tipos de proceso, ya que el Art. 395 no distingue por tipo. **Implementado** en el Dashboard del Juez (`/dashboard`, panel "Críticos (Art. 395)"), verificado con la regla de negocio (no con un expediente vencido real todavía, ya que ningún expediente de prueba supera los 30 días).

### Módulo 6 — Reportería y KPIs

**RF-25.** El sistema debe permitir al Analista de Datos configurar y alimentar KPIs (ej. volumen por tipo de documento, comparativos mensuales/anuales). **Implementado** (`/kpis`, `gdc/src/app/(app)/kpis/`): el Analista (y el Administrador) puede crear, editar, activar/desactivar y eliminar indicadores desde un panel "Configurador de KPI" (estilo Iustitia, fiel al mockup `configuraci_n_de_kpis_gdc`). Cada KPI define una **entidad base** (Expediente/Documento/Audiencia), una **métrica** (Conteo/Porcentaje de cumplimiento/Promedio de días) y umbrales de rendimiento (óptimo/alerta/crítico, en %). No se acepta un cálculo de texto libre: el motor (`gdc/src/lib/kpis.ts`) solo sabe interpretar esas 9 combinaciones documentadas, cada una con una consulta real (nunca una cifra inventada) — ver migración 020.

**RF-26.** El sistema debe permitir tanto al Juez como al Analista de Datos consultar los KPIs configurados. **Implementado**: `/kpis` es accesible para Juez, Analista de Datos y Administrador (RLS + gate de página); el Juez ve el catálogo y la "Simulación de Visualización" (donut de porcentaje o tendencia de barras según la métrica) en modo solo lectura — sin el panel configurador ni botones de editar/eliminar. Verificado con las cuentas de prueba Juez de Prueba y Analista de Prueba (Playwright).

**RF-27.** El sistema debe generar reportes de volumen de documentos emitidos por período, exportables o visualizables en pantalla. **Implementado**: botón "Exportar volumen de documentos" en `/kpis` (`obtenerVolumenDocumentosCsv` en `actions.ts`) genera un CSV real (mes × tipo de documento × cantidad) a partir de la tabla `documentos`, descargado directamente en el navegador. La visualización en pantalla ya existía vía el catálogo y las tarjetas de tendencia.

**RF-28.** El sistema debe mantener el histórico de KPIs para comparativos mes a mes y año a año. **Implementado con una limitación documentada**: en vez de una tabla de snapshots históricos (que requeriría un job programado inexistente en este stack), el histórico mensual (últimos 6 meses) se calcula **al vuelo** a partir de las fechas ya existentes en `expedientes`/`documentos`/`audiencias` (`created_at`, `fecha_confirmacion`, `fecha_programada`, según la métrica) — es un cálculo real, no una cifra de relleno, pero no persiste un valor "congelado" mes a mes: si se corrige un dato histórico, la serie completa se recalcula. El comparativo año a año no está implementado todavía (la ventana fija es de 6 meses); se deja como mejora futura si el volumen de datos lo justifica.

### Módulo 7 — Administración y Seguridad

**RF-29.** El sistema debe permitir al Administrador definir campos específicos del expediente o del documento que no pueden cargarse por ser información sensible (tabla `campos_restringidos`), bloqueando su ingreso en los formularios correspondientes. **Pospuesto explícitamente por el usuario**: el modelo actual de `expedientes` no guarda ningún dato personal de las partes (solo número, tipo/subtipo, cuantía y fechas), así que hoy no existe un campo sensible real que restringir. Se retoma cuando se modelen datos de partes (nombres, cédula, etc.).

**RF-30.** El sistema debe permitir al Administrador gestionar el catálogo de procesos y números de expediente disponibles para asignación. **Implementado** (`/administracion`, `gdc/src/app/(app)/administracion/`): tabla de subtipos de proceso con sus 4 plazos (audiencia preliminar mín/máx, audiencia de fondo mín/máx) editables desde un panel lateral — esto también resuelve el RF-23 que había quedado pendiente en el Módulo 5 (antes solo se editaba por SQL directo).

**RF-31.** El sistema debe permitir al Administrador administrar usuarios y roles con permisos completos (lectura, modificación, ingreso, eliminación, restablecimiento). **Implementado**: el panel lateral de `/usuarios` ahora permite editar nombre/rol, activar/desactivar la cuenta y restablecer la contraseña (`gdc/src/app/(app)/usuarios/actions.ts`). **Hallazgo de seguridad corregido en el camino**: `usuarios.activo` nunca había tenido ningún efecto real (ni en RLS ni en el login) — ver migración 021 — una cuenta "desactivada" seguía funcionando con total normalidad antes de este módulo.

**RF-32.** El sistema debe estar diseñado de forma que la incorporación futura de un campo `despacho_id`/`tenant_id` no requiera reestructurar las tablas existentes (preparación multi-tenant). **Satisfecho por diseño, sin cambios de código**: ninguna tabla ni política RLS asume un único despacho de forma que impida agregar esa columna después (ver nota en migración 011).

**RF-33.** El sistema debe registrar en `auditoria` cualquier acción de creación, modificación o eliminación realizada por el Administrador sobre configuración, usuarios o catálogos. **Implementado** vía `gdc/src/lib/auditoria.ts` (`registrarAuditoria`), llamado desde crear/editar/activar/desactivar/restablecer usuario, editar subtipo de proceso y editar configuración general. Consultable en `/auditoria`.

**RF-33-EXTRA.** El sistema debe permitir la eliminación de expedientes y documentos, pero cada eliminación debe quedar registrada automáticamente en `auditoria` (garantizado a nivel de base de datos mediante trigger — `fn_auditoria_borrado_expedientes` / `fn_auditoria_borrado_documentos`, migración 013 — no solo por convención de la capa de aplicación). **Implementado**: botón de eliminar (solo Administrador) en `/expedientes` (con confirmación escribiendo el número de expediente, dado que borra en cascada fases/asignaciones/audiencias/documentos — migración 022) y en el workspace de documentos (`/expedientes/[id]/documentos`, con confirmación simple). Verificado en navegador que la eliminación aparece en `/auditoria` con las acciones `eliminar_expediente`, `eliminar_documento` y `eliminar_fase_expediente`.

### Módulo Transversal — Visor de Auditoría (RNF-03)

**Implementado**: `/auditoria` (solo Administrador) — tabla de solo lectura de los últimos 200 registros, con filtros por usuario y entidad, y panel de detalle mostrando el `detalle` (jsonb) completo de cada acción.

### Módulo 8 — Reglas de Negocio: Montos y Cuantía

**RF-34.** El sistema debe limitar el registro de la cuantía de un expediente a un máximo de **B/.10,000.00**, salvo cuando el expediente esté marcado como `es_lanzamiento = true`, en cuyo caso no habrá límite. **Implementado** desde el Módulo 2 (`crearExpediente`, `gdc/src/app/(app)/expedientes/actions.ts`).

**RF-35.** El sistema debe alertar o bloquear el registro de un monto que exceda el tope, si el expediente no es un lanzamiento, según el valor de `configuracion_sistema.modo_validacion_cuantia` ('bloquear' | 'alertar'). **Implementado** desde el Módulo 2, ambos modos verificados.

**RF-36.** El sistema debe permitir al Administrador consultar y ajustar el valor del tope de cuantía (`configuracion_sistema.tope_cuantia`) y su modo de validación, sin necesidad de despliegue de código (fila única editable en `configuracion_sistema`). **Implementado** (Módulo 7, `/administracion`): formulario que edita `tope_cuantia`, `modo_validacion_cuantia` y `plazo_admision_dias` directamente, sin tocar código.

### Módulo 9 — No Integración con el Órgano Judicial

**RF-37.** El sistema no debe establecer ninguna integración técnica (API, base de datos compartida, webhook, etc.) con la plataforma oficial del Órgano Judicial ni con su plugin de Open Office/Word.

**RF-38.** El sistema debe facilitar al Asistente la copia/exportación del contenido generado (texto plano y/o `.docx`) para que sea trasladado manualmente al plugin oficial. **Implementado por completo**: además de la descarga del `.docx`, el workspace de documentos (`/expedientes/[id]/documentos`) tiene un botón "Copiar texto" que copia `contenido_texto` al portapapeles (`navigator.clipboard.writeText`), con confirmación visual. Verificado en navegador.

---

## 5. Requerimientos No Funcionales

**RNF-01 — Seguridad de acceso.** Autenticación vía Supabase Auth; autorización por rol aplicada tanto en RLS (PostgreSQL) como en middleware de Next.js.

**RNF-02 — Confidencialidad de datos judiciales.** El sistema no debe almacenar el contenido legal definitivo/firmado de los documentos (eso reside en el sistema oficial); solo su metadata y el borrador previo a la firma.

**RNF-03 — Auditoría completa.** Toda acción relevante (creación, cambio de estado, asignación, configuración) debe quedar registrada en la tabla `auditoria` con usuario, fecha y detalle.

**RNF-04 — Disponibilidad.** El sistema debe operar con una disponibilidad objetivo de 99.5% mensual, acorde a un despliegue estándar en Vercel + Supabase.

**RNF-05 — Rendimiento del dashboard.** Las consultas del panel del Juez (expedientes por fase, KPIs) deben responder en menos de 2 segundos bajo carga normal del despacho.

**RNF-06 — Actualización en tiempo real.** Los cambios de estado de expedientes/documentos deben reflejarse en el dashboard del Juez sin necesidad de recargar la página (Supabase Realtime).

**RNF-07 — Escalabilidad / preparación multi-tenant.** El modelo de datos y la arquitectura deben permitir agregar aislamiento por despacho/circuito en una fase futura sin romper la estructura existente, aunque esta versión opere para un solo despacho.

**RNF-08 — Usabilidad y accesibilidad.** Interfaces con componentes shadcn/ui, con soporte de navegación por teclado y tamaños de touch target adecuados para uso en tablet/escritorio del despacho.

**RNF-09 — Trazabilidad legal mínima.** Aunque el sistema no ejecuta firmas, debe conservar evidencia suficiente (estado, fechas, usuario) para reconstruir el ciclo completo de cada documento ante una auditoría interna del despacho.

**RNF-10 — Mantenibilidad.** El código de generación de documentos `.docx` debe estar desacoplado por tipo de documento, de forma que al incorporar plantillas oficiales (`docxtemplater`) no sea necesario reescribir la lógica de negocio del ciclo de estados.

**RNF-11 — Compatibilidad de navegador.** Soporte para las últimas 2 versiones de Chrome, Edge y Firefox (navegadores típicos de equipos de despacho judicial).

**RNF-12 — Cumplimiento de protección de datos personales.** Los reportes y KPIs no deben exponer datos personales de las partes más allá de lo estrictamente necesario para el seguimiento administrativo del expediente.

---

## 6. Decisiones Abiertas (pendientes antes de implementación completa)

- **Plazos por tipo/subtipo de proceso — RESUELTO (parcialmente) tras revisión del Código Procesal Civil:**
  - Declarativo Ordinario: audiencia preliminar 20-60 días (Art. 619/252) + audiencia de fondo 20-40 días desde cierre de la preliminar `[VERIFICAR ARTÍCULO EXACTO — aparenta Art. 255 núm. 8]`.
  - Declarativo Sumario: audiencia preliminar 10-20 días (Art. 645 núm. 8); sin plazo de audiencia de fondo confirmado.
  - Declarativos especiales, Jurisdicción voluntaria, Ejecución, Desacato a los tribunales: **investigados y confirmados sin ventana de audiencia parametrizable** análoga a Declarativo — sus plazos son puntuales y dispersos por trámite específico (ej. Art. 741 núm. 3: 5 días para pagar en ejecución; Art. 800 núm. 3: 5 días para descargos en desacato; Art. 687 núm. 3: término probatorio de 3 meses en jurisdicción voluntaria). No se modelan como cálculo automático de audiencia por ahora.
  - Matrimonio: fuera del Código Procesal Civil (Código de Familia), sigue sin parametrizar.
  - Se agregó en cambio un plazo transversal de **admisión** (30 días hábiles, Art. 395) aplicable a los 6 tipos de proceso por igual, vía `configuracion_sistema.plazo_admision_dias`.
  - **Investigado y descartado:** no existe en el Código una norma general de "10 días para trámites varios" — es simplemente el plazo específico más repetido entre decenas de artículos puntuales y no relacionados entre sí (cada uno con su propio trámite y artículo). El verdadero mecanismo supletorio del Código es discrecional (Art. 195: "términos judiciales" fijados por el juez cuando la ley no señala plazo), no automatizable por el sistema.
- **Campos restringidos:** pospuesto explícitamente por el usuario durante el Módulo 7 — el modelo de `expedientes` no guarda hoy ningún dato personal de las partes (solo número, tipo/subtipo, cuantía, fechas), así que no hay un campo sensible real que restringir todavía. Se retoma cuando se decida modelar datos de partes (nombres, cédula, etc.).
- **Plantilla `.docx` oficial:** por ahora la generación es por código; si en el futuro se define una plantilla oficial, se migraría a `docxtemplater` (el modelo de datos ya lo soporta sin cambios).
- **Repositorio Git/GitHub:** ✅ resuelto — repo privado creado en https://github.com/Juan26Esquivel/gdc, con commits regulares por avance.
- **RF-15 — "quién revisó" un documento:** la tabla `documentos` no tiene un campo `revisado_por` separado; solo se infiere de `observaciones_juez` (si tiene texto, alguien lo revisó y rechazó) y de `confirmado_por` (si fue aprobado directamente). Si se necesita trazabilidad explícita de cada revisión (incluyendo aprobaciones sin observaciones), se requeriría una tabla `documento_revisiones` separada — no implementada por ahora.
- **RF-01 — edición/desactivación/restablecimiento de usuarios:** ✅ resuelto en el Módulo 7.
- **RF-38 — botón de copiar texto plano:** ✅ resuelto — botón "Copiar texto" en el workspace de documentos.

---

## 7. Componentes de UI (referencia inicial)

- `ExpedienteForm` — alta/edición de expediente (tipo, subtipo, cuantía, lanzamiento, fecha de notificación).
- `ExpedienteList` / `ExpedienteFilters` — listado con filtros por tipo de proceso, fase y estado.
- `DocumentoGenerator` — formulario de generación de documento por tipo, con vista previa antes de exportar `.docx`.
- `DocumentoStatusBadge` / `DocumentoTimeline` — visualización del ciclo de estados del documento.
- `JuezDashboard` — panel con conteo de pendientes por fase, gráfica mensual (Recharts) y resumen consolidado.
- `CalendarioAudiencias` — vista de calendario (react-big-calendar) con expedientes por audiencia.
- `KpiConfigPanel` — panel del Analista de Datos para configurar/alimentar KPIs.
- `KpiViewer` — vista de consulta de KPIs para Juez y Analista de Datos.
- `AdminPanel` — gestión de usuarios, roles, campos restringidos, catálogos de proceso, tope de cuantía.
- `AsignacionesPanel` — asignación de expedientes a Asistentes.

---

## 8. Checklist de Estado de Implementación

- [x] Migraciones 001–023 aplicadas en Supabase (proyecto "GDC", vía `gdc/supabase/migrations/` + `supabase db push`)
- [x] Seed de catálogo (`gdc/supabase/seed.sql`: tipos_proceso, subtipos_proceso, tipos_documento) aplicado y verificado
- [x] RLS configurado por rol para cada tabla (migraciones 014–015, corrección en 017), verificado con `pg_class`/`pg_policies` en las 13 tablas y con usuarios reales de cada rol
- [x] Proyecto Next.js inicializado (`gdc/`, App Router, TypeScript, Tailwind 4, shadcn/ui) con Supabase Auth conectado (`src/lib/supabase/{client,server,middleware}.ts`) y verificado end-to-end en navegador: login real → middleware protege `/dashboard` → lectura de `usuarios` vía RLS muestra rol correcto
- [x] Módulo 1 — Roles y Usuarios (RF-01 a RF-03): crear/listar/editar/activar-desactivar/restablecer contraseña (RF-01), RLS por rol (RF-02) y auditoría de cambios de rol/desactivación (RF-03) — todo implementado y verificado end-to-end
- [x] Módulo 2 — Expedientes y Procesos (RF-04 a RF-08): alta, fases, asignaciones — verificado end-to-end con usuario Asistente real
- [x] Módulo 3 — Documentos y Ciclo de Vida (RF-09 a RF-15): generación de `.docx` real (Storage), ciclo generado→validado→en_corrección→confirmado verificado end-to-end con usuarios Asistente y Juez reales
- [x] Sistema de diseño "Iustitia GDC" (`docs_extra/stitch_document_verification_and_proposal/`) aplicado retroactivamente — Fases 0 a 3 completas:
  - Fase 0: tema navy/stone-gray, tipografía Geist+Inter+Courier Prime, sidebar oscuro + header, componentes `EstadoBadge`/`RolBadge`/`AvatarIniciales`/`StatCard`.
  - Fase 1: Usuarios — panel lateral (`Sheet`) en vez de diálogo para ver detalle.
  - Fase 2: Expedientes — stat cards, filtros por tipo/fase, barra de plazo (sin datos de audiencias reales todavía, ya que el módulo de Audiencias no está construido).
  - Fase 3: Documentos — nueva vista por expediente (`/expedientes/[id]/documentos`) de 3 columnas (historial, editor Tiptap, observaciones + trazabilidad adaptada a los 4 estados reales sin ningún paso de firma, preservando RF-14); el listado global `/documentos` quedó como resumen de solo lectura con enlace "Ver expediente". Verificado end-to-end con los 3 roles reales: generar → observar → rehacer → confirmar.
  - Dashboard del Juez, KPIs, Administración y Auditoría: construidos directamente en este estilo cuando les tocó el turno.
  - Login (`/login`): quedó fuera del retrofit original (Fases 0–3 solo cubrieron el shell autenticado) — se aplicó después, a partir del mockup `docs_extra/stitch_document_verification_and_proposal/login/`, tras notarlo el usuario. Se omitieron del mockup el enlace "Olvidé mi contraseña" (no existe autoservicio de reset), el selector de idioma, "Soporte Técnico" y los 3 links legales del footer (Transparencia/Privacidad/Términos) — ninguno de esos existe en la app, y agregarlos habría simulado funciones inexistentes. Verificado end-to-end: login correcto, credenciales inválidas, diseño fiel al mockup.
- [x] Módulo 4 — Dashboard del Juez (RF-16 a RF-19): stat cards, gráficas Recharts, panel de críticos (RF-24-EXTRA) y Realtime (Broadcast from Database) verificados end-to-end con datos reales
- [x] Módulo 5 — Calendario y Plazos (RF-20 a RF-24, RF-22-EXTRA, RF-24-EXTRA): calendario y cálculo de plazos implementados y verificados con datos reales; RF-24-EXTRA en el Dashboard del Juez; RF-23 (UI de configuración de plazos por subtipo) resuelto en el Módulo 7 (`/administracion`)
- [x] Módulo 6 — Reportería y KPIs (RF-25 a RF-28): configurador de KPIs, consulta de solo lectura para el Juez, exportación CSV de volumen de documentos y tendencia mensual calculada en tiempo real — sin snapshots históricos ni comparativo año a año (ver limitación documentada en RF-28). Verificado end-to-end con Analista de Prueba (crear/editar/eliminar) y Juez de Prueba (solo consulta)
- [~] Módulo 7 — Administración y Seguridad (RF-29 a RF-33, RF-33-EXTRA): usuarios (editar/desactivar/restablecer), catálogo de procesos y plazos, configuración general (tope de cuantía, plazo de admisión), visor de auditoría (RNF-03) y eliminación de expedientes/documentos con auditoría automática — todo implementado y verificado end-to-end. RF-29 (campos restringidos) pospuesto explícitamente por el usuario (sin datos de partes que restringir todavía)
- [x] Módulo 8 — Reglas de Montos y Cuantía (RF-34 a RF-36): validación de tope (Módulo 2) + UI de administración del tope/modo (Módulo 7), todo verificado
- [x] Módulo 9 — Validación de no-integración con Órgano Judicial (RF-37 a RF-38): RF-37 satisfecho por diseño; RF-38 con botón de "Copiar texto" en el workspace de documentos, verificado en navegador (portapapeles)
- [x] Barra de búsqueda global y campana de notificaciones (header, antes decorativas — Fase 0 del sistema de diseño Iustitia): búsqueda multidato (expedientes + documentos) insensible a tildes/mayúsculas vía `gdc/src/app/(app)/busqueda-actions.ts`; notificaciones reales por rol (documentos pendientes de revisión/corrección, expedientes que exceden el plazo de admisión) vía `gdc/src/lib/notificaciones.ts` — sin tabla de notificaciones nueva, reutiliza datos ya existentes. Verificado con las 4 cuentas de prueba (Administrador, Juez, Asistente, Analista)
- [x] Trigger de auditoría de borrado verificado en entorno de prueba (migración 013, ampliado en 022 a fases/audiencias) — confirmado end-to-end: eliminar un expediente de prueba generó entradas `eliminar_expediente`, `eliminar_documento` y `eliminar_fase_expediente` visibles en `/auditoria`
- [~] Decisiones abiertas de la sección 6 resueltas: repositorio Git/GitHub ✅; campos restringidos pospuesto explícitamente (RF-29); plantilla oficial `.docx` sigue pendiente
