# Base de Datos - Sistema de Certificados de Preparatoria (Sector Sur)
Universidad Autónoma de Sinaloa

Este directorio contiene los scripts SQL y la configuración de base de datos para desplegar el backend en un proyecto de Supabase en la nube.

---

## Despliegue en Proyecto Nuevo

Para inicializar la base de datos en un proyecto nuevo de Supabase, únicamente se debe ejecutar el siguiente archivo en el SQL Editor de Supabase:

* `supabase/sql/preparatorias_sector_sur_init.sql`

Este script es autosuficiente y contiene la totalidad de las tablas, catálogos, configuraciones y reglas de seguridad necesarias para la operación del sistema.

### Pasos de ejecución:
1. Ingresar al panel de administración en supabase.com/dashboard.
2. Seleccionar el proyecto correspondiente e ingresar a la sección SQL Editor.
3. Crear una nueva consulta ("New query").
4. Copiar la totalidad del contenido del archivo `preparatorias_sector_sur_init.sql`, pegarlo en el editor y ejecutar la consulta.

---

## Contenido del Esquema Actual

El script de inicialización configura de forma automática:

* **Roles y Tipos:**
  * `public.app_role`: admin, operador, consulta.
  * `public.estado_tramite`: pendiente, recibido, enviado, aceptado, rechazado.
* **Tablas Principales:**
  * `public.profiles`: Usuarios vinculados a Supabase Auth (`auth.users`) con su rol y estado de activación.
  * `public.preparatorias`: Unidades académicas del Sector Sur con clave, nombre, modalidades educativas (`text[]`) y estatus activo.
  * `public.tramites`: Catálogo de trámites (precargado con Certificado).
  * `public.configuraciones`: Clave-valor para parámetros del sistema (ejemplo: `costo_base_certificado = 500`).
  * `public.solicitudes_titulacion`: Registro de trámites de certificados (número de cuenta a 8 dígitos, preparatoria, modalidad, turno, tipo de certificado físico/digital, costo en MXN, fechas de seguimiento físico, folio de carta poder, entre otros).
* **Catálogo Precargado (19 Preparatorias del Sector Sur):**
  * Preparatoria Concordia (y extensiones: Potrerillos, Agua Caliente, El Verde).
  * Preparatoria El Rosario (y extensiones: Agua Verde, Los Pozos).
  * Preparatoria Escuinapa (y extensiones: Isla Del Bosque, Teacapán).
  * Preparatoria Mazatlán (y extensión La Noria).
  * Preparatoria Antonio Rosales (y extensión Mármol).
  * Preparatoria Rubén Jaramillo (y extensiones: Villa Unión, El Quelite).
  * Preparatoria San Ignacio (y extensión Piaxtla).
* **Seguridad (RLS):**
  * Políticas de Row Level Security (RLS) habilitadas en todas las tablas con permisos para usuarios autenticados.

---

## Creación del Usuario Administrador

Los usuarios del sistema se registran a través del servicio de autenticación de Supabase (Authentication -> Users):

1. Acceder al apartado Authentication -> Users en el panel de Supabase.
2. Hacer clic en "Add User" -> "Create user".
3. Ingresar correo institucional, contraseña y marcar la opción "Auto Confirm User".
4. Asignar el rol de administrador ejecutando la siguiente consulta en el SQL Editor:

```sql
insert into public.profiles (id, email, display_name, role, active)
select id, email, 'Administrador Ventanilla', 'admin', true
from auth.users
where email = 'correo-del-admin@uas.edu.mx'
on conflict (id) do update set role = 'admin', active = true;
```

---

## Conexión de la Aplicación

En la raíz del proyecto, configurar el archivo `.env.local`:

```env
VITE_USE_MOCK=false
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_anon_key
```

---

## Estado de Archivos Anteriores y Obsoletos

Los siguientes archivos pertenecen a la versión previa del sistema (Titulación Universitaria) y **NO deben ejecutarse** en proyectos para el sistema de preparatorias:

| Archivo | Estado | Motivo |
| :--- | :--- | :--- |
| `supabase_schema.sql` | Obsoleto | Estructura universitaria con tablas de facultades, carreras y niveles de estudio que ya no existen en este sistema. |
| `20260607_admin_modules.sql` | Obsoleto | Vistas y módulos administrativos específicos de la versión universitaria anterior. |
| `20260609_portal_web_matricula.sql` | Obsoleto | Reglas de validación para el portal web en PHP, el cual fue retirado (la captura ahora es 100% en ventanilla). |
| `20260609_respaldo_entrega_catalogos.sql` | Obsoleto | Catálogo de licenciaturas e ingenierías reemplazado en su totalidad por las 19 preparatorias del Sector Sur. |
| `README_respaldo_entrega_20260609.md` | Informativo | Nota técnica sobre el respaldo universitario de junio de 2026. |

Para inicializaciones nuevas o migraciones de base de datos, el único archivo requerido y vigente es `preparatorias_sector_sur_init.sql`.
