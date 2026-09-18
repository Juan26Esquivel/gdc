import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { ROL_LABEL } from "@/lib/roles";
import { obtenerNotificaciones } from "@/lib/notificaciones";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/sidebar-nav";
import { AvatarIniciales } from "@/components/avatar-iniciales";
import { GlobalSearch } from "@/components/global-search";
import { NotificacionesBell } from "@/components/notificaciones-bell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();

  if (!usuario) {
    redirect("/login?error=No se encontró un perfil activo para esta cuenta");
  }

  if (!usuario.activo) {
    redirect("/login?error=Tu cuenta está desactivada, contacta al Administrador");
  }

  const notificaciones = await obtenerNotificaciones(usuario.rol);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        {/* Scroll propio del menú: si la lista de opciones creciera más de lo
            que cabe en la pantalla, se desplaza sola, sin arrastrar consigo
            el bloque de usuario/cerrar sesión de abajo. */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6 flex items-center gap-2 px-2">
            <Scale className="size-6 text-sidebar-primary-foreground" />
            <div>
              <p className="font-heading text-lg font-semibold leading-tight">GDC</p>
              <p className="text-xs text-sidebar-foreground/60">Gestor Documental</p>
            </div>
          </div>
          <SidebarNav rol={usuario.rol} />
        </div>
        <div className="shrink-0 border-t border-sidebar-border p-4">
          <div className="flex items-center gap-2 px-2 pb-2">
            <AvatarIniciales nombreCompleto={usuario.nombre_completo} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{usuario.nombre_completo}</p>
              <p className="text-xs text-sidebar-foreground/60">{ROL_LABEL[usuario.rol]}</p>
            </div>
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
          <GlobalSearch />
          <NotificacionesBell items={notificaciones} />
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{usuario.nombre_completo}</p>
              <p className="text-xs text-muted-foreground">{ROL_LABEL[usuario.rol]}</p>
            </div>
            <AvatarIniciales nombreCompleto={usuario.nombre_completo} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
