# Instalacion y desarrollo

## Requisitos

- Node.js 20+.
- pnpm 9+.
- Rust estable si se usara Tauri.
- WebView2 Runtime en Windows para ejecutar la app de escritorio.
- Acceso a un proyecto Supabase con el esquema instalado.

## Instalacion

```bash
pnpm install
```

Crea el archivo local de variables:

```bash
cp .env.example .env.local
```

Variables requeridas:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

Usa una publishable/anon key para frontend. Nunca uses `service_role` en `.env.local` de la app.

## Desarrollo web

```bash
pnpm run dev
```

El servidor Vite usa `http://localhost:5173`.

## Desarrollo escritorio

```bash
pnpm run desktop:dev
```

Tauri ejecuta primero `pnpm run dev` y abre la ventana de escritorio definida en `src-tauri/tauri.conf.json`.

## Build

Build web:

```bash
pnpm run build
```

Build escritorio:

```bash
pnpm run desktop:build
```

Los artefactos generados quedan fuera de Git por `.gitignore`: `dist/` y `src-tauri/target/`.

