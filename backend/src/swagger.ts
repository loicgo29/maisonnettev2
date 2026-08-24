import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'maisonnettev2 API',
      version: '1.0.0',
      description: 'Gîte rental booking API with Stripe payments and Google Calendar sync',
      contact: {
        name: 'Support',
        email: process.env.OWNER_EMAIL || 'contact@maisonnette-pecheur-bertheaume.fr',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.maisonnettev2.local',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Authentik OIDC token',
        },
      },
      schemas: {
        Gite: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string' },
            nom: { type: 'string' },
            description: { type: 'string' },
            adresse: { type: 'string' },
            capacite: { type: 'integer' },
            prixNuit: { type: 'number' },
            googleCalendarId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Photo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            giteId: { type: 'string', format: 'uuid' },
            url: { type: 'string' },
            categorie: { type: 'string', enum: ['EXTERIEUR', 'SALON', 'CUISINE', 'CHAMBRE', 'SDB', 'OUTDOOR'] },
            ordre: { type: 'integer' },
            alt: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            giteId: { type: 'string', format: 'uuid' },
            dateDebut: { type: 'string', format: 'date-time' },
            dateFin: { type: 'string', format: 'date-time' },
            statut: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
            clientNom: { type: 'string' },
            clientEmail: { type: 'string' },
            clientTelephone: { type: 'string' },
            montantTotal: { type: 'number' },
            stripePaymentIntentId: { type: 'string', nullable: true },
            googleCalendarEventId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Health: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            database: { type: 'string' },
            version: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
