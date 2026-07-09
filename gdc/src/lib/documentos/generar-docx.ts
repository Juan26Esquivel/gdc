import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function generarDocxBuffer(params: {
  tipoDocumento: string;
  numeroExpediente: string;
  tipoProceso: string;
  contenido: string;
}): Promise<Buffer> {
  const fecha = new Date().toLocaleDateString("es-PA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(params.tipoDocumento.toUpperCase())],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Expediente: ", bold: true }),
              new TextRun(params.numeroExpediente),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Tipo de proceso: ", bold: true }),
              new TextRun(params.tipoProceso),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Fecha: ", bold: true }), new TextRun(fecha)],
          }),
          new Paragraph({ text: "" }),
          ...params.contenido
            .split("\n")
            .map((linea) => new Paragraph({ children: [new TextRun(linea)] })),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
