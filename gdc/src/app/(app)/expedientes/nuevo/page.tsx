import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/current-user";
import { getTiposProceso, getSubtiposProceso, getFasesProceso } from "@/lib/catalogos";
import { Card, CardContent } from "@/components/ui/card";

const DESCRIPCION: Record<string, string> = {
  "Declarativo·Ordinario": "Reclamos entre partes de mayor cuantía (contractual, daños y perjuicios).",
  "Declarativo·Sumario": "Trámites breves: lanzamientos por intruso o por mora.",
  Ejecución: "Cobro de pagarés y mandamientos de pago, con embargo y edicto emplazatorio.",
  "Jurisdicción voluntaria": "Sucesiones testadas e intestadas, con edicto emplazatorio y adjudicación de bienes.",
  Matrimonio: "Trámites matrimoniales dentro o fuera del despacho. Se rige por el Código de la Familia.",
};

export default async function NuevoExpedientePaso1() {
  const usuario = await getUsuarioActual();
  if (usuario?.rol !== "administrador") redirect("/expedientes");

  const [tiposProceso, subtiposProceso, fasesProceso] = await Promise.all([
    getTiposProceso(),
    getSubtiposProceso(),
    getFasesProceso(),
  ]);

  const tieneFases = (tipoId: number) => fasesProceso.some((f) => f.tipo_proceso_id === tipoId);

  type Opcion = {
    key: string;
    tipoId: number;
    subtipoId: number | null;
    nombre: string;
    descripcion: string;
    habilitado: boolean;
  };

  const opciones: Opcion[] = [];
  for (const tipo of tiposProceso) {
    const subtipos = subtiposProceso.filter((s) => s.tipo_proceso_id === tipo.id);
    const habilitado = tieneFases(tipo.id) || tipo.nombre === "Matrimonio";
    if (subtipos.length > 0) {
      for (const sub of subtipos) {
        opciones.push({
          key: `${tipo.id}-${sub.id}`,
          tipoId: tipo.id,
          subtipoId: sub.id,
          nombre: `${tipo.nombre} · ${sub.nombre}`,
          descripcion: DESCRIPCION[`${tipo.nombre}·${sub.nombre}`] ?? "",
          habilitado,
        });
      }
    } else {
      opciones.push({
        key: `${tipo.id}`,
        tipoId: tipo.id,
        subtipoId: null,
        nombre: tipo.nombre,
        descripcion: DESCRIPCION[tipo.nombre] ?? "",
        habilitado,
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/expedientes" className="underline underline-offset-2">
          Expedientes
        </Link>{" "}
        / Nuevo expediente
      </p>

      <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5 text-primary">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            1
          </span>
          Tipo de proceso
        </span>
        <span className="h-px w-6 bg-border" />
        <span className="flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-muted">2</span>
          Datos del expediente
        </span>
      </div>

      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">¿Qué tipo de expediente vas a registrar?</h1>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
          Cada tipo de proceso tiene sus propios campos, fechas y plazos — selecciona uno para continuar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opciones.map((op) =>
          op.habilitado ? (
            <Link key={op.key} href={`/expedientes/nuevo/datos?tipo=${op.tipoId}${op.subtipoId ? `&subtipo=${op.subtipoId}` : ""}`}>
              <Card className="h-full cursor-pointer transition-colors hover:border-primary">
                <CardContent className="flex flex-col gap-2 p-5">
                  <p className="font-heading text-sm font-semibold">{op.nombre}</p>
                  <p className="flex-1 text-xs text-muted-foreground">{op.descripcion}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={op.key} className="h-full opacity-60">
              <CardContent className="flex flex-col gap-2 p-5">
                <p className="font-heading text-sm font-semibold">{op.nombre}</p>
                <p className="flex-1 text-xs text-muted-foreground">{op.descripcion}</p>
                <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                  Pendiente definir catálogo de fases
                </span>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <div className="flex justify-center">
        <Link href="/expedientes" className="text-sm font-medium text-muted-foreground underline underline-offset-2">
          Cancelar
        </Link>
      </div>
    </div>
  );
}
