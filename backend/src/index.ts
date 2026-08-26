import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
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

// Security middleware
app.use(helmet());

// Routes
app.use('/health', healthRouter);
app.use('/api/gites', gitesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/contact', contactRouter);

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
