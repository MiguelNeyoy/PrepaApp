# GitHub

## Primer push

El repo se debe publicar sin dependencias, builds ni secretos. El `.gitignore` excluye:

- `node_modules/`
- `dist/`
- `src-tauri/target/`
- `.env*` excepto `.env.example`
- `keys`

Flujo recomendado:

```bash
git init
git add .
git commit -m "Initial project import"
gh repo create app-titulacion --private --source=. --remote=origin --push
```

## Trabajo diario

```bash
git status
git add .
git commit -m "Describe el cambio"
git push
```

## Mantener activo el proyecto de Supabase

El workflow [`.github/workflows/supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml) realiza una lectura mínima del catálogo `niveles_estudio` cada dos días. No escribe ni expone datos personales y usa la llave pública del proyecto, nunca `SUPABASE_SERVICE_ROLE_KEY`.

Después de subir este cambio a la rama predeterminada del repositorio, configura estos *Actions secrets* en GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

| Secreto | Valor |
| --- | --- |
| `SUPABASE_URL` | La URL del proyecto, por ejemplo `https://tu-proyecto.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | El mismo valor que `VITE_SUPABASE_PUBLISHABLE_KEY` de tu `.env.local` |

Para comprobarlo de inmediato, abre **Actions → Mantener activa la base de datos de Supabase → Run workflow**. La ejecución manual siempre hace la consulta, aunque no corresponda por calendario. Las ejecuciones programadas se disparan diariamente a las 17:13 UTC y el workflow hace la petición solamente en días alternos; esto evita las irregularidades de un cron `*/2` entre meses.

## Antes de hacer publico el repo

- Confirmar que los archivos SQL no contienen datos personales.
- Confirmar que los Excel incluidos son plantillas institucionales sin datos reales.
- Revisar historiales de Git si alguna vez se agrego `.env.local`.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` fuera del cliente y fuera de Git.
