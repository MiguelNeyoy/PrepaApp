# Supabase

## Estructura incluida

- `supabase/sql/supabase_schema.sql`: esquema base.
- `supabase/sql/20260607_admin_modules.sql`: modulos administrativos.
- `supabase/sql/20260609_portal_web_matricula.sql`: soporte del portal por matricula.
- `supabase/sql/20260609_respaldo_entrega_catalogos.sql`: catalogos vigentes.
- `supabase/functions/admin-create-user/index.ts`: Edge Function para alta de usuarios.
- `supabase/functions/admin-delete-user/index.ts`: Edge Function para eliminar usuarios.

## Crear un proyecto nuevo

Ejecuta los SQL en Supabase SQL Editor en este orden:

1. `supabase/sql/supabase_schema.sql`
2. `supabase/sql/20260607_admin_modules.sql`
3. `supabase/sql/20260609_portal_web_matricula.sql`
4. `supabase/sql/20260609_respaldo_entrega_catalogos.sql`

El respaldo no incluye datos operativos sensibles como solicitudes, historial, perfiles ni usuarios de Auth.

## Primer administrador

Crea el primer usuario desde Supabase Auth. Despues promuevelo con:

```sql
update public.profiles
set role = 'admin', display_name = 'Administracion'
where email = 'correo-del-admin@dominio.edu.mx';
```

## Edge Function `admin-create-user`

La funcion permite que un administrador activo cree usuarios desde la app. Requiere estos secretos en Supabase:

```bash
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Despliegue con Supabase CLI:

```bash
supabase functions deploy admin-create-user
```

## Edge Function `admin-delete-user`

La funcion permite eliminar un usuario desde la app. Solo acepta llamadas de administradores activos y no permite eliminar la cuenta que realiza la solicitud.

```bash
supabase functions deploy admin-delete-user
```

Define los secretos con:

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

## Seguridad

- Mantener RLS habilitado en tablas expuestas.
- Usar solo publishable/anon key en clientes publicos.
- Guardar `service_role` exclusivamente como secreto de Supabase o del servidor.
- Revisar cualquier dump que incluya solicitudes o perfiles antes de compartirlo.
