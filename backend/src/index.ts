import dotenv from 'dotenv';
// Chargé avant les imports de routes : les routers instancient Prisma au chargement
// du module, donc DATABASE_URL doit déjà être en place. En conteneur, les variables
// viennent de docker-compose et .env est absent.
dotenv.config();

import express from 'express';
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
import { errorHandler } from './middleware/error.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use('/health', healthRouter);
app.use('/api/gites', gitesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/contact', contactRouter);
app.use('/api/alo', aloRouter);

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
