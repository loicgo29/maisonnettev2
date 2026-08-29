import { When, Then, Before } from '@cucumber/cucumber';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

const FRONTEND_HOST = process.env.FRONTEND_HOST || '127.0.0.1';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '8030';
const SCHEME = process.env.TEST_SCHEME || 'http';
const PORT_SUFFIX = SCHEME === 'https' ? '' : `:${FRONTEND_PORT}`;
const FRONTEND_URL = `${SCHEME}://${FRONTEND_HOST}${PORT_SUFFIX}`;

let pageContent = '';
let loadTime = 0;
let responseTime = 0;
let lastResponseStatus = 0;

Before(async function() {
  const startTime = Date.now();
  try {
    const response = await fetch(FRONTEND_URL);
    responseTime = Date.now() - startTime;
    pageContent = await response.text();
    loadTime = Date.now() - startTime;
  } catch (error) {
    throw new Error(`Failed to load page: ${error.message}`);
  }
});

When('je vérifie le titre principal', async function() {
  if (!pageContent.includes('Maisonnette de Bertheaume')) {
    throw new Error('Titre principal not found');
  }
});

Then('le titre contient {string}', function(text) {
  if (!pageContent.includes(text)) {
    throw new Error(`Expected text "${text}" not found`);
  }
});

Then('le titre est visible', function() {
  if (!pageContent.includes('<h1')) {
    throw new Error('H1 title not found');
  }
});

When('je vérifie la description', async function() {
  if (!pageContent.includes('Côtes d\'Armor')) {
    throw new Error('Description not found');
  }
});

Then('la description est visible', function() {
  if (!pageContent.includes('<p')) {
    throw new Error('Description paragraph not found');
  }
});

When('je vérifie la galerie', async function() {
  if (!pageContent.includes('photo-card')) {
    throw new Error('Gallery not found');
  }
});

Then('la galerie contient {int} photos', function(count) {
  const photoMatches = pageContent.match(/class="photo-card/g);
  const photoCount = photoMatches ? photoMatches.length : 0;
  if (photoCount !== count) {
    throw new Error(`Expected ${count} photos, found ${photoCount}`);
  }
});

Then('chaque photo a un numéro', function() {
  const numberMatches = pageContent.match(/class="photo-number/g);
  if (!numberMatches || numberMatches.length === 0) {
    throw new Error('No photo numbers found');
  }
});

Then('les numéros vont de {int} à {int}', function(start, end) {
  for (let i = start; i <= end; i++) {
    if (!pageContent.includes(`>${i}</span>`)) {
      throw new Error(`Photo number ${i} not found`);
    }
  }
});

When('je vérifie les cartes d\'information', async function() {
  if (!pageContent.includes('info-card')) {
    throw new Error('Info cards section not found');
  }
});

Then('il y a {int} cartes', function(count) {
  const cardMatches = pageContent.match(/class="info-card/g);
  const cardCount = cardMatches ? cardMatches.length : 0;
  if (cardCount !== count) {
    throw new Error(`Expected ${count} cards, found ${cardCount}`);
  }
});

Then('une carte affiche {string}', function(text) {
  if (!pageContent.includes(text)) {
    throw new Error(`Card text "${text}" not found`);
  }
});

When('je vérifie le bouton d\'action', async function() {
  if (!pageContent.includes('btn-primary')) {
    throw new Error('CTA button not found');
  }
});

Then('le bouton existe', function() {
  if (!pageContent.includes('button')) {
    throw new Error('Button element not found');
  }
});

Then('le bouton affiche {string}', function(text) {
  if (!pageContent.includes(text)) {
    throw new Error(`Button text "${text}" not found`);
  }
});

Then('le bouton est cliquable', function() {
  if (!pageContent.includes('class="btn-primary')) {
    throw new Error('Button not properly styled as clickable');
  }
});

When('je vérifie les images', async function() {
  if (!pageContent.includes('<img')) {
    throw new Error('No images found on page');
  }
});

Then('il y a au moins {int} images', function(minCount) {
  const imgMatches = pageContent.match(/<img/g);
  const imgCount = imgMatches ? imgMatches.length : 0;
  if (imgCount < minCount) {
    throw new Error(`Expected at least ${minCount} images, found ${imgCount}`);
  }
});

Then('aucune image n\'a src vide', function() {
  const emptyRegex = /<img[^>]*src=""[^>]*>/g;
  if (emptyRegex.test(pageContent)) {
    throw new Error('Found images with empty src attribute');
  }
});

Then('toutes les images ont un alt text', function() {
  const imgMatches = pageContent.match(/<img[^>]*>/g);
  if (!imgMatches) {
    throw new Error('No images found');
  }

  imgMatches.forEach((img, index) => {
    if (!img.includes('alt=')) {
      throw new Error(`Image ${index + 1} is missing alt text`);
    }
  });
});

When('je vérifie la structure', async function() {
  if (!pageContent.includes('hero') && !pageContent.includes('main')) {
    throw new Error('Page structure missing main content area');
  }
});

Then('la page a une section {word}', function(section) {
  const sectionNames = {
    'hero': 'hero',
    'galerie': 'gallery',
    'info': 'info',
    'CTA': 'cta',
    'footer': ['footer', '<nav', 'navigation']
  };

  const patterns = sectionNames[section];
  const searchPatterns = Array.isArray(patterns) ? patterns : [patterns];

  const found = searchPatterns.some(pattern =>
    pageContent.toLowerCase().includes(pattern.toLowerCase())
  );

  if (!found) {
    throw new Error(`Section "${section}" not found on page`);
  }
});

Then('la page a un footer ou navigation', function() {
  const hasFooter = pageContent.includes('footer') ||
                    pageContent.includes('<nav') ||
                    pageContent.includes('navigation');

  if (!hasFooter) {
    throw new Error('Footer or navigation not found on page');
  }
});

Then('la description contient {string}', function(text) {
  if (!pageContent.includes(text)) {
    throw new Error(`Description text "${text}" not found`);
  }
});

When('Caddy proxifie vers le frontend', async function() {
  try {
    const cmd = 'docker-compose -f docker-compose.prod.yml exec caddy curl -s -w "\\n%{http_code}" http://frontend:5173/';
    const result = execSync(cmd, { encoding: 'utf-8' }).trim();
    const lines = result.split('\n');
    lastResponseStatus = parseInt(lines[lines.length - 1]);
    if (lastResponseStatus !== 200) {
      throw new Error(`Expected 200, got ${lastResponseStatus}`);
    }
  } catch (error) {
    throw new Error(`Caddy cannot proxy to frontend: ${error.message}`);
  }
});

Then('la réponse est {int} OK', function(statusCode) {
  if (lastResponseStatus !== statusCode) {
    throw new Error(`Expected status ${statusCode}, got ${lastResponseStatus}`);
  }
});

When('je mesure le temps de chargement', async function() {
  // Already measured in Before hook
  if (loadTime === 0) {
    throw new Error('Failed to measure page load time');
  }
});

Then('la page charge en moins de {int} secondes', function(seconds) {
  const maxTime = seconds * 1000;
  if (loadTime > maxTime) {
    throw new Error(`Page took ${loadTime}ms, expected less than ${maxTime}ms`);
  }
});

Then('le contenu principal charge en moins de {int} secondes', function(seconds) {
  const maxTime = seconds * 1000;
  if (responseTime > maxTime) {
    throw new Error(`Response took ${responseTime}ms, expected less than ${maxTime}ms`);
  }
});
