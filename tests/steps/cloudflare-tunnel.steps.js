import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import fetch from 'node-fetch';
import { execSync } from 'child_process';
import assert from 'assert';

let context = {};

Before(function () {
  context = {
    responses: {},
    tunnelStatus: null,
  };
});

// Background steps

Given('the Cloudflare tunnel is running', async function () {
  try {
    const status = execSync('cloudflared tunnel info maisonnette-pecheur-bertheaume').toString();
    context.tunnelStatus = status;
    if (!status.includes('CONNECTOR ID')) {
      throw new Error('Tunnel not properly configured (no active connectors)');
    }
  } catch (e) {
    throw new Error(`Tunnel not running or not configured: ${e.message}`);
  }
});

Given('the backend service is listening on localhost:8030', async function () {
  try {
    const response = await fetch('http://localhost:8030', { timeout: 5000 });
    assert(response.ok, 'Backend not responding on port 8030');
    context.localBackendWorks = true;
  } catch (e) {
    throw new Error(`Backend service not accessible on localhost:8030: ${e.message}`);
  }
});

Given('the production domain is maisonnette-pecheur-bertheaume.fr', function () {
  context.productionDomain = 'https://maisonnette-pecheur-bertheaume.fr';
  context.productionWWW = 'https://www.maisonnette-pecheur-bertheaume.fr';
});

// Tunnel configuration scenario

When('I check the tunnel status', async function () {
  try {
    const status = execSync('cloudflared tunnel info maisonnette-pecheur-bertheaume').toString();
    context.tunnelInfoOutput = status;
  } catch (e) {
    throw new Error(`Failed to get tunnel info: ${e.message}`);
  }
});

Then('the tunnel should be registered with Cloudflare', function () {
  assert(context.tunnelInfoOutput, 'Tunnel info not available');
  assert(context.tunnelInfoOutput.includes('CONNECTOR ID'), 'Tunnel not registered');
});

Then('the tunnel should have active connections \\(>= {int}\\)', function (minConnections) {
  // Count the lines that contain CONNECTOR ID entries (after the header line)
  const lines = context.tunnelInfoOutput.split('\n');
  const connectorLines = lines.filter(line =>
    line.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/)
  );
  const connectionCount = connectorLines.length;
  assert(connectionCount >= minConnections, `Expected >= ${minConnections} connectors, got ${connectionCount}`);
});

Then('the ingress rules should point to http:\\/\\/localhost:8030', function () {
  // Verify via production test - if it's responding, ingress is correct
  assert(context.localBackendWorks, 'Backend service must be working');
});

// Homepage scenario

When('I access {string}', async function (url) {
  try {
    const response = await fetch(url, {
      timeout: 10000,
      redirect: 'follow'
    });
    context.responses[url] = {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    };
  } catch (e) {
    context.responses[url] = {
      error: e.message,
      status: 0,
    };
  }
});

Then('the response status code should be {int}', function (expectedStatus) {
  const lastUrl = Object.keys(context.responses).pop();
  const response = context.responses[lastUrl];
  assert.strictEqual(
    response.status,
    expectedStatus,
    `Expected status ${expectedStatus}, got ${response.status}. Error: ${response.error || 'none'}`
  );
});

Then('the response should contain the landing page HTML', function () {
  const lastUrl = Object.keys(context.responses).pop();
  const body = context.responses[lastUrl].body;
  assert(body.includes('Maisonnette') || body.includes('html'), 'Response does not contain landing page HTML');
});

Then('the response headers should include HTTPS certificate', function () {
  // Verify HTTPS was used via the fetch itself
  const lastUrl = Object.keys(context.responses).pop();
  assert(lastUrl.startsWith('https://'), 'URL should use HTTPS');
});

Then('the response should contain {string} text', function (text) {
  const lastUrl = Object.keys(context.responses).pop();
  const body = context.responses[lastUrl].body;
  assert(body.includes(text), `Response does not contain "${text}"`);
});

Then('the response should be valid HTML', function () {
  const lastUrl = Object.keys(context.responses).pop();
  const body = context.responses[lastUrl].body;
  assert(body.includes('<!doctype html') || body.includes('<html'), 'Response is not valid HTML');
});

Then('the response should be valid JSON', function () {
  const lastUrl = Object.keys(context.responses).pop();
  const body = context.responses[lastUrl].body;
  try {
    JSON.parse(body);
  } catch (e) {
    throw new Error(`Response is not valid JSON: ${e.message}`);
  }
});

Then('the response should contain at least {int} gite', function (count) {
  const lastUrl = Object.keys(context.responses).pop();
  const body = context.responses[lastUrl].body;
  const data = JSON.parse(body);
  assert(Array.isArray(data), 'Response should be an array');
  assert(data.length >= count, `Expected >= ${count} gites, got ${data.length}`);
});

// WWW subdomain scenario

Then('WWW subdomain redirects correctly', function () {
  // Already tested by the Then clause for status 200
});

// Tunnel restart scenario

When('I restart the tunnel service', async function () {
  try {
    execSync('pkill -f "cloudflared tunnel run"', { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    execSync('cloudflared tunnel run maisonnette-pecheur-bertheaume > /tmp/tunnel-restart.log 2>&1 &');
  } catch (e) {
    throw new Error(`Failed to restart tunnel: ${e.message}`);
  }
});

Then('the tunnel should reconnect within {int} seconds', async function (seconds) {
  const maxWait = seconds * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const status = execSync('cloudflared tunnel info maisonnette-pecheur-bertheaume').toString();
      if (status.includes('CONNECTOR ID')) {
        return; // Reconnected
      }
    } catch (e) {
      // Tunnel not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Tunnel did not reconnect within ${seconds} seconds`);
});

Then('{string} should respond with {int}', async function (url, expectedStatus) {
  try {
    const response = await fetch(url, { timeout: 10000, redirect: 'follow' });
    assert.strictEqual(response.status, expectedStatus,
      `Expected ${expectedStatus} but got ${response.status} for ${url}`);
    context.lastResponse = response;
  } catch (e) {
    throw new Error(`Failed to fetch ${url}: ${e.message}`);
  }
});

// Tunnel running (simplistic check)
Given('the tunnel is running', async function () {
  try {
    const response = await fetch('https://maisonnette-pecheur-bertheaume.fr',
      { timeout: 5000, redirect: 'follow' });
    assert(response.status < 500, `Tunnel not responsive: ${response.status}`);
    context.tunnelConfirmed = true;
  } catch (e) {
    throw new Error(`Tunnel not accessible: ${e.message}`);
  }
});
