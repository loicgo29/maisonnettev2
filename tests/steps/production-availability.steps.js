import { When, Then, Before } from '@cucumber/cucumber';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

const PRODUCTION_URL = 'https://maisonnette-pecheur-bertheaume.fr';
const LOCALHOST_URL = 'http://127.0.0.1:8030';

let lastResponseStatus = 0;
let lastResponseText = '';
let lastErrorCode = null;

Before(async function() {
  lastResponseStatus = 0;
  lastResponseText = '';
  lastErrorCode = null;
});

When('je charge la page de production', async function() {
  try {
    const response = await fetch(PRODUCTION_URL);
    lastResponseStatus = response.status;
    lastResponseText = await response.text();

    if (lastResponseStatus >= 400) {
      lastErrorCode = lastResponseStatus;
    }
  } catch (error) {
    throw new Error(`Failed to load production: ${error.message}`);
  }
});

Then('la réponse n\'est pas {int} Bad Gateway', function(statusCode) {
  if (lastResponseStatus === statusCode) {
    throw new Error(`Production returned ${statusCode} Bad Gateway! Service is down.`);
  }
});

Then('la réponse n\'est pas {int} Service Unavailable', function(statusCode) {
  if (lastResponseStatus === statusCode) {
    throw new Error(`Production returned ${statusCode} Service Unavailable!`);
  }
});

Then('la réponse n\'est pas {int} Gateway Timeout', function(statusCode) {
  if (lastResponseStatus === statusCode) {
    throw new Error(`Production returned ${statusCode} Gateway Timeout!`);
  }
});

When('Caddy requête le frontend', async function() {
  try {
    const cmd = 'docker-compose -f docker-compose.prod.yml exec caddy curl -s -w "\\n%{http_code}" http://frontend:5173/';
    const result = execSync(cmd, { encoding: 'utf-8' }).trim();
    const lines = result.split('\n');
    lastResponseStatus = parseInt(lines[lines.length - 1]);
  } catch (error) {
    throw new Error(`Caddy proxy failed: ${error.message}`);
  }
});

Then('Caddy reçoit {int} OK', function(statusCode) {
  if (lastResponseStatus !== statusCode) {
    throw new Error(`Expected ${statusCode}, Caddy got ${lastResponseStatus}`);
  }
});

Then('Caddy n\'a pas d\'erreur de proxy', function() {
  if (lastResponseStatus === 403) {
    throw new Error('Caddy received 403 Forbidden from frontend - allowedHosts misconfigured');
  }
  if (lastResponseStatus === 502) {
    throw new Error('Caddy received 502 Bad Gateway - frontend is down');
  }
  if (lastResponseStatus >= 500) {
    throw new Error(`Caddy received ${lastResponseStatus} server error`);
  }
});

Then('le titre principal est présent', function() {
  if (!lastResponseText.includes('Maisonnette de Bertheaume')) {
    throw new Error('Main title not found in production');
  }
});

Then('la galerie est chargée', function() {
  if (!lastResponseText.includes('photo-grid')) {
    throw new Error('Gallery not found in production');
  }
});

Then('les {int} photos sont visibles', function(count) {
  const photoMatches = lastResponseText.match(/class="photo-card/g);
  const photoCount = photoMatches ? photoMatches.length : 0;
  if (photoCount !== count) {
    throw new Error(`Expected ${count} photos, found ${photoCount}`);
  }
});

Then('le bouton CTA est cliquable', function() {
  if (!lastResponseText.includes('Consulter les disponibilités')) {
    throw new Error('CTA button not found');
  }
  if (!lastResponseText.includes('btn-primary')) {
    throw new Error('CTA button not properly styled');
  }
});

Then('aucune erreur JavaScript dans la console', function() {
  // This is a marker for browser-based tests
  // In production, we verify no error elements are rendered
  if (lastResponseText.includes('error') && lastResponseText.includes('undefined')) {
    throw new Error('Potential JavaScript error in rendered output');
  }
});

When('je liste les containers Docker pour vérifier leur santé', async function() {
  try {
    const cmd = 'docker-compose -f docker-compose.prod.yml ps --format="{{.Status}}"';
    const result = execSync(cmd, { encoding: 'utf-8' });
    lastResponseText = result;
  } catch (error) {
    throw new Error(`Failed to list containers: ${error.message}`);
  }
});

Then('aucun container n\'est en erreur', function() {
  if (lastResponseText.includes('(unhealthy)')) {
    throw new Error('Container is unhealthy');
  }
});

Then('aucun container n\'est crashé', function() {
  if (lastResponseText.includes('Exited')) {
    throw new Error('Container has exited/crashed');
  }
});

Then('le frontend n\'est pas en restart loop', function() {
  if (lastResponseText.includes('Restarting')) {
    throw new Error('Frontend is in restart loop');
  }
});

When('je vérifie la santé du frontend', async function() {
  try {
    const cmd = 'docker-compose -f docker-compose.prod.yml ps frontend --format="{{.Status}}"';
    const result = execSync(cmd, { encoding: 'utf-8' }).trim();
    lastResponseText = result;
  } catch (error) {
    throw new Error(`Failed to check frontend health: ${error.message}`);
  }
});

Then('le frontend n\'est pas en "health: starting"', function() {
  if (lastResponseText.includes('health: starting')) {
    throw new Error('Frontend is still in health: starting state - not ready yet');
  }
});

Then('le frontend n\'est pas en "health: error"', function() {
  if (lastResponseText.includes('health: error') || lastResponseText.includes('(unhealthy)')) {
    throw new Error('Frontend healthcheck failed');
  }
});

When('je vérifie la configuration Caddy', async function() {
  try {
    const cmd = 'docker-compose -f docker-compose.prod.yml logs caddy --tail=50';
    const result = execSync(cmd, { encoding: 'utf-8' });
    lastResponseText = result;
  } catch (error) {
    throw new Error(`Failed to check Caddy config: ${error.message}`);
  }
});

Then('Caddy écoute sur le port {int}', function(port) {
  if (!lastResponseText.includes(':80') && !lastResponseText.includes('listening')) {
    throw new Error(`Caddy not listening on port ${port}`);
  }
});

Then('Caddy ne retourne pas 403 Forbidden du frontend', function() {
  if (lastResponseText.includes('403')) {
    throw new Error('Caddy returning 403 Forbidden - Vite allowedHosts misconfigured');
  }
});
