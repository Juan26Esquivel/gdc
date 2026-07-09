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
