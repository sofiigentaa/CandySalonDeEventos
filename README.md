# Candy Salón de Eventos

Sistema de gestión para salón de eventos: reservas, pagos, recordatorios, egresos, contratos (con IA opcional) y Golondrina (automatización con historial).

- **Stack:** React + Vite + Tailwind (frontend), Express + Drizzle (backend), PostgreSQL (datos y usuarios), login propio con 2FA por app autenticadora.
- **Desarrollo local y despliegue en Render:** ver [DEPLOY.md](./DEPLOY.md).
- **Golondrina:** ver [GOLONDRINA.md](./GOLONDRINA.md).

```bash
npm install
npm run dev      # http://localhost:3005
npm run build && npm start   # producción
```
