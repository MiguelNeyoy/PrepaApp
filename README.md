# APP Titulacion

Sistema para administrar solicitudes de titulacion, catalogos academicos, usuarios administrativos, metricas y exportaciones en Excel. El proyecto incluye una app React/Vite con empaquetado de escritorio mediante Tauri, respaldo SQL para Supabase y un formulario web PHP para consulta/captura por matricula.

## Funcionalidades principales

- Autenticacion con Supabase Auth y perfiles administrativos.
- Gestion de solicitudes de titulacion por ciclo escolar, estado, facultad, carrera y nivel.
- Catalogos editables de niveles, facultades, carreras y tramites.
- Metricas de productividad y mantenimiento de ciclos anteriores.
- Exportacion a formatos institucionales `.xlsx`.
- Funcion Edge `admin-create-user` para crear usuarios desde el panel.
- Portal PHP en `FormularioWEB/` conectado al mismo proyecto Supabase.

## Stack

- React 18, TypeScript, Vite 6 y Tailwind CSS 4.
- Tauri 2 para app de escritorio Windows.
- Supabase JS 2, Auth, Postgres, RLS y Edge Functions.
- PHP 8+ para el formulario web independiente.
- pnpm como gestor de paquetes.

## Requisitos

- Node.js 20 o superior.
- pnpm 9 o superior.
- Rust estable y dependencias de Tauri si se va a compilar escritorio.
- Cuenta/proyecto Supabase configurado con los SQL de `supabase/sql/`.
- PHP 8+ si se despliega `FormularioWEB/`.

## Configuracion rapida

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

3. Configurar las variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

4. Levantar la app web:

```bash
pnpm run dev
```

5. Levantar la app de escritorio:

```bash
pnpm run desktop:dev
```

## Scripts

```bash
pnpm run dev            # Servidor Vite
pnpm run build          # Build web en dist/
pnpm run desktop:dev    # Tauri en modo desarrollo
pnpm run desktop:build  # Instalador de escritorio
```

## Supabase

El respaldo de entrega esta en `supabase/sql/`. Para preparar un proyecto Supabase nuevo, ejecuta los SQL en el orden documentado en [supabase/sql/README_respaldo_entrega_20260609.md](supabase/sql/README_respaldo_entrega_20260609.md).

La funcion Edge `admin-create-user` requiere los secretos propios del entorno Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No subas llaves privadas ni valores reales de `.env.local` al repositorio.

## Formulario web PHP

El portal esta en `FormularioWEB/`. Puede leer las mismas variables desde el entorno del servidor o desde `.env.local` durante desarrollo local. Consulta [docs/FORMULARIO_WEB.md](docs/FORMULARIO_WEB.md).

## Documentacion

- [docs/INSTALACION.md](docs/INSTALACION.md): instalacion local y comandos.
- [docs/SUPABASE.md](docs/SUPABASE.md): preparacion de base de datos y funcion Edge.
- [docs/FORMULARIO_WEB.md](docs/FORMULARIO_WEB.md): despliegue del portal PHP.
- [docs/GITHUB.md](docs/GITHUB.md): flujo para publicar y mantener el repo.

## Seguridad

Este repo esta preparado para ignorar `.env.local`, `keys`, builds y dependencias. Antes de hacerlo publico, revisa que no existan datos personales en archivos SQL, Excel o assets.

