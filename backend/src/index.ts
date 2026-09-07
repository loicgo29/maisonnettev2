import dotenv from 'dotenv';
// Chargé avant les imports de routes : les routers instancient Prisma au chargement
// du module, donc DATABASE_URL doit déjà être en place. En conteneur, les variables
// viennent de docker-compose et .env est absent.
dotenv.config();

// Importée avant tout le reste : la validation doit arrêter le démarrage avant
// qu'un routeur n'instancie Prisma ou n'ouvre une connexion sur une
// configuration incohérente.
import { config } from './config.js';

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import backofficeRouter from './routes/backoffice/index.js';
import { errorHandler } from './middleware/error.js';
import { demarrerPlanificateurMessages } from './jobs/messagesSejour.job.js';

const app = express();
const PORT = config.PORT;

// Caddy termine le TLS et relaie en clair : sans cette ligne, `req.secure` est
// toujours faux et le cookie de session partirait sans l'attribut Secure, même
// en HTTPS. Une seule couche de proxy, d'où le 1.
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Le middleware backoffice accepte le jeton via cookie `backoffice_token` en
// plus de l'en-tête Authorization : le navigateur n'envoie que le cookie après
// login, donc sans ce parseur `req.cookies` reste indéfini et toutes les pages
// du backoffice tombaient en 401 juste après s'être connectées.
app.use(cookieParser());
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
app.use('/api/backoffice', backofficeRouter);

// Le module alo n'est monté que là où le schéma `alo` est accessible, c'est-à-
// dire sur l'instance PostgreSQL mutualisée du Mac mini. En production, alo
// reste hébergé à la maison : monter ces routes y produirait des 500 sur des
// endpoints qui ne peuvent rien servir, et exposerait publiquement la surface
// d'une application de comptabilité familiale.
if (config.ALO_ENABLED) {
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

  // Après l'écoute : un échec de planification ne doit pas empêcher l'API de
  // servir, et le passage au démarrage a besoin de la base, pas du port.
  demarrerPlanificateurMessages();
});
