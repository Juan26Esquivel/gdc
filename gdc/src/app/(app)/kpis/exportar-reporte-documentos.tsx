"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { obtenerVolumenDocumentosCsv } from "./actions";

export function ExportarReporteDocumentos() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportar() {
    setCargando(true);
    setError(null);
    const resultado = await obtenerVolumenDocumentosCsv();
    setCargando(false);

    if (resultado.error || !resultado.csv) {
      setError(resultado.error ?? "No se pudo generar el reporte");
      return;
    }

    const blob = new Blob([resultado.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `volumen-documentos-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={exportar} disabled={cargando}>
        <Download className="size-4" />
        {cargando ? "Generando…" : "Exportar volumen de documentos"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
