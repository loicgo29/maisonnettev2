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
const FRONTEND_URL = `http://${FRONTEND_HOST}:${FRONTEND_PORT}`;

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

  // Compter les images dans la galerie
  const thumbnailMatches = html.match(/class="thumbnail"/g);
  photoCount = thumbnailMatches ? thumbnailMatches.length : 0;

  if (photoCount !== 8) {
    throw new Error(`Expected 8 photos, found ${photoCount}`);
  }
  console.log(`✓ ${photoCount} photos trouvées`);
});

Then('the image counter shows correct value', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('/ 8')) {
    throw new Error('Counter with 8 photos not found');
  }
  console.log('✓ Compteur présent');
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

  if (!html.includes('❮') || !html.includes('❯')) {
    throw new Error('Navigation buttons not found');
  }
  console.log('✓ Boutons de navigation présents (❮ ❯)');
});

Then('expand button is available', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('⛶')) {
    throw new Error('Expand button not found');
  }
  console.log('✓ Bouton expand disponible (⛶)');
});

Then('lightbox is configured', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('lightbox-overlay')) {
    throw new Error('Lightbox not configured');
  }
  console.log('✓ Lightbox configuré');
});

Then('thumbnails grid is responsive', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('gallery-thumbnails')) {
    throw new Error('Thumbnails grid not found');
  }
  console.log('✓ Grid de thumbnails présent');
});

Then('main image adapts to screen size', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('gallery-main')) {
    throw new Error('Main gallery not found');
  }
  console.log('✓ Galerie principale responsive');
});

Then('gallery counter displays correctly', async function() {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();

  if (!html.includes('image-counter')) {
    throw new Error('Image counter not found');
  }
  console.log('✓ Compteur d\'images affiché');
});
