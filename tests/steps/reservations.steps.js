import { When, Then, Before } from '@cucumber/cucumber';
import fetch from 'node-fetch';

const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PORT || '3001';
const API_SCHEME = process.env.TEST_SCHEME || 'http';
const API_SUFFIX = API_SCHEME === 'https' ? '' : `:${BACKEND_PORT}`;
const API_URL = `${API_SCHEME}://${BACKEND_HOST}${API_SUFFIX}/api`;

let lastResponse = null;
let lastStatus = 0;
let requestCount = 0;

// Le gîte est créé par le seed avec un cuid généré : coder un identifiant en
// dur produisait un 404 systématique. On le résout depuis l'API avant chaque
// scénario.
// Les réservations créées ne sont pas nettoyées : des dates fixes feraient
// échouer toute exécution suivante en « Dates not available ». On décale la
// fenêtre à chaque lancement pour garantir l'isolation.
const decalageJours = 3650 + Math.floor(Math.random() * 3650);
const validReservation = {
  giteId: null,
  dateDebut: new Date(Date.now() + decalageJours*24*60*60*1000).toISOString(),
  dateFin: new Date(Date.now() + (decalageJours+7)*24*60*60*1000).toISOString(),
  clientNom: 'Test Client',
  clientEmail: 'test@example.com',
  clientTelephone: '+33612345678'
};

Before(async function() {
  requestCount = 0;
  if (!validReservation.giteId) {
    const response = await fetch(`${API_URL}/gites`);
    const gites = await response.json();
    if (!Array.isArray(gites) || gites.length === 0) {
      throw new Error('Aucun gîte en base : exécuter prisma/seed.mjs avant les tests');
    }
    validReservation.giteId = gites[0].id;
  }
});

When('l\'API est accessible', async function() {
  try {
    const response = await fetch(`${API_URL}/gites`);
    if (response.status !== 200) {
      throw new Error(`API not accessible: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Failed to reach API: ${error.message}`);
  }
});

When('je crée une réservation', async function() {
  try {
    const response = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validReservation)
    });
    lastResponse = await response.json();
    lastStatus = response.status;
  } catch (error) {
    throw new Error(`Failed to create reservation: ${error.message}`);
  }
});

When('je crée une réservation avec des dates invalides', async function() {
  try {
    const invalidReservation = {
      ...validReservation,
      dateDebut: 'invalid-date',
      dateFin: 'also-invalid'
    };
    const response = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidReservation)
    });
    lastResponse = await response.json();
    lastStatus = response.status;
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
});

When('je fais {int} demandes de réservation', async function(count) {
  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validReservation)
      });
      lastResponse = await response.json();
      lastStatus = response.status;
      requestCount++;
    } catch (error) {
      // Continue even if some fail
    }
  }
});

When('j\'essaie de réserver des dates déjà occupées', async function() {
  try {
    const response = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validReservation)
    });
    lastResponse = await response.json();
    lastStatus = response.status;
  } catch (error) {
    throw new Error(`Failed to create conflicting reservation: ${error.message}`);
  }
});

Then('la réservation est créée avec succès', function() {
  if (lastStatus !== 201) {
    throw new Error(`Expected 201, got ${lastStatus}: ${JSON.stringify(lastResponse)}`);
  }
});

Then('le statut est {string}', function(expectedStatus) {
  if (lastResponse?.statut !== expectedStatus) {
    throw new Error(`Expected statut ${expectedStatus}, got ${lastResponse?.statut}`);
  }
});

Then('j\'obtiens une erreur de validation', function() {
  if (lastStatus !== 400) {
    throw new Error(`Expected 400 validation error, got ${lastStatus}`);
  }
});

Then('le code d\'erreur est {int}', function(expectedCode) {
  if (lastStatus !== expectedCode) {
    throw new Error(`Expected status ${expectedCode}, got ${lastStatus}`);
  }
});

Then('la {int}ème requête est rejetée', function(requestNum) {
  if (requestNum === 11 && lastStatus !== 429) {
    throw new Error(`Expected 429 rate limit on request 11, got ${lastStatus}`);
  }
});

Then('j\'obtiens une erreur de conflit', function() {
  if (lastStatus !== 400) {
    throw new Error(`Expected 400 conflict error, got ${lastStatus}`);
  }
});

Then('le message contient {string}', function(expectedMessage) {
  const message = lastResponse?.error || '';
  if (!message.includes(expectedMessage)) {
    throw new Error(`Expected message to contain "${expectedMessage}", got "${message}"`);
  }
});
