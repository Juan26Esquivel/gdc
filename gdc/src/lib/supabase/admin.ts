import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente con privilegios de administrador (bypass RLS vía la clave secreta).
 * Solo debe usarse dentro de Server Actions o Route Handlers para operaciones
 * que la API pública de Supabase Auth no permite (ej. crear usuarios).
 * El paquete "server-only" hace que el build falle si esto se importa desde
 * un Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
