import type { RolGdc } from "@/lib/auth/current-user";

export type NavItem = {
  href: string;
  label: string;
  roles: RolGdc[];
};

// Se amplía a medida que se construyen los módulos correspondientes.
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Panel principal",
    roles: ["juez", "asistente", "analista_datos", "administrador"],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    roles: ["administrador"],
  },
  {
    href: "/expedientes",
    label: "Expedientes",
    roles: ["juez", "asistente", "administrador"],
  },
  {
    href: "/documentos",
    label: "Documentos",
    roles: ["juez", "asistente", "administrador"],
  },
];
