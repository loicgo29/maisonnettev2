import { When, Then, Before, After } from '@cucumber/cucumber';
import fetch from 'node-fetch';
import { execSync } from 'child_process';
import pkg from 'pg';
const { Client } = pkg;

let response;
let jsonData;
let dockerContainers;

When('I navigate to {string}', async function(url) {
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Failed to navigate to ${url}: ${error.message}`);
  }
});

Then('the page loads with HTTP {int}', function(statusCode) {
  if (response.status !== statusCode) {
    throw new Error(`Expected HTTP ${statusCode}, got ${response.status}`);
  }
});

When('I call GET {string}', async function(url) {
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Failed to GET ${url}: ${error.message}`);
  }
});

Then('the response status is {int}', function(statusCode) {
  if (response.status !== statusCode) {
    throw new Error(`Expected status ${statusCode}, got ${response.status}`);
  }
});

Then('the JSON contains status = healthy', async function() {
  jsonData = await response.json();
  if (jsonData.status !== 'healthy') {
    throw new Error(`Expected status to be "healthy", got "${jsonData.status}"`);
  }
});

When('I list the Docker containers', function() {
  try {
    const output = execSync('docker ps --format "{{.Names}}:{{.Status}}"', { encoding: 'utf-8' });
    dockerContainers = output;
  } catch (error) {
    throw new Error(`Failed to list Docker containers: ${error.message}`);
  }
});

Then('container {string} is running', function(containerName) {
  const lines = dockerContainers.split('\n');
  const found = lines.some(line => {
    const [name, status] = line.split(':');
    return name.trim() === containerName && status.includes('Up');
  });

  if (!found) {
    throw new Error(`Container "${containerName}" is not running. Found: ${dockerContainers}`);
  }
});

Then('no containers are restarting', function() {
  if (dockerContainers.includes('Restarting')) {
    throw new Error(`Found containers in "Restarting" state`);
  }
});
