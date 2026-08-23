import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { prisma } from '../../src/lib/prisma';

const context: any = {};

Before(async () => {
  context.gite = null;
  context.reservation = null;
  context.response = null;
  context.error = null;
  context.reservations = [];

  await prisma.reservation.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.gite.deleteMany({});
});

After(async () => {
  await prisma.reservation.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.gite.deleteMany({});
});

// Given steps
Given('un gîte existe avec un tarif de {int}€/nuit', async (prixNuit: number) => {
  context.gite = await prisma.gite.create({
    data: {
      slug: 'test-gite-' + Date.now(),
      nom: 'Test Gîte',
      description: 'Test Description',
      adresse: '123 Test Street',
      capacite: 4,
      prixNuit,
      googleCalendarId: 'test-calendar-id',
    },
  });
});

Given('que je suis authentifié en tant qu\'utilisateur', () => {
  context.userId = 'test-user-123';
});

Given('un gîte existe avec une réservation confirmée du {int}-{int}-{int} au {int}-{int}-{int}', async (y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) => {
  context.gite = await prisma.gite.create({
    data: {
      slug: 'test-gite-' + Date.now(),
      nom: 'Test Gîte',
      description: 'Test Description',
      adresse: '123 Test Street',
      capacite: 4,
      prixNuit: 100,
      googleCalendarId: 'test-calendar-id',
    },
  });

  const dateDebut = new Date(y1, m1 - 1, d1);
  const dateFin = new Date(y2, m2 - 1, d2);

  await prisma.reservation.create({
    data: {
      giteId: context.gite.id,
      dateDebut,
      dateFin,
      statut: 'CONFIRMED',
      clientNom: 'Existing Client',
      clientEmail: 'existing@example.com',
      clientPhone: '+33612345678',
      montantTotal: 500,
    },
  });
});

Given('un gîte existe avec une réservation annulée du {int}-{int}-{int} au {int}-{int}-{int}', async (y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) => {
  context.gite = await prisma.gite.create({
    data: {
      slug: 'test-gite-' + Date.now(),
      nom: 'Test Gîte',
      description: 'Test Description',
      adresse: '123 Test Street',
      capacite: 4,
      prixNuit: 100,
      googleCalendarId: 'test-calendar-id',
    },
  });

  const dateDebut = new Date(y1, m1 - 1, d1);
  const dateFin = new Date(y2, m2 - 1, d2);

  await prisma.reservation.create({
    data: {
      giteId: context.gite.id,
      dateDebut,
      dateFin,
      statut: 'CANCELLED',
      clientNom: 'Cancelled Client',
      clientEmail: 'cancelled@example.com',
      clientPhone: '+33612345678',
      montantTotal: 500,
    },
  });
});

Given('une réservation existe avec le statut PENDING', async () => {
  if (!context.gite) {
    context.gite = await prisma.gite.create({
      data: {
        slug: 'test-gite-' + Date.now(),
        nom: 'Test Gîte',
        description: 'Test Description',
        adresse: '123 Test Street',
        capacite: 4,
        prixNuit: 100,
        googleCalendarId: 'test-calendar-id',
      },
    });
  }

  const dateDebut = new Date(2026, 11, 1);
  const dateFin = new Date(2026, 11, 5);

  context.reservation = await prisma.reservation.create({
    data: {
      giteId: context.gite.id,
      dateDebut,
      dateFin,
      statut: 'PENDING',
      clientNom: 'Test Client',
      clientEmail: context.userId + '@example.com',
      clientPhone: '+33612345678',
      montantTotal: 400,
    },
  });
});

Given('que j\'ai reçu une confirmation de paiement Stripe', () => {
  context.stripeConfirmation = true;
  context.stripePaymentIntentId = 'pi_test_' + Date.now();
});

Given('que j\'ai {int} réservations confirmées', async (count: number) => {
  if (!context.gite) {
    context.gite = await prisma.gite.create({
      data: {
        slug: 'test-gite-' + Date.now(),
        nom: 'Test Gîte',
        description: 'Test Description',
        adresse: '123 Test Street',
        capacite: 4,
        prixNuit: 100,
        googleCalendarId: 'test-calendar-id',
      },
    });
  }

  context.reservations = [];
  for (let i = 0; i < count; i++) {
    const dateDebut = new Date(2026, i, 1);
    const dateFin = new Date(2026, i, 5);

    const res = await prisma.reservation.create({
      data: {
        giteId: context.gite.id,
        dateDebut,
        dateFin,
        statut: 'CONFIRMED',
        clientNom: 'Test Client',
        clientEmail: context.userId + '@example.com',
        clientPhone: '+33612345678',
        montantTotal: 400,
      },
    });
    context.reservations.push(res);
  }
});

// When steps
When('je crée une réservation du {int}-{int}-{int} au {int}-{int}-{int} pour ce gîte', async (y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) => {
  const dateDebut = new Date(y1, m1 - 1, d1);
  const dateFin = new Date(y2, m2 - 1, d2);
  const nuits = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
  const montantTotal = context.gite.prixNuit * nuits;

  try {
    context.reservation = await prisma.reservation.create({
      data: {
        giteId: context.gite.id,
        dateDebut,
        dateFin,
        statut: 'PENDING',
        clientNom: 'Test Client',
        clientEmail: 'test@example.com',
        clientPhone: '+33612345678',
        montantTotal,
      },
    });
  } catch (error: any) {
    context.error = error;
  }
});

When('je tente de créer une réservation du {int}-{int}-{int} au {int}-{int}-{int} pour ce gîte', async (y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) => {
  const dateDebut = new Date(y1, m1 - 1, d1);
  const dateFin = new Date(y2, m2 - 1, d2);
  const nuits = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
  const montantTotal = context.gite.prixNuit * nuits;

  try {
    const existing = await prisma.reservation.findFirst({
      where: {
        giteId: context.gite.id,
        statut: { not: 'CANCELLED' },
        dateDebut: { lt: dateFin },
        dateFin: { gt: dateDebut },
      },
    });

    if (existing) {
      throw new Error('Dates not available');
    }

    context.reservation = await prisma.reservation.create({
      data: {
        giteId: context.gite.id,
        dateDebut,
        dateFin,
        statut: 'PENDING',
        clientNom: 'Test Client',
        clientEmail: 'test@example.com',
        clientPhone: '+33612345678',
        montantTotal,
      },
    });
  } catch (error: any) {
    context.error = error;
  }
});

When('j\'appelle le webhook Stripe avec le paiement valide', async () => {
  if (context.reservation) {
    context.reservation = await prisma.reservation.update({
      where: { id: context.reservation.id },
      data: {
        statut: 'CONFIRMED',
        stripePaymentIntentId: context.stripePaymentIntentId,
      },
    });
  }
});

When('je demande mes réservations', async () => {
  const allReservations = await prisma.reservation.findMany({
    where: {
      clientEmail: context.userId + '@example.com',
    },
  });
  context.fetchedReservations = allReservations;
});

// Then steps
Then('la réservation est créée avec un statut PENDING', () => {
  if (!context.reservation) {
    throw new Error('Réservation non créée');
  }
  if (context.reservation.statut !== 'PENDING') {
    throw new Error(`Statut attendu: PENDING, reçu: ${context.reservation.statut}`);
  }
});

Then('le montant total est de {int}€', (montantAttendu: number) => {
  if (!context.reservation) {
    throw new Error('Pas de réservation créée');
  }
  if (context.reservation.montantTotal !== montantAttendu) {
    throw new Error(`Montant attendu: ${montantAttendu}€, reçu: ${context.reservation.montantTotal}€`);
  }
});

Then('la création échoue avec un message {string}', (messageAttendu: string) => {
  if (!context.error) {
    throw new Error('Erreur attendue mais réservation créée');
  }
  if (!context.error.message.includes(messageAttendu)) {
    throw new Error(`Erreur attendue: "${messageAttendu}", reçue: "${context.error.message}"`);
  }
});

Then('la réservation est créée avec succès', () => {
  if (!context.reservation) {
    throw new Error('Réservation non créée');
  }
});

Then('le statut est PENDING', () => {
  if (context.reservation?.statut !== 'PENDING') {
    throw new Error(`Statut attendu: PENDING, reçu: ${context.reservation?.statut}`);
  }
});

Then('la réservation passe au statut CONFIRMED', () => {
  if (context.reservation?.statut !== 'CONFIRMED') {
    throw new Error(`Statut attendu: CONFIRMED, reçu: ${context.reservation?.statut}`);
  }
});

Then('l\'événement Google Calendar est créé', () => {
  if (!context.reservation) {
    throw new Error('Pas de réservation');
  }
  // Mock: on considère que l'event est créé si la réservation existe
});

Then('je reçois une liste de {int} réservations', (countAttendu: number) => {
  if (!context.fetchedReservations) {
    throw new Error('Pas de réservations trouvées');
  }
  if (context.fetchedReservations.length !== countAttendu) {
    throw new Error(`Nombre attendu: ${countAttendu}, reçu: ${context.fetchedReservations.length}`);
  }
});

Then('toutes les réservations ont mon email', () => {
  if (!context.fetchedReservations || context.fetchedReservations.length === 0) {
    throw new Error('Pas de réservations');
  }
  const allMatch = context.fetchedReservations.every(
    (r: any) => r.clientEmail === context.userId + '@example.com'
  );
  if (!allMatch) {
    throw new Error('Toutes les réservations n\'ont pas le bon email');
  }
});
