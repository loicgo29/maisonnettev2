import { When, Then, Before, After } from '@cucumber/cucumber';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import pkg from 'pg';
dotenv.config();
const { Client } = pkg;

let dockerStatus;
let backendResponse;
let databaseConnected;

// Configuration depuis .env ou defaults
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '3001';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5433;
const DB_USER = process.env.DB_USER || 'test';
const DB_PASSWORD = process.env.DB_PASSWORD || 'test';
const DB_NAME = process.env.DB_NAME || 'maisonnettev2_test';

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
    backendResponse = await fetch(`${BACKEND_URL}/health`);
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
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
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
