import { createClient } from "@/lib/supabase/server";
import type { RolGdc } from "@/lib/auth/current-user";

export type ItemNotificacion = { id: string; mensaje: string; href: string };

function plural(cantidad: number, singular: string, plural: string) {
  return cantidad === 1 ? singular : plural;
}

/**
 * Notificaciones reales (no decorativas): reutiliza datos ya calculados en
 * otros módulos (documentos pendientes de revisión/corrección, expedientes
 * que exceden el plazo de admisión — RF-24-EXTRA) en vez de mantener una
 * tabla de notificaciones separada que habría que sincronizar aparte.
 */
export async function obtenerNotificaciones(rol: RolGdc): Promise<ItemNotificacion[]> {
  const supabase = await createClient();
  const items: ItemNotificacion[] = [];

  if (rol === "administrador" || rol === "juez") {
    const { count: porRevisar } = await supabase
      .from("documentos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "validado");

    if (porRevisar) {
      items.push({
        id: "documentos-por-revisar",
        mensaje: `${porRevisar} ${plural(porRevisar, "documento pendiente", "documentos pendientes")} de revisión`,
        href: "/documentos",
      });
    }

    const { data: configuracion } = await supabase
      .from("configuracion_sistema")
      .select("plazo_admision_dias")
      .eq("id", 1)
      .single();
    const plazoAdmisionDias = configuracion?.plazo_admision_dias ?? 30;
    const limite = new Date();
    limite.setDate(limite.getDate() - plazoAdmisionDias);

    const { data: expedientes } = await supabase
      .from("expedientes")
      .select("expediente_fases(fase, fecha_fin, fecha_inicio)");

    const criticos = (expedientes ?? []).filter((exp) => {
      const admisionActiva = exp.expediente_fases.find(
        (f) => f.fase === "admision" && f.fecha_fin === null,
      );
      return admisionActiva && new Date(admisionActiva.fecha_inicio) < limite;
    }).length;

    if (criticos) {
      items.push({
        id: "expedientes-criticos",
        mensaje: `${criticos} ${plural(criticos, "expediente excede", "expedientes exceden")} el plazo de admisión`,
        href: "/dashboard",
      });
    }
  }

  if (rol === "asistente") {
    const { count: porCorregir } = await supabase
      .from("documentos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "en_correccion");

    if (porCorregir) {
      items.push({
        id: "documentos-por-corregir",
        mensaje: `${porCorregir} ${plural(porCorregir, "documento con observaciones", "documentos con observaciones")} por corregir`,
        href: "/documentos",
      });
    }
  }

  return items;
}
