# Candy: PostgreSQL local y Supabase Auth

## Desarrollo local en Ubuntu

Supabase se usa solo para registro, inicio de sesión, verificación de correo y recuperación de contraseña. Los datos del salón se guardan en PostgreSQL local; no hace falta crear ni habilitar una base de datos en Supabase.

PostgreSQL debe estar instalado. Si no tenés permisos de administrador para crear bases en el cluster del sistema, inicializá un cluster privado bajo tu usuario. En Ubuntu:

```bash
PG_BIN="$(pg_config --bindir)"
PG_ROOT="$HOME/.local/share/postgresql/candy-salon"
mkdir -p "$PG_ROOT/socket"
chmod 700 "$PG_ROOT" "$PG_ROOT/socket"
"$PG_BIN/initdb" -D "$PG_ROOT/data" -U "$USER" --no-locale --encoding=UTF8 --auth-local=peer --auth-host=scram-sha-256
"$PG_BIN/pg_ctl" -D "$PG_ROOT/data" -l "$PG_ROOT/postgres.log" -o "-h 127.0.0.1 -p 55432 -c unix_socket_directories=$PG_ROOT/socket" start
"$PG_BIN/psql" -h "$PG_ROOT/socket" -p 55432 -U "$USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE ROLE candy_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE" \
  -c "CREATE DATABASE candy_salon_eventos OWNER candy_app"
printf 'candy_app %s candy_app\n' "$USER" >> "$PG_ROOT/data/pg_ident.conf"
sed -i '/^local[[:space:]]\+all[[:space:]]\+all[[:space:]]\+peer/i local all candy_app peer map=candy_app' "$PG_ROOT/data/pg_hba.conf"
"$PG_BIN/pg_ctl" -D "$PG_ROOT/data" reload
```

El cluster escucha solo en la propia computadora. La aplicación usa el rol sin privilegios `candy_app` y se conecta por un socket protegido con permisos del usuario y autenticación *peer*; no guarda una contraseña de PostgreSQL. Si el directorio `data` ya existe, no repitas la inicialización.

Copiar `.env.example` a `.env`; reemplazar `tu-usuario` en `SQL_HOST` por el resultado de `whoami`. Mantener `SQL_USER=candy_app`, `SQL_DB_NAME=candy_salon_eventos`, `SQL_PORT=55432` y `DB_SSL=false`. Completar solamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con la URL del proyecto Supabase y su clave pública `anon`/`publishable`.

En Supabase:

1. Habilitar confirmación de email en **Authentication → Providers → Email**.
2. En **Authentication → URL Configuration**, agregar `http://localhost:3005` a **Redirect URLs**.
3. Configurar un proveedor SMTP si se necesitan correos de producción; el servicio predeterminado tiene límites para desarrollo.

Al iniciar, la aplicación crea las tablas PostgreSQL, índices y restricciones necesarias. Iniciar PostgreSQL antes de la aplicación:

```bash
PG_BIN="$(pg_config --bindir)"
PG_ROOT="$HOME/.local/share/postgresql/candy-salon"
if ! "$PG_BIN/pg_ctl" -D "$PG_ROOT/data" status >/dev/null 2>&1; then
  "$PG_BIN/pg_ctl" -D "$PG_ROOT/data" -l "$PG_ROOT/postgres.log" -o "-h 127.0.0.1 -p 55432 -c unix_socket_directories=$PG_ROOT/socket" start
fi
npm install
npm run dev
```

No usar una URL `pooler.supabase.com` para esta configuración local. No configurar `service_role` en el cliente.

## Despliegue en Render

El PostgreSQL local de una computadora no es accesible desde Render. El archivo `render.yaml` (Blueprint) crea todo junto: la base **PostgreSQL de Render** (`candy-salon-db`) y el servicio web, y conecta `DATABASE_URL` automáticamente con la URL interna de la base. Las tablas se crean solas en el primer arranque.

1. En [dashboard.render.com](https://dashboard.render.com): **New → Blueprint**, elegir este repositorio y la rama `main`.
2. Render pide los valores marcados `sync: false`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (los mismos del `.env`) y, opcional, `GEMINI_API_KEY`.
3. **Apply**. Cuando termine, abrir `https://<servicio>.onrender.com/api/health`: debe responder `"database":"postgres"`.
4. En Supabase → **Authentication → URL Configuration**: poner la URL `https://<servicio>.onrender.com` como **Site URL** y agregarla a **Redirect URLs**.

Planes gratuitos: el servicio web se duerme tras 15 minutos sin uso (el primer acceso tarda ~1 minuto) y **la base PostgreSQL gratuita de Render vence a los 30 días**; para uso real pasarla a un plan pago (`plan: basic-256mb`) antes de esa fecha.

Para respaldar o copiar datos, usar la **External Database URL** de la base (en su página de Render): `pg_dump "<external-url>" > respaldo.sql` y `psql "<external-url>" < respaldo.sql`.

Las cuentas nuevas tienen datos aislados. Los registros antiguos sin propietario no se asignan automáticamente; revisar y asignar esos registros a la cuenta correspondiente antes de migrar una base previa.

## Golondrina

El servidor crea las tablas del historial al arrancar. Para conocer su funcionamiento, ver [GOLONDRINA.md](./GOLONDRINA.md).
