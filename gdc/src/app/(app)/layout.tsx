import { redirect } from "next/navigation";
import { Scale, Search, Bell } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { ROL_LABEL } from "@/lib/roles";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/sidebar-nav";
import { AvatarIniciales } from "@/components/avatar-iniciales";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();

  if (!usuario) {
    redirect("/login?error=No se encontró un perfil activo para esta cuenta");
  }

  if (!usuario.activo) {
    redirect("/login?error=Tu cuenta está desactivada, contacta al Administrador");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Scale className="size-6 text-sidebar-primary-foreground" />
          <div>
            <p className="font-heading text-lg font-semibold leading-tight">GDC</p>
            <p className="text-xs text-sidebar-foreground/60">Gestor Documental</p>
          </div>
        </div>
        <SidebarNav rol={usuario.rol} />
        <div className="border-t border-sidebar-border pt-4">
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
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar expedientes, documentos…"
              disabled
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <Bell className="size-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{usuario.nombre_completo}</p>
              <p className="text-xs text-muted-foreground">{ROL_LABEL[usuario.rol]}</p>
            </div>
            <AvatarIniciales nombreCompleto={usuario.nombre_completo} />
          </div>
        </header>
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
