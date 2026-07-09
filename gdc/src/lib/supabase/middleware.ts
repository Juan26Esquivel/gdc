import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = ["/login"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No ejecutar lógica entre createServerClient y getUser(): revalida la sesión en cada request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esRutaPublica = RUTAS_PUBLICAS.some((ruta) => request.nextUrl.pathname.startsWith(ruta));

  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Una cuenta desactivada (RF-01/RF-31) ya no puede hacer nada vía RLS
  // (fn_usuario_rol()/fn_usuario_id() devuelven null, migración 20260709140001),
  // pero sin esto seguiría con una sesión "viva" viendo pantallas vacías en vez
  // de un mensaje claro. Se cierra la sesión apenas se detecta en cualquier
  // request a una ruta protegida.
  if (user && !esRutaPublica) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("activo")
      .eq("auth_user_id", user.id)
      .single();

    if (perfil && !perfil.activo) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "Tu cuenta ha sido desactivada. Contacta al administrador.");
      // signOut() ya limpió las cookies de sesión en supabaseResponse (vía el
      // callback setAll de arriba); si devolviéramos un NextResponse.redirect()
      // nuevo aquí, esas Set-Cookie se perderían y el navegador seguiría
      // mandando la sesión "cerrada" en la siguiente petición, causando un
      // rebote infinito /dashboard -> /login -> /dashboard. Hay que trasladar
      // las cookies del response rastreado al response de redirección.
      const redirectResponse = NextResponse.redirect(url);
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }
      return redirectResponse;
    }
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
