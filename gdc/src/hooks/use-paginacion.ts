"use client";

import { useState } from "react";

/**
 * Paginación en cliente para listas ya cargadas en memoria (no hace una
 * consulta nueva a la base por página). Pensado para las tablas del
 * proyecto, que hoy traen todas sus filas de una sola vez.
 *
 * Si `total` cambia (ej. el usuario aplica un filtro y la lista se achica),
 * la página visible se recorta al vuelo (sin un efecto aparte) para no
 * quedar mostrando una página vacía que ya no existe. `setPagina` sigue
 * operando sobre ese valor ya recortado, así que converge solo.
 */
export function usePaginacion(total: number, porPagina = 10) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * porPagina;
  const fin = inicio + porPagina;

  return { pagina: paginaSegura, totalPaginas, setPagina, inicio, fin };
}
