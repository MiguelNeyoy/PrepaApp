# Base de Datos — Sistema de Certificados de Preparatoria (Sector Sur)
Universidad Autónoma de Sinaloa

Este directorio contiene los scripts SQL y la configuración de base de datos para desplegar el backend en un proyecto de **Supabase en la nube**.

---

## 🚀 Despliegue Rápido (Proyecto Nuevo)

Para inicializar la base de datos en un proyecto nuevo de Supabase, solo necesitas ejecutar **un único archivo** en el **SQL Editor** de tu panel de Supabase:

📄 **`supabase/sql/preparatorias_sector_sur_init.sql`**

### Pasos:
1. Ingresa a tu panel en [supabase.com/dashboard](https://supabase.com/dashboard).
2. Entra a tu proyecto y selecciona **SQL Editor** (`>_`).
3. Haz clic en **"New query"**.
4. Pega todo el contenido de [`preparatorias_sector_sur_init.sql`](preparatorias_sector_sur_init.sql) y pulsa **"Run"** (`Ctrl + Enter`).

---

## 📋 ¿Qué incluye este esquema?

El script crea y configura de forma automática:

* **Roles y Tipos:**
  * `public.app_role`: `admin`, `operador`, `consulta`.
  * `public.estado_tramite`: `pendiente`, `recibido`, `enviado`, `aceptado`, `rechazado`.
* **Tablas Principales:**
  * `public.profiles`: Usuarios vinculados a Supabase Auth (`auth.users`) con su rol y estado de activación.
  * `public.preparatorias`: Unidades académicas del Sector Sur con clave, nombre, modalidades educativas (`text[]`) y estatus activo.
  * `public.tramites`: Catálogo de trámites (precargado con `Certificado`).
  * `public.configuraciones`: Clave-valor para parámetros del sistema (ej. `costo_base_certificado = 500`).
  * `public.solicitudes_titulacion`: Registro completo de certificados (número de cuenta a 8 dígitos, preparatoria, modalidad, turno, tipo de certificado físico/digital, costo en MXN, fechas de seguimiento físico, folio de carta poder, etc.).
* **Catálogo Precargado (19 Preparatorias del Sector Sur):**
  * Preparatoria Concordia (y extensiones: Potrerillos, Agua Caliente, El Verde).
  * Preparatoria El Rosario (y extensiones: Agua Verde, Los Pozos).
  * Preparatoria Escuinapa (y extensiones: Isla Del Bosque, Teacapán).
  * Preparatoria Mazatlán (y extensión La Noria).
  * Preparatoria Antonio Rosales (y extensión Mármol).
  * Preparatoria Rubén Jaramillo (y extensiones: Villa Unión, El Quelite).
  * Preparatoria San Ignacio (y extensión Piaxtla).
* **Seguridad (RLS):**
  * Row Level Security activado en todas las tablas con políticas de lectura y escritura para usuarios autenticados.

---

## 👤 Creación del Usuario Administrador

Por seguridad, los usuarios se crean en el servicio de autenticación de Supabase (**Authentication -> Users**):

1. Ve a **Authentication -> Users** en Supabase.
2. Haz clic en **"Add User"** -> **"Create user"**.
3. Ingresa el correo institucional (ejemplo: `admin.prepa@uas.edu.mx`), una contraseña y marca **"Auto Confirm User"**.
4. Asigna los privilegios de administrador ejecutando en el **SQL Editor**:

```sql
insert into public.profiles (id, email, display_name, role, active)
select id, email, 'Administrador Ventanilla', 'admin', true
from auth.users
where email = 'admin.prepa@uas.edu.mx'
on conflict (id) do update set role = 'admin', active = true;
```

---

## ⚙️ Conexión de la Aplicación

En la raíz del proyecto, configura tu archivo `.env.local`:

```env
VITE_USE_MOCK=false
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_anon_key
```

Reinicia la aplicación con `pnpm dev` y el sistema operará 100% conectado a la base de datos en la nube.

---

## 🗄️ Archivos Históricos (Referencia)

Los archivos con prefijo de fecha anterior (`20260607_*.sql`, `20260609_*.sql`, `supabase_schema.sql`) pertenecen a la versión universitaria previa (carreras y facultades). Para este sistema de nivel medio superior (preparatorias), únicamente se requiere **`preparatorias_sector_sur_init.sql`**.
