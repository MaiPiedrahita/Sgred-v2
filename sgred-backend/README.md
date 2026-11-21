# SGRED Backend

Backend Node.js, Express y SQL Server para el Sprint 1 y Sprint 2.

## Requisitos
- Node.js 20
- Docker Desktop
- SQL Server 2022 mediante Docker

## Inicio
```powershell
cd sgred-backend
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

API: http://localhost:3001/api/v1
Documentacion: http://localhost:3001/api/docs

## Variables
Ver `.env.example`. `FRONTEND_URL` controla CORS. `DB_*` configura SQL Server. `JWT_SECRET` debe cambiarse en produccion. `SESSION_INACTIVITY_MINUTES` y `TOKEN_ENLACE_HOURS` controlan vigencias.

## Pruebas
```powershell
npm test
npm run lint
```
