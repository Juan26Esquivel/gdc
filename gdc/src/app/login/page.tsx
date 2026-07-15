import { Scale, Mail, Lock, ShieldCheck } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const anioActual = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-6">
        <Scale className="size-5 text-primary" />
        <span className="font-heading text-sm font-semibold text-primary">
          GDC — Gestor Documental
        </span>
      </header>

      <main
        className="flex flex-1 items-center justify-center p-4"
        style={{
          background: "radial-gradient(circle at 50% 50%, var(--background) 0%, var(--muted) 100%)",
        }}
      >
        <div className="w-full max-w-[440px] rounded-lg border border-border bg-card p-8 shadow-sm md:p-10">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-2xl font-semibold text-primary">GDC</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Gestor Documental Completo
            </p>
          </div>

          <form action={login} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide">
                Correo institucional
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ejemplo@despacho.gob.pa"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="h-11 w-full">
              Acceder al Sistema
            </Button>
          </form>

          <div className="mt-8 flex gap-3 rounded-md border-l-2 border-primary bg-muted p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                Aviso de Seguridad
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Este sistema es para uso exclusivo del personal autorizado del despacho. Toda
                actividad queda registrada para garantizar la integridad de los procesos
                judiciales.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-1 border-t border-border bg-muted/50 px-6 py-6 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          GDC — Gestor Documental
        </span>
        <p className="text-xs text-muted-foreground">
          © {anioActual} GDC — Gestor Documental. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
