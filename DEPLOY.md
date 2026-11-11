# Candy: PostgreSQL y login con 2FA

## Desarrollo local en Ubuntu

El sistema no depende de servicios externos para el login: usuarios, contraseñas, 2FA y sesiones se guardan en el mismo PostgreSQL que los datos del salón.

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

Copiar `.env.example` a `.env`; reemplazar `tu-usuario` en `SQL_HOST` por el resultado de `whoami`. Mantener `SQL_USER=candy_app`, `SQL_DB_NAME=candy_salon_eventos`, `SQL_PORT=55432` y `DB_SSL=false`.

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

## Login y verificación en dos pasos (2FA)

- **Registro:** email + contraseña (mínimo 8 caracteres). Después aparece un QR para vincular una app autenticadora (Google Authenticator, Microsoft Authenticator, Authy, etc.). La cuenta queda activa recién cuando se escribe el primer código de la app: ese paso reemplaza la verificación por correo.
- **Ingreso:** email + contraseña y luego el código de 6 dígitos de la app.
- **Olvidé mi contraseña:** email + código de la app + contraseña nueva. Cierra las sesiones abiertas en otros equipos.
- Las contraseñas se guardan con `scrypt`; la sesión es una cookie `httpOnly` de 30 días y en la base solo queda el hash del token. Hay límite de intentos por IP y email, y cada código de la app sirve una sola vez.

**Si alguien pierde el celular**, un administrador reinicia su 2FA con `psql` (en Render, usando la External Database URL). En el próximo ingreso le va a aparecer un QR nuevo:

```sql
UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE lower(email) = 'persona@email.com';
DELETE FROM auth_tokens WHERE user_id = (SELECT uid FROM users WHERE lower(email) = 'persona@email.com');
```

## Despliegue en Render

El PostgreSQL local de una computadora no es accesible desde Render. El archivo `render.yaml` (Blueprint) crea todo junto: la base **PostgreSQL de Render** (`candy-salon-db`) y el servicio web, y conecta `DATABASE_URL` automáticamente con la URL interna de la base. Las tablas se crean solas en el primer arranque.

1. En [dashboard.render.com](https://dashboard.render.com): **New → Blueprint**, elegir este repositorio y la rama `main`.
2. Render pide `GEMINI_API_KEY` (opcional, para la IA de contratos). Se puede dejar vacía.
3. **Apply**. Cuando termine, abrir `https://<servicio>.onrender.com/api/health`: debe responder `"database":"postgres"`.
4. Entrar a `https://<servicio>.onrender.com` y crear la cuenta (con la app autenticadora a mano).

Planes gratuitos: el servicio web se duerme tras 15 minutos sin uso (el primer acceso tarda ~1 minuto) y **la base PostgreSQL gratuita de Render vence a los 30 días**; para uso real pasarla a un plan pago (`plan: basic-256mb`) antes de esa fecha.

Para respaldar o copiar datos, usar la **External Database URL** de la base (en su página de Render): `pg_dump "<external-url>" > respaldo.sql` y `psql "<external-url>" < respaldo.sql`.

Cada cuenta ve solo sus datos. Si una base previa tiene usuarios de la época de Supabase en la tabla `users`, al registrarse con el mismo email se conserva su id y, con él, sus datos.

## Golondrina

El servidor crea las tablas del historial al arrancar. Para conocer su funcionamiento, ver [GOLONDRINA.md](./GOLONDRINA.md).
