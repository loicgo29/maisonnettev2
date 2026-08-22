# Maisonnette v2 — Plateforme de Location Gîtes

**Tech Stack:**
- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Node.js + Express + PostgreSQL + Prisma
- Auth: OAuth2/OIDC (Google/Auth0/Keycloak)
- API Docs: Swagger/OpenAPI
- Paiement: Stripe
- Notifications: Resend (email) + Twilio (WhatsApp)

**Fonctionnalités:**
- ✅ Affichage gîtes + photos
- ✅ Calendrier (sync Google Calendar)
- ✅ Paiement en ligne (Stripe)
- ✅ Contact/formulaire
- ✅ Notifications (mail + WhatsApp)
- ✅ Responsive
- ✅ Sécurité ++
- ✅ API Swagger
- ✅ OAuth2 OIDC

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend  
cd backend && npm install && npm run dev

# API Docs
http://localhost:3001/api/docs
```

## Structure
```
├── frontend/       React app (port 5173)
├── backend/        Node app (port 3001)
├── docs/           Architecture
└── docker-compose.yml
```
