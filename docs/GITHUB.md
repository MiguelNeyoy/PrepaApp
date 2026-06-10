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

## Antes de hacer publico el repo

- Confirmar que los archivos SQL no contienen datos personales.
- Confirmar que los Excel incluidos son plantillas institucionales sin datos reales.
- Revisar historiales de Git si alguna vez se agrego `.env.local`.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` fuera del cliente y fuera de Git.

