import dotenv from 'dotenv';
// Chargé avant les imports de routes : les routers instancient Prisma au chargement
// du module, donc DATABASE_URL doit déjà être en place. En conteneur, les variables
// viennent de docker-compose et .env est absent.
dotenv.config();

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import contactRouter from './routes/contact.js';
import healthRouter from './routes/health.js';
import gitesRouter from './routes/gites.js';
import reservationsRouter from './routes/reservations.js';
import calendarRouter from './routes/calendar.js';
import aloRouter from './routes/alo.js';
import adminRouter from './routes/admin.js';
import { errorHandler } from './middleware/error.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Photos des gîtes.
// Le Caddyfile route /uploads/* vers ce backend, mais rien ne les servait :
// les images renvoyaient 404 depuis toujours, en local comme en production.
// Le dossier est monté depuis un volume, il survit donc aux reconstructions.
const dossierCourant = path.dirname(fileURLToPath(import.meta.url));
app.use(
  '/uploads',
  express.static(path.join(dossierCourant, '../public/uploads'), {
    // Les photos ne changent pas : un an de cache évite de les retélécharger
    // à chaque visite. Un nom de fichier différent suffit à les renouveler.
    maxAge: '1y',
    immutable: true,
    fallthrough: false,
  })
);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/gites', gitesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/contact', contactRouter);

// Backoffice — protégé au niveau du routeur (OIDC + rôle admin).
app.use('/api/admin', adminRouter);

// Le module alo n'est monté que là où le schéma `alo` est accessible, c'est-à-
// dire sur l'instance PostgreSQL mutualisée du Mac mini. En production, alo
// reste hébergé à la maison : monter ces routes y produirait des 500 sur des
// endpoints qui ne peuvent rien servir, et exposerait publiquement la surface
// d'une application de comptabilité familiale.
if (process.env.ALO_ENABLED === 'true') {
  app.use('/api/alo', aloRouter);
  console.log('🧮 Module alo monté sur /api/alo');
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api/docs`);
});
