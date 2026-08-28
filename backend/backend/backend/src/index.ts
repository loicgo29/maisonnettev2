import express from 'express';
import corsMiddleware from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUiLib from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import contactRouter from './routes/contact.js';
import healthRouter from './routes/health.js';
import gitesRouter from './routes/gites.js';
import reservationsRouter from './routes/reservations.js';
import calendarRouter from './routes/calendar.js';
import { errorHandler } from './middleware/error.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(
  corsMiddleware({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.PUBLIC_ORIGIN || `https://${process.env.DOMAIN}`
        : 'http://localhost:1234',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public'));
app.use('/api/docs', swaggerUiLib.serve, swaggerUiLib.setup(swaggerSpec));

app.use('/health', healthRouter);
app.use('/api/gites', gitesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/contact', contactRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api/docs`);
});
