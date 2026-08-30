/**
 * Production environment tests
 *
 * Tests that run against Hetzner deployment via HTTPS & SSH
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import assert from 'assert';
import config from '../env.js';

let sshOutput = '';

Before({ tags: '@production' }, function () {
  this.env = config;
  assert.strictEqual(config.type, 'production',
    'Not running in production environment. Set TEST_ENV=production');
});

// === PRODUCTION ENVIRONMENT CHECKS ===

Given('the production environment is configured', function() {
  assert.strictEqual(config.type, 'production', 'Not running in production environment');
  console.log(`✓ Testing production environment: ${config.name}`);
  console.log(`  Frontend: ${config.frontend_url}`);
  console.log(`  Keycloak: ${config.keycloak_url}`);
});

// === PRODUCTION SERVICE VERIFICATION ===

Then('the production frontend is accessible via HTTPS', async function() {
  try {
    const response = await fetch(config.frontend_url,
      { timeout: 10000, redirect: 'follow' });
    assert(response.status < 500,
      `Frontend returned ${response.status}`);
    console.log(`  ✓ Frontend ${response.status}`);
  } catch (error) {
    throw new Error(`Frontend not accessible: ${error.message}`);
  }
});

Then('the production backend API is responding', async function() {
  try {
    const response = await fetch(`${config.backend_url}/gites`,
      { timeout: 10000 });
    assert(response.status < 500,
      `Backend returned ${response.status}`);
    console.log(`  ✓ Backend ${response.status}`);
  } catch (error) {
    throw new Error(`Backend not accessible: ${error.message}`);
  }
});

Then('the production Keycloak realm is accessible', async function() {
  try {
    const response = await fetch(
      `${config.keycloak_realm_url}/.well-known/openid-configuration`,
      { timeout: 10000 }
    );
    assert.strictEqual(response.status, 200,
      `Keycloak returned ${response.status}`);
    const data = await response.json();
    assert(data.issuer, 'No issuer in OpenID config');
    console.log(`  ✓ Keycloak realm: ${data.issuer}`);
  } catch (error) {
    throw new Error(`Keycloak not accessible: ${error.message}`);
  }
});

Then('the production database is accessible', async function() {
  try {
    // Check via backend health endpoint
    const response = await fetch(config.api_health,
      { timeout: 10000 });
    const data = await response.json();
    assert(data.database || data.status === 'healthy',
      `Database health unknown: ${JSON.stringify(data)}`);
    console.log(`  ✓ Database accessible`);
  } catch (error) {
    throw new Error(`Database not accessible: ${error.message}`);
  }
});

// === SSH REMOTE VERIFICATION ===

When('I check remote Docker containers on Hetzner', function() {
  try {
    const cmd = `ssh -i ${config.ssh_key} ${config.ssh_user}@${config.ssh_host} ` +
      `'cd ${config.docker_compose_path} && docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml ps --format "table {{.Names}}\\t{{.Status}}"'`;

    sshOutput = execSync(cmd, { encoding: 'utf-8' });
    this.sshOutput = sshOutput;
  } catch (error) {
    throw new Error(
      `SSH connection failed. Ensure:\n` +
      `  1. SSH key: ${config.ssh_key}\n` +
      `  2. SSH host: ${config.ssh_host}\n` +
      `  Error: ${error.message}`
    );
  }
});

Then('the remote backend container is running', function() {
  const lines = sshOutput.split('\n').filter(l => l.trim());
  const found = lines.some(line =>
    line.includes('maisonnette-backend') && line.includes('Up'));

  if (!found) {
    throw new Error(
      `Backend container not running on Hetzner.\n` +
      `Available:\n${lines.slice(1).join('\n')}`
    );
  }
});

Then('the remote frontend container is running', function() {
  const lines = sshOutput.split('\n').filter(l => l.trim());
  const found = lines.some(line =>
    line.includes('maisonnette-frontend') && line.includes('Up'));

  if (!found) {
    throw new Error(
      `Frontend container not running on Hetzner.\n` +
      `Available:\n${lines.slice(1).join('\n')}`
    );
  }
});

Then('the remote database container is running', function() {
  const lines = sshOutput.split('\n').filter(l => l.trim());
  const found = lines.some(line =>
    line.includes('maisonnette-db') && line.includes('Up'));

  if (!found) {
    throw new Error(
      `Database container not running on Hetzner.\n` +
      `Available:\n${lines.slice(1).join('\n')}`
    );
  }
});

Then('no remote containers are restarting', function() {
  const lines = sshOutput.split('\n');
  const restarting = lines.filter(line => line.includes('Restarting'));

  if (restarting.length > 0) {
    throw new Error(
      `Found containers restarting on Hetzner:\n${restarting.join('\n')}`
    );
  }
});
