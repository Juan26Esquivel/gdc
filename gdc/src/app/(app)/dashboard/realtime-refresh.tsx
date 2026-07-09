"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// RF-19: refresca el dashboard cuando cambia un expediente, documento o
// audiencia. Usa "Broadcast from Database" (migración 20260709120001) en vez
// de "Postgres Changes": este último no entrega eventos cuando la política
// RLS depende de funciones SECURITY DEFINER con sub-consultas (confirmado en
// pruebas). El trigger en la base de datos envía solo una señal ligera (tabla
// + tipo de operación, sin contenido de la fila); al recibirla, se vuelve a
// pedir los datos por la vía normal, que sí respeta RLS.
//
// `@supabase/ssr` no sincroniza automáticamente el JWT de sesión con el
// cliente de Realtime (a diferencia del cliente estándar de supabase-js) —
// hay que llamar realtime.setAuth() explícitamente con el access_token antes
// de suscribirse, o la autorización del canal privado falla en silencio con
// "Unauthorized" (confirmado con el Realtime Inspector del dashboard).
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;

    async function conectar() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelado || !session) return;

      supabase.realtime.setAuth(session.access_token);

      const canal = supabase
        .channel("dashboard-cambios", { config: { private: true } })
        .on("broadcast", { event: "cambio" }, () => router.refresh())
        .subscribe();

      return canal;
    }

    const canalPromise = conectar();

    return () => {
      cancelado = true;
      canalPromise.then((canal) => {
        if (canal) supabase.removeChannel(canal);
      });
    };
  }, [router]);

  return null;
}
