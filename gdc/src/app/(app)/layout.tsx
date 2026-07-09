import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { NAV_ITEMS } from "@/lib/nav-items";
import { ROL_LABEL } from "@/lib/roles";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();

  if (!usuario) {
    redirect("/login?error=No se encontró un perfil activo para esta cuenta");
  }

  if (!usuario.activo) {
    redirect("/login?error=Tu cuenta está desactivada, contacta al Administrador");
  }

  const itemsVisibles = NAV_ITEMS.filter((item) => item.roles.includes(usuario.rol));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r bg-muted/20 p-4">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold">GDC</p>
          <p className="text-xs text-muted-foreground">Gestor Documental</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {itemsVisibles.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-4">
          <p className="px-2 text-sm font-medium">{usuario.nombre_completo}</p>
          <p className="px-2 text-xs text-muted-foreground">{ROL_LABEL[usuario.rol]}</p>
          <form action={logout} className="mt-2">
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
