# Cómo publicar Candy en Render con Supabase

## 1. Supabase (base de datos)
1. Crear un proyecto en https://supabase.com (región São Paulo).
2. **SQL Editor → New query**: pegar el contenido de `supabase/schema.sql` y tocar **Run**.
   Crea las tablas y activa la seguridad (RLS) para que nadie lea los datos desde afuera.
3. **Connect → Session pooler**: copiar la cadena de conexión y reemplazar `[YOUR-PASSWORD]`
   por la contraseña de la base. Usar el *pooler*, no la "Direct connection" (Render no siempre la alcanza).

## 2. Render (servidor)
1. **New → Blueprint** → elegir este repositorio. Render lee `render.yaml`.
2. Completar las variables que pide:
   - `DATABASE_URL`: la cadena del paso 1.3.
   - `SALON_PASSWORD`: la contraseña para entrar (mínimo 12 caracteres).
   - `SALON_EMAILS`: emails que pueden entrar, separados por coma.
   - `GEMINI_API_KEY`: opcional, para los contratos con IA.
   - `SESSION_SECRET` se genera sola.
3. **Apply**. Cuando termine, entrar a la URL de Render e iniciar sesión.

## Demo pública
Para una demo con datos de ejemplo: `SEED_DEMO=true` y `ALLOW_DEMO_RESET=true`.
En el sistema de un cliente real dejar las dos en `false`.

## Desarrollo local
```bash
npm install
npm run dev        # sin DATABASE_URL: modo demo en memoria; entrar con cualquier email y la clave "candy-demo"
```
