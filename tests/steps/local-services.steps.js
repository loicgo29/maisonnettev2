/**
 * Local development environment tests
 *
 * Tests that run on Mac Mini against local containers
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import { execSync } from 'child_process';
import assert from 'assert';
import config from '../env.js';

let dockerContainers = '';

Before({ tags: '@local' }, function () {
  this.env = config;
  this.dockerContainers = '';
});

// === LOCAL ENVIRONMENT CHECKS ===

Given('the local development environment is configured', function() {
  assert.strictEqual(config.type, 'local', 'Not running in local environment');
  console.log(`✓ Testing local environment: ${config.name}`);
});

When('I list running Docker containers', function() {
  try {
    const output = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}"',
      { encoding: 'utf-8' });
    dockerContainers = output;
    this.dockerContainers = output;
  } catch (error) {
    throw new Error(`Failed to list Docker containers: ${error.message}`);
  }
});

// === LOCAL SERVICE VERIFICATION ===

Then('the local maisonnettev2 frontend container is running', function() {
  const lines = dockerContainers.split('\n').filter(l => l.trim());
  const found = lines.some(line =>
    (line.includes('maisonnette-test-frontend') || line.includes('maisonnette-frontend'))
    && line.includes('Up'));

  if (!found) {
    throw new Error(
      `Frontend container not running in local.\n` +
      `Available: ${lines.slice(1).join('\n')}`
    );
  }
});

Then('the local maisonnettev2 backend container is running', function() {
  const lines = dockerContainers.split('\n').filter(l => l.trim());
  const found = lines.some(line =>
    (line.includes('maisonnette-test-backend') || line.includes('maisonnette-backend'))
    && line.includes('Up'));

  if (!found) {
    throw new Error(
      `Backend container not running in local.\n` +
      `Available: ${lines.slice(1).join('\n')}`
    );
  }
});

Then('the local postgres container is running', function() {
  const lines = dockerContainers.split('\n').filter(l => l.trim());
  const found = lines.some(line =>
    (line.includes('maisonnette-test-db') || line.includes('maisonnette-db'))
    && line.includes('Up'));

  if (!found) {
    throw new Error(
      `Database container not running in local.\n` +
      `Available: ${lines.slice(1).join('\n')}`
    );
  }
});

Then('the local Keycloak container is running', function() {
  const lines = dockerContainers.split('\n').filter(l => l.trim());
  const found = lines.some(line =>
    (line.includes('maisonnette-test-keycloak') || line.includes('maisonnette-keycloak'))
    && line.includes('Up'));

  if (!found) {
    throw new Error(
      `Keycloak container not running in local.\n` +
      `Available: ${lines.slice(1).join('\n')}`
    );
  }
});

Then('no containers are in restarting state', function() {
  const lines = dockerContainers.split('\n');
  const restarting = lines.filter(line => line.includes('Restarting'));

  if (restarting.length > 0) {
    throw new Error(
      `Found containers in restarting state:\n${restarting.join('\n')}`
    );
  }
});
