-- Habilita Supabase Realtime (RF-19) para que el Dashboard del Juez se
-- actualice sin recargar la página cuando cambie el estado de un expediente
-- o documento. Las suscripciones de Realtime respetan las políticas RLS ya
-- definidas (migraciones 014-015, 017): cada usuario solo recibe eventos de
-- las filas que también podría leer vía SELECT.
alter publication supabase_realtime add table expedientes;
alter publication supabase_realtime add table documentos;
alter publication supabase_realtime add table audiencias;
