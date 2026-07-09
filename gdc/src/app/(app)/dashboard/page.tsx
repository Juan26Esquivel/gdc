import { getUsuarioActual } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const usuario = await getUsuarioActual();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bienvenido/a, {usuario?.nombre_completo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          El panel de control con expedientes pendientes, calendario y KPIs se irá construyendo
          en los siguientes módulos.
        </p>
      </CardContent>
    </Card>
  );
}
