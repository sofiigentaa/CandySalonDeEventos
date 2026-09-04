<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/dfd4e0bb-0d92-4524-9835-041ebce3feb0

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Render with Supabase

Use these Render settings for a Web Service:

- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Set these environment variables in Render:

- `DATABASE_URL`: Supabase PostgreSQL connection string (use the pooler connection string if Render cannot reach the direct database)
- `GEMINI_API_KEY`: Gemini API key used by contract generation
- `NODE_ENV`: `production`

The server listens on Render's `PORT` automatically and serves the Vite build from `dist` in production.
