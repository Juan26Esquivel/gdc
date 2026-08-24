import { redirect } from "next/navigation";

// OT-04 sección 3.3: la vista de detalle (`/expedientes/[id]`) absorbió esta
// ruta como su pestaña "Documentos", para no duplicar la navegación entre
// dos pantallas distintas para el mismo expediente. Se deja el redirect en
// vez de borrar la ruta para no romper enlaces/marcadores existentes.
export default async function RedirectDocumentosExpediente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/expedientes/${id}?tab=documentos`);
}
