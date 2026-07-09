"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { buscarGlobal, type ResultadoBusqueda } from "@/app/(app)/busqueda-actions";

const SIN_RESULTADOS: ResultadoBusqueda = { expedientes: [], documentos: [] };

export function GlobalSearch() {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda>(SIN_RESULTADOS);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function alClicFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, []);

  useEffect(() => {
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      if (!termino.trim()) {
        if (!cancelado) setResultados(SIN_RESULTADOS);
        return;
      }
      const r = await buscarGlobal(termino);
      if (!cancelado) {
        setResultados(r);
        setAbierto(true);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [termino]);

  function ir(href: string) {
    setAbierto(false);
    setTermino("");
    router.push(href);
  }

  const sinResultados = resultados.expedientes.length === 0 && resultados.documentos.length === 0;

  return (
    <div ref={contenedorRef} className="relative max-w-md flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        onFocus={() => termino.trim() && setAbierto(true)}
        onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
        placeholder="Buscar expedientes, documentos…"
        className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {abierto && termino.trim() && (
        <div className="absolute top-full z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">
          {sinResultados ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Sin resultados para “{termino}”.</p>
          ) : (
            <>
              {resultados.expedientes.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Expedientes
                  </p>
                  {resultados.expedientes.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => ir(`/expedientes/${exp.id}/documentos`)}
                      className="flex w-full flex-col rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{exp.numeroExpediente}</span>
                      <span className="text-xs text-muted-foreground">
                        {exp.tipoProceso}
                        {exp.subtipoProceso ? ` · ${exp.subtipoProceso}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {resultados.documentos.length > 0 && (
                <div>
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Documentos
                  </p>
                  {resultados.documentos.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => ir(`/expedientes/${doc.expedienteId}/documentos`)}
                      className="flex w-full flex-col rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{doc.tipoDocumento}</span>
                      <span className="text-xs text-muted-foreground">{doc.numeroExpediente}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
