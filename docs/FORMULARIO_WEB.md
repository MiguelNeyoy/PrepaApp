# FormularioWEB

`FormularioWEB/` contiene un portal PHP conectado a Supabase. Usa `FormularioWEB/config.php` para cargar configuracion desde variables de entorno o desde `.env.local` en desarrollo.

## Requisitos

- PHP 8+.
- Servidor web compatible con PHP.
- Proyecto Supabase con los SQL del portal aplicados.

## Variables

Configura estas variables en el entorno del servidor:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

En desarrollo local tambien puede leerlas desde `.env.local` ubicado en la raiz del proyecto.

## Archivos principales

- `index.php`: entrada del formulario.
- `config.php`: carga de variables.
- `lib/supabase.php`: cliente HTTP hacia Supabase.
- `lib/validation.php`: validaciones.
- `assets/`: estilos, scripts e imagenes.

## Despliegue

1. Copiar la carpeta `FormularioWEB/` al hosting PHP.
2. Configurar las variables de entorno en el servidor.
3. Verificar que el proyecto Supabase tenga aplicado `20260609_portal_web_matricula.sql`.
4. Probar una matricula valida y una invalida.

No copies `.env.local` a un hosting compartido si puede quedar expuesto publicamente.

