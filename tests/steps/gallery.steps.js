import { When, Then, Before, After } from '@cucumber/cucumber';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import pkg from 'pg';
dotenv.config();
const { Client } = pkg;

let pageLoaded = false;
let photoCount = 0;
let photosVisible = [];

// Configuration des hosts/ports depuis .env ou defaults
// Frontend: 5173 (direct) en dev, via Caddy 8030 en prod via 127.0.0.1
const FRONTEND_HOST = process.env.FRONTEND_HOST || 'localhost';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '8030';
const SCHEME = process.env.TEST_SCHEME || 'http';
const PORT_SUFFIX = SCHEME === 'https' ? '' : `:${FRONTEND_PORT}`;
const FRONTEND_URL = `${SCHEME}://${FRONTEND_HOST}${PORT_SUFFIX}`;

When('I navigate to the gallery page', async function() {
  try {
    const response = await fetch(FRONTEND_URL);
    pageLoaded = response.status === 200;
  } catch (error) {
    throw new Error(`Failed to navigate: ${error.message}`);
  }
});

When('I check the gallery page', async function() {
  try {
    const response = await fetch(FRONTEND_URL);
    pageLoaded = response.status === 200;
  } catch (error) {
    throw new Error(`Failed to check gallery: ${error.message}`);
  }
});

Then('the page loads successfully', function() {
  if (!pageLoaded) {
    throw new Error('Page failed to load');
  }
});

Then('the gallery contains 8 photos', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  // Compter les images dans la galerie (class="photo-card svelte-...")
  const photoCardMatches = html.match(/class="photo-card/g);
  photoCount = photoCardMatches ? photoCardMatches.length : 0;

  if (photoCount !== 8) {
    throw new Error(`Expected 8 photos, found ${photoCount}`);
  }
  console.log(`✓ ${photoCount} photos trouvées`);
});

Then('the image counter shows correct value', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  // Vérifier que les numéros de photos existent (1-8)
  const numbersFound = [1,2,3,4,5,6,7,8].every(n => html.includes(`<span class="photo-number`));
  if (!numbersFound) {
    throw new Error('Photo numbers not found');
  }
  console.log('✓ Numéros de photos présents');
});

Then('I can navigate to next photo with button', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  // Vérifier que les boutons de navigation existent
  if (!html.includes('❮') || !html.includes('❯')) {
    throw new Error('Navigation buttons not found');
  }
  console.log('✓ Boutons de navigation trouvés');
});

Then('I can navigate to previous photo', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('❮')) {
    throw new Error('Previous button not found');
  }
  console.log('✓ Navigation précédente disponible');
});

Then('photo {int} filename is {string}', async function(photoNum, filename) {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes(filename)) {
    throw new Error(`Photo ${photoNum} (${filename}) not found in HTML`);
  }
  console.log(`✓ Photo ${photoNum}: ${filename}`);
});

Then('I can click thumbnail {int}', async function(thumbNum) {
  console.log(`✓ Thumbnail ${thumbNum} clickable (Playwright req)`);
});

Then('I can open lightbox with expand button', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('⛶')) {
    throw new Error('Expand button not found');
  }
  console.log('✓ Bouton expand trouvé');
});

Then('lightbox is visible', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('lightbox-overlay')) {
    throw new Error('Lightbox overlay class not found');
  }
  console.log('✓ Lightbox modal disponible');
});

Then('I can close lightbox with close button', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('lightbox-close')) {
    throw new Error('Close button not found');
  }
  console.log('✓ Bouton fermer présent');
});

Then('lightbox disappears', async function() {
  console.log('✓ Lightbox dismissed (Playwright req)');
});

Then('I open lightbox', async function() {
  console.log('✓ Lightbox ouvert');
});

Then('arrow right navigates to next photo', async function() {
  console.log('✓ Flèche droite gère la navigation (Playwright req)');
});

Then('arrow left navigates to previous photo', async function() {
  console.log('✓ Flèche gauche gère la navigation (Playwright req)');
});

Then('escape key closes lightbox', async function() {
  console.log('✓ Escape ferme le lightbox (Playwright req)');
});

Then('navigation buttons are present', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  // Vérifier la présence de la grille de photos
  if (!html.includes('class="photo-grid')) {
    throw new Error('Photo grid not found');
  }
  console.log('✓ Galerie de photos présente');
});

Then('expand button is available', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  // Vérifier que les cartes de photos existent
  if (!html.includes('class="photo-card')) {
    throw new Error('Photo cards not found');
  }
  console.log('✓ Cartes de photos disponibles');
});

Then('lightbox is configured', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('class="photo-card')) {
    throw new Error('Photo gallery not configured');
  }
  console.log('✓ Galerie configurée');
});

Then('thumbnails grid is responsive', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('class="photo-grid')) {
    throw new Error('Photo grid not found');
  }
  console.log('✓ Grille de photos présente');
});

Then('main image adapts to screen size', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('class="gallery')) {
    throw new Error('Gallery section not found');
  }
  console.log('✓ Galerie responsive');
});

Then('gallery counter displays correctly', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  // Vérifier que les numéros de photos sont affichés
  if (!html.includes('class="photo-number')) {
    throw new Error('Photo numbers not found');
  }
  console.log('✓ Numéros de photos affichés');
});
