# Respaldo de entrega - Supabase

Este respaldo deja listo un proyecto nuevo de Supabase con la estructura actual del sistema y los catalogos vigentes.

## Orden de ejecucion

Ejecutar estos archivos en el SQL Editor del nuevo proyecto Supabase, en este orden:

1. `supabase/sql/supabase_schema.sql`
2. `supabase/sql/20260607_admin_modules.sql`
3. `supabase/sql/20260609_portal_web_matricula.sql`
4. `supabase/sql/20260609_respaldo_entrega_catalogos.sql`

## Que incluye

- Tablas principales del sistema.
- Tipos enum.
- Funciones y triggers.
- Vistas usadas por la app.
- RLS, policies y grants.
- Regla de matricula para el portal web.
- Catalogos actuales: niveles, facultades, tramites y carreras.

## Que no incluye

Este respaldo no incluye datos operativos sensibles:

- `public.solicitudes_titulacion`
- `public.solicitud_estado_historial`
- `public.profiles`
- usuarios de `auth.users`

Los usuarios deben crearse de nuevo en Supabase Auth. Despues de crear el primer usuario, promoverlo a administrador:

```sql
update public.profiles
set role = 'admin', display_name = 'Administracion'
where email = 'correo-del-admin@dominio.edu.mx';
```

## Variables que deben cambiar

En la app y en `FormularioWEB`, cambiar las variables de entorno al nuevo proyecto:

```env
VITE_SUPABASE_URL=https://nuevo-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=la_nueva_publishable_key
```

## Dump completo con solicitudes

Si se necesita respaldar tambien solicitudes, historial y perfiles, usar `pg_dump` con la cadena de conexion del nuevo/actual proyecto desde Supabase Dashboard. Ese respaldo contiene datos personales y debe compartirse con cuidado.
