import { createClient } from "jsr:@supabase/supabase-js@2";

type AppRole = "admin" | "operador";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  role: "admin" | "operador" | "consulta";
  active: boolean;
  created_at: string;
  updated_at: string;
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

function isValidRole(value: unknown): value is AppRole {
  return value === "admin" || value === "operador";
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
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Sesion invalida." }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await callerClient
      .from("profiles")
      .select("role,active")
      .eq("id", user.id)
      .single<{ role: string; active: boolean }>();

    if (callerProfileError || callerProfile?.role !== "admin" || !callerProfile.active) {
      return jsonResponse({ error: "Solo un administrador activo puede crear usuarios." }, 403);
    }

    const body = await req.json().catch(() => null) as {
      email?: unknown;
      displayName?: unknown;
      role?: unknown;
    } | null;

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const role = body?.role;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Correo invalido." }, 400);
    }

    if (!displayName) {
      return jsonResponse({ error: "El nombre no puede estar vacio." }, 400);
    }

    if (!isValidRole(role)) {
      return jsonResponse({ error: "Rol invalido." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: "123456",
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (createError || !createdUser.user) {
      return jsonResponse({ error: createError?.message ?? "No se pudo crear el usuario." }, 400);
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: createdUser.user.id,
        email,
        display_name: displayName,
        role,
        active: true,
      }, { onConflict: "id" })
      .select("id,email,display_name,role,active,created_at,updated_at")
      .single<ProfileRow>();

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 400);
    }

    return jsonResponse({ profile });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Error inesperado." }, 500);
  }
});
