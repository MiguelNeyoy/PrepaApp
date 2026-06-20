import { createClient } from "jsr:@supabase/supabase-js@2";

type ProfileRow = {
  id: string;
  role: "admin" | "operador" | "consulta";
  active: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function readEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta la variable ${name}.`);
  return value;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido." }, 405);
  }

  try {
    const supabaseUrl = readEnv("SUPABASE_URL");
    const anonKey = readEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "No hay sesion activa." }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "Sesion invalida." }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await callerClient
      .from("profiles")
      .select("role,active")
      .eq("id", caller.id)
      .single<Pick<ProfileRow, "role" | "active">>();

    if (callerProfileError || callerProfile?.role !== "admin" || !callerProfile.active) {
      return jsonResponse({ error: "Solo un administrador activo puede eliminar usuarios." }, 403);
    }

    const body = await req.json().catch(() => null) as { userId?: unknown } | null;
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return jsonResponse({ error: "Usuario invalido." }, 400);
    }
    if (userId === caller.id) {
      return jsonResponse({ error: "No puedes eliminar tu propio perfil." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id,role,active")
      .eq("id", userId)
      .single<ProfileRow>();

    if (targetProfileError || !targetProfile) {
      return jsonResponse({ error: "El usuario no existe o ya fue eliminado." }, 404);
    }

    if (targetProfile.role === "admin" && targetProfile.active) {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("active", true);

      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        return jsonResponse({ error: "Debe permanecer al menos un administrador activo." }, 400);
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 400);
    }

    return jsonResponse({ userId });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Error inesperado." }, 500);
  }
});
