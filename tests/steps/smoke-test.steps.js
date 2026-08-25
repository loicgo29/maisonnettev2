import { When, Then, Before, After } from '@cucumber/cucumber';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Client } = pkg;

let dockerStatus;
let backendResponse;
let databaseConnected;

When('I check the Docker container status', function() {
  try {
    dockerStatus = execSync('docker ps --format "{{.Names}}:{{.Status}}"', { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to check Docker status: ${error.message}`);
  }
});

Then('{word} container is running', function(containerName) {
  const lines = dockerStatus.split('\n').filter(l => l.trim());
  const isRunning = lines.some(line => {
    const [name, status] = line.split(':');
    return name.trim() === containerName && status.includes('Up');
  });

  if (!isRunning) {
    throw new Error(`Container "${containerName}" is not running. Status:\n${dockerStatus}`);
  }
});

Then('no container is restarting', function() {
  if (dockerStatus.includes('Restarting')) {
    throw new Error(`Found containers in Restarting state:\n${dockerStatus}`);
  }
});

When('I check the backend health endpoint', async function() {
  try {
    backendResponse = await fetch('http://localhost:3001/health');
  } catch (error) {
    throw new Error(`Failed to reach backend: ${error.message}`);
  }
});

Then('the backend returns status code {int}', function(statusCode) {
  if (backendResponse.status !== statusCode) {
    throw new Error(`Expected status ${statusCode}, got ${backendResponse.status}`);
  }
});

Then('the response contains healthy status', async function() {
  const json = await backendResponse.json();
  if (json.status !== 'healthy') {
    throw new Error(`Expected status "healthy", got "${json.status}". Response: ${JSON.stringify(json)}`);
  }
});

When('I attempt to connect to the database', async function() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: process.env.DB_USER || 'maisonnettev2',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'maisonnettev2',
  });

  try {
    await client.connect();
    const result = await client.query('SELECT 1');
    databaseConnected = result.rows.length > 0;
    await client.end();
  } catch (error) {
    databaseConnected = false;
    throw new Error(`Database connection failed: ${error.message}`);
  }
});

Then('the database connection succeeds', function() {
  if (!databaseConnected) {
    throw new Error('Database connection was not successful');
  }
});
