"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";
import type { RolGdc } from "@/lib/auth/current-user";

export function SidebarNav({ rol }: { rol: RolGdc }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol));

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icono = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activo
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icono className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
