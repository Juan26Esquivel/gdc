"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { ItemNotificacion } from "@/lib/notificaciones";

export function NotificacionesBell({ items }: { items: ItemNotificacion[] }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative" />
        }
      >
        <Bell className="size-5 text-muted-foreground" />
        {items.length > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notificaciones
        </p>
        {items.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">No hay notificaciones nuevas.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                {item.mensaje}
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
