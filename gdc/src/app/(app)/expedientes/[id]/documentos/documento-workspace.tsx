"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  generarDocumento,
  rehacerDocumento,
  dejarObservaciones,
  confirmarDocumento,
  eliminarDocumento,
  type EstadoGenerarDocumento,
  type EstadoRevisarDocumento,
} from "@/app/(app)/documentos/actions";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EstadoBadge } from "@/components/estado-badge";
import { TiptapEditor } from "@/components/tiptap-editor";
import type { RolGdc } from "@/lib/auth/current-user";

type Documento = {
  id: string;
  tipo_documento_id: number;
  estado: string;
  contenido_texto: string | null;
  observaciones_juez: string | null;
  urlDescarga: string | null;
  created_at: string;
  updated_at: string;
  fecha_confirmacion: string | null;
  tipos_documento: { nombre: string } | null;
  generado_por_usuario: { nombre_completo: string } | null;
  confirmado_por_usuario: { nombre_completo: string } | null;
};

type TipoDocumento = { id: number; nombre: string };

const ESTADO_INICIAL_GENERAR: EstadoGenerarDocumento = {};
const ESTADO_INICIAL_REVISAR: EstadoRevisarDocumento = {};

// Refresca los datos del Server Component (revalidatePath ya invalidó el caché;
// esto hace que la página los vuelva a pedir) apenas una acción resuelve con éxito.
// router.refresh() es un efecto de navegación, no un setState de React: debe
// llamarse desde un useEffect, no durante el render (a diferencia del patrón de
// "derivar estado durante el render" usado en los diálogos de otros módulos).
function useRefrescarAlExito(ok: boolean | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (ok) router.refresh();
  }, [ok, router]);
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DocumentoWorkspace({
  expedienteId,
  documentos,
  tiposDocumento,
  rol,
}: {
  expedienteId: string;
  documentos: Documento[];
  tiposDocumento: TipoDocumento[];
  rol: RolGdc;
}) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(documentos[0]?.id ?? null);
  const seleccionado = documentos.find((d) => d.id === seleccionadoId) ?? null;

  const puedeGenerar = rol === "asistente" || rol === "administrador";
  const puedeRevisar = rol === "juez" || rol === "administrador";

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
      {/* Columna 1: Historial del caso */}
      <Card className="h-fit">
        <CardContent className="flex flex-col gap-1 p-3">
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Historial del caso
          </p>
          {puedeGenerar && (
            <button
              type="button"
              onClick={() => setSeleccionadoId(null)}
              className={`rounded-md border-l-2 p-2 text-left text-sm transition-colors ${
                seleccionadoId === null
                  ? "border-primary bg-accent"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              + Nuevo documento
            </button>
          )}
          {documentos.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSeleccionadoId(doc.id)}
              className={`flex flex-col gap-1 rounded-md border-l-2 p-2 text-left transition-colors ${
                seleccionadoId === doc.id
                  ? "border-primary bg-accent"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              <EstadoBadge estado={doc.estado} />
              <span className="text-sm font-medium">{doc.tipos_documento?.nombre}</span>
              <span className="text-xs text-muted-foreground">
                {formatearFecha(doc.created_at)}
              </span>
            </button>
          ))}
          {documentos.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">Sin documentos todavía.</p>
          )}
        </CardContent>
      </Card>

      {/* Columna 2: Editor */}
      <div>
        {seleccionado ? (
          <DocumentoExistente
            documento={seleccionado}
            puedeGenerar={puedeGenerar}
            esAdmin={rol === "administrador"}
          />
        ) : puedeGenerar ? (
          <NuevoDocumentoForm expedienteId={expedienteId} tiposDocumento={tiposDocumento} />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Selecciona un documento del historial para revisarlo.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Columna 3: Observaciones + trazabilidad */}
      <div className="flex flex-col gap-4">
        {seleccionado && (
          <>
            <PanelObservaciones documento={seleccionado} puedeRevisar={puedeRevisar} />
            <PanelTrazabilidad documento={seleccionado} />
          </>
        )}
      </div>
    </div>
  );
}

function NuevoDocumentoForm({
  expedienteId,
  tiposDocumento,
}: {
  expedienteId: string;
  tiposDocumento: TipoDocumento[];
}) {
  const [tipoDocumentoId, setTipoDocumentoId] = useState("");
  const [contenido, setContenido] = useState("");
  const [estado, formAction, pending] = useActionState(generarDocumento, ESTADO_INICIAL_GENERAR);
  useRefrescarAlExito(estado.ok);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="expediente_id" value={expedienteId} />
          <input type="hidden" name="tipo_documento_id" value={tipoDocumentoId} />
          <input type="hidden" name="contenido_texto" value={contenido} />
          <div className="flex flex-col gap-2">
            <Label>Tipo de documento</Label>
            <Select value={tipoDocumentoId} onValueChange={(v) => setTipoDocumentoId(v ?? "")}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecciona un tipo">
                  {(value: string | null) =>
                    tiposDocumento.find((t) => String(t.id) === value)?.nombre ?? "Selecciona un tipo"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tiposDocumento.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TiptapEditor contenidoInicial="" onChangeTexto={setContenido} />
          {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
          <Button type="submit" disabled={pending || !tipoDocumentoId || !contenido.trim()}>
            {pending ? "Generando…" : "Generar .docx"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DocumentoExistente({
  documento,
  puedeGenerar,
  esAdmin,
}: {
  documento: Documento;
  puedeGenerar: boolean;
  esAdmin: boolean;
}) {
  const puedeRehacer = puedeGenerar && documento.estado === "en_correccion";
  const [contenido, setContenido] = useState(documento.contenido_texto ?? "");
  const [estado, formAction, pending] = useActionState(rehacerDocumento, ESTADO_INICIAL_GENERAR);
  const [eliminando, setEliminando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const router = useRouter();
  useRefrescarAlExito(estado.ok);

  // RF-38: el Asistente traslada el contenido manualmente al plugin oficial
  // del Órgano Judicial (GDC no se integra con él) — copiar el texto plano
  // es más rápido que seleccionarlo a mano dentro del editor.
  async function alCopiarTexto() {
    if (!documento.contenido_texto) return;
    await navigator.clipboard.writeText(documento.contenido_texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function alEliminar() {
    if (
      !confirm(
        `¿Eliminar el documento "${documento.tipos_documento?.nombre}"? Esta acción es irreversible y queda registrada en Auditoría.`,
      )
    ) {
      return;
    }
    setEliminando(true);
    const resultado = await eliminarDocumento(documento.id);
    setEliminando(false);
    if (!resultado.error) router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-sm font-semibold">{documento.tipos_documento?.nombre}</p>
            <p className="text-xs text-muted-foreground">
              Generado por {documento.generado_por_usuario?.nombre_completo} el{" "}
              {formatearFecha(documento.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {documento.contenido_texto && (
              <button
                type="button"
                onClick={alCopiarTexto}
                className="text-sm underline"
              >
                {copiado ? "¡Copiado!" : "Copiar texto"}
              </button>
            )}
            {documento.urlDescarga && (
              <a
                href={documento.urlDescarga}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                Descargar .docx
              </a>
            )}
            {esAdmin && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Eliminar documento"
                onClick={alEliminar}
                disabled={eliminando}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {puedeRehacer ? (
          <form
            action={formAction}
            className="flex flex-col gap-4"
            key={documento.id}
          >
            <input type="hidden" name="documento_id" value={documento.id} />
            <input type="hidden" name="contenido_texto" value={contenido} />
            <TiptapEditor
              contenidoInicial={documento.contenido_texto ?? ""}
              onChangeTexto={setContenido}
            />
            {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
            <Button type="submit" disabled={pending || !contenido.trim()}>
              {pending ? "Reenviando…" : "Reenviar corrección"}
            </Button>
          </form>
        ) : (
          <TiptapEditor
            key={documento.id}
            contenidoInicial={documento.contenido_texto ?? ""}
            editable={false}
          />
        )}
      </CardContent>
    </Card>
  );
}

function PanelObservaciones({
  documento,
  puedeRevisar,
}: {
  documento: Documento;
  puedeRevisar: boolean;
}) {
  const [estadoObservar, observarAction, pendingObservar] = useActionState(
    dejarObservaciones,
    ESTADO_INICIAL_REVISAR,
  );
  const [estadoConfirmar, confirmarAction, pendingConfirmar] = useActionState(
    confirmarDocumento,
    ESTADO_INICIAL_REVISAR,
  );
  useRefrescarAlExito(estadoObservar.ok || estadoConfirmar.ok);

  const puedeActuar = puedeRevisar && documento.estado === "validado";

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="font-heading text-sm font-semibold">Observaciones del Juez</p>
        {documento.observaciones_juez ? (
          <p className="rounded-md bg-muted p-3 text-sm">{documento.observaciones_juez}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Sin observaciones registradas.</p>
        )}

        {puedeActuar && (
          <>
            <form action={observarAction} className="flex flex-col gap-2" key={`obs-${documento.id}`}>
              <input type="hidden" name="documento_id" value={documento.id} />
              <Textarea name="observaciones_juez" rows={3} placeholder="Escribe una observación…" required />
              {estadoObservar.error && (
                <p className="text-xs text-destructive">{estadoObservar.error}</p>
              )}
              <Button type="submit" variant="outline" size="sm" disabled={pendingObservar}>
                {pendingObservar ? "Enviando…" : "Enviar a corrección"}
              </Button>
            </form>
            <form action={confirmarAction} key={`conf-${documento.id}`}>
              <input type="hidden" name="documento_id" value={documento.id} />
              <Button type="submit" size="sm" className="w-full" disabled={pendingConfirmar}>
                {pendingConfirmar ? "Confirmando…" : "Confirmar"}
              </Button>
            </form>
            {estadoConfirmar.error && (
              <p className="text-xs text-destructive">{estadoConfirmar.error}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PanelTrazabilidad({ documento }: { documento: Documento }) {
  const pasos = [
    {
      titulo: "Generado",
      detalle: documento.generado_por_usuario?.nombre_completo,
      fecha: documento.created_at,
      completado: true,
    },
    {
      titulo: "Validado",
      detalle: "Automático (completitud verificada)",
      fecha: documento.created_at,
      completado: true,
    },
    ...(documento.observaciones_juez
      ? [
          {
            titulo: "En corrección",
            detalle: "Observaciones del Juez",
            fecha: documento.updated_at,
            completado: documento.estado !== "en_correccion",
          },
        ]
      : []),
    {
      titulo: "Confirmado",
      detalle: documento.confirmado_por_usuario?.nombre_completo,
      fecha: documento.fecha_confirmacion,
      completado: documento.estado === "confirmado",
    },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="font-heading text-sm font-semibold">Trazabilidad</p>
        <div className="flex flex-col gap-4 border-l-2 border-border pl-4">
          {pasos.map((paso) => (
            <div key={paso.titulo} className="relative">
              <div
                className={`absolute -left-[1.4rem] size-2.5 rounded-full ${
                  paso.completado ? "bg-emerald-500" : "border-2 border-border bg-background"
                }`}
              />
              <p className="text-sm font-medium">{paso.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {paso.detalle ?? "Pendiente"}
                {paso.fecha && paso.completado ? ` · ${formatearFecha(paso.fecha)}` : ""}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
