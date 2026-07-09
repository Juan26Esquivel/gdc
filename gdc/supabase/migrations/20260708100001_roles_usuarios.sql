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
