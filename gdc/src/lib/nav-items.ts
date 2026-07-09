import { LayoutDashboard, Users, Folder, FileText, Calendar, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RolGdc } from "@/lib/auth/current-user";

export type NavItem = {
  href: string;
  label: string;
  roles: RolGdc[];
  icon: LucideIcon;
};

// Se amplía a medida que se construyen los módulos correspondientes.
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Panel principal",
    roles: ["juez", "asistente", "analista_datos", "administrador"],
    icon: LayoutDashboard,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    roles: ["administrador"],
    icon: Users,
  },
  {
    href: "/expedientes",
    label: "Expedientes",
    roles: ["juez", "asistente", "administrador"],
    icon: Folder,
  },
  {
    href: "/documentos",
    label: "Documentos",
    roles: ["juez", "asistente", "administrador"],
    icon: FileText,
  },
  {
    href: "/calendario",
    label: "Calendario",
    roles: ["juez", "asistente", "administrador"],
    icon: Calendar,
  },
  {
    href: "/kpis",
    label: "KPIs",
    roles: ["juez", "analista_datos", "administrador"],
    icon: BarChart3,
  },
];
