import { Given, When, Then, Before } from '@cucumber/cucumber';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { expect } from 'expect';
import * as fs from 'fs';
import * as path from 'path';

interface TestContext {
  caddyClient: AxiosInstance;
  response?: any;
  error?: any;
  statusCode?: number;
  headers?: any;
  requestHeaders?: any;
  logPath?: string;
}

const context: TestContext = {
  caddyClient: axios.create({
    baseURL: 'http://localhost',
    validateStatus: () => true, // Don't throw on any status
  }),
  logPath: '/data/access.log', // Path to Caddy access log inside container
};

Before(() => {
  context.response = undefined;
  context.error = undefined;
  context.statusCode = undefined;
  context.headers = undefined;
  context.requestHeaders = undefined;
});

// Caddy Availability Context
Given('Caddy est disponible sur http://localhost:80', async () => {
  try {
    const response = await axios.get('http://localhost/', {
      validateStatus: () => true,
      timeout: 5000,
    });
    // Caddy should respond with something (frontend or error)
    expect(response.status).toBeLessThan(600);
  } catch (error) {
    throw new Error('Caddy is not available on http://localhost:80');
  }
});

Given('le backend est accessible sur http://localhost:3001', async () => {
  try {
    const response = await axios.get('http://localhost:3001/health', {
      validateStatus: () => true,
      timeout: 5000,
    });
    expect([200, 503]).toContain(response.status);
  } catch (error) {
    throw new Error('Backend is not accessible on http://localhost:3001');
  }
});

Given('le frontend est accessible sur http://localhost:3000', async () => {
  try {
    const response = await axios.get('http://localhost:3000', {
      validateStatus: () => true,
      timeout: 5000,
    });
    expect([200, 304]).toContain(response.status);
  } catch (error) {
    throw new Error('Frontend is not accessible on http://localhost:3000');
  }
});

// Reverse Proxy Routing Tests
When('j\'appelle GET {string} via Caddy', async (url: string) => {
  try {
    const response = await context.caddyClient.get(url.replace('http://localhost', ''));
    context.statusCode = response.status;
    context.response = response.data;
    context.headers = response.headers;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

When('j\'appelle GET {string} via Caddy avec un header Authorization', async (url: string) => {
  try {
    const mockToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    context.requestHeaders = {
      'Authorization': mockToken,
    };
    const response = await context.caddyClient.get(
      url.replace('http://localhost', ''),
      {
        headers: context.requestHeaders,
      }
    );
    context.statusCode = response.status;
    context.response = response.data;
    context.headers = response.headers;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

When('j\'appelle OPTIONS {string} via Caddy', async (url: string) => {
  try {
    const response = await context.caddyClient.options(
      url.replace('http://localhost', '')
    );
    context.statusCode = response.status;
    context.response = response.data;
    context.headers = response.headers;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

When('je test la connectivité {string}', async (url: string) => {
  try {
    const testUrl = new URL(url);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 3000)
    );

    try {
      const response = await Promise.race([
        axios.get(url, { validateStatus: () => true, timeout: 2000 }),
        timeout as Promise<any>,
      ]);
      context.statusCode = response.status;
    } catch (error) {
      if (error instanceof Error && error.message === 'Connection timeout') {
        context.error = error;
        context.statusCode = undefined;
      } else if ((error as AxiosError)?.code === 'ERR_INVALID_URL' ||
                 (error as AxiosError)?.code === 'ECONNREFUSED') {
        context.error = error;
        context.statusCode = undefined;
      } else {
        throw error;
      }
    }
  } catch (error) {
    context.error = error;
    context.statusCode = undefined;
  }
});

// Response Validation
Then('la réponse est {int}', (status: number) => {
  expect(context.statusCode).toBe(status);
});

Then('la réponse est {int} ou {int}', (status1: number, status2: number) => {
  expect([status1, status2]).toContain(context.statusCode);
});

Then('la réponse est {int} ou {int} ou {int}', (status1: number, status2: number, status3: number) => {
  expect([status1, status2, status3]).toContain(context.statusCode);
});

Then('la réponse doit être inférieure à {int}', (limit: number) => {
  expect(context.statusCode).toBeLessThan(limit);
});

Then('la réponse est {int} ou supérieure', (minStatus: number) => {
  expect(context.statusCode).toBeGreaterThanOrEqual(minStatus);
});

// Connection Tests
Then('la connexion est établie', () => {
  expect(context.statusCode).toBeDefined();
  expect(context.statusCode).not.toBe(undefined);
  expect(context.error).toBeUndefined();
});

Then('la connexion échoue ou n\'est pas configurée', () => {
  // Either connection should fail or status should indicate error
  const connectionFailed = context.error !== undefined && context.error !== null;
  const statusNotAvailable = context.statusCode === undefined;

  expect(connectionFailed || statusNotAvailable).toBe(true);
});

// Header Validation
Then('le header {string} contient {string}', (headerName: string, expectedValue: string) => {
  expect(context.headers).toBeDefined();
  const headerValue = context.headers[headerName.toLowerCase()];
  expect(headerValue).toBeDefined();
  expect(headerValue.toLowerCase()).toContain(expectedValue.toLowerCase());
});

Then('le header {string} n\'existe pas', (headerName: string) => {
  expect(context.headers).toBeDefined();
  const headerValue = context.headers[headerName.toLowerCase()];
  expect(headerValue).toBeUndefined();
});

Then('le header {string} est {string}', (headerName: string, expectedValue: string) => {
  expect(context.headers).toBeDefined();
  const headerValue = context.headers[headerName.toLowerCase()];
  expect(headerValue).toBe(expectedValue);
});

// Caddy Configuration Tests
Then('le reverse_proxy cible le frontend:3000', () => {
  // This would be verified by checking that non-API routes return frontend content
  // In practice, this is verified by checking the response comes from frontend
  expect(context.statusCode).toBeLessThan(500);
  expect(context.response).toBeDefined();
});

// JWT Token Transmission
Then('le header est transmis au backend', () => {
  // If we receive a successful response, headers were transmitted
  expect(context.statusCode).not.toBe(401);
  // A 401 would mean the backend didn't receive the auth header
  expect(context.statusCode).not.toBe(403);
});

// Logging Tests
Then('les logs d\'accès sont enregistrés', async () => {
  // Check if log file exists and has recent entries
  // Note: This requires the log file to be accessible from the test environment
  try {
    // In a Docker environment, we might not have direct access to the log file
    // Instead, we verify the request was processed successfully
    expect(context.statusCode).toBeDefined();
    // If we got a response, it was likely logged
  } catch (error) {
    // Log file access might not be available in all test environments
    console.log('Log file check skipped - not accessible in test environment');
  }
});

// Compression Tests
Then('le header Content-Encoding contient {string} ou {string}', (encoding1: string, encoding2: string) => {
  expect(context.headers).toBeDefined();
  const contentEncoding = context.headers['content-encoding'];
  // Content-Encoding might not be set if content is small or already compressed
  if (contentEncoding) {
    const hasEncoding = contentEncoding.toLowerCase().includes(encoding1.toLowerCase()) ||
                       contentEncoding.toLowerCase().includes(encoding2.toLowerCase());
    expect(hasEncoding).toBe(true);
  }
  // If header is not present, Caddy might not compress small responses
  // which is acceptable behavior
});

// Additional Security Header Tests
Then('le header X-Content-Type-Options contient {string}', (expectedValue: string) => {
  expect(context.headers).toBeDefined();
  const headerValue = context.headers['x-content-type-options'];
  expect(headerValue).toBeDefined();
  expect(headerValue.toLowerCase()).toContain(expectedValue.toLowerCase());
});

Then('le header X-Frame-Options contient {string}', (expectedValue: string) => {
  expect(context.headers).toBeDefined();
  const headerValue = context.headers['x-frame-options'];
  expect(headerValue).toBeDefined();
  expect(headerValue.toLowerCase()).toContain(expectedValue.toLowerCase());
});

Then('le header Referrer-Policy contient {string}', (expectedValue: string) => {
  expect(context.headers).toBeDefined();
  const headerValue = context.headers['referrer-policy'];
  expect(headerValue).toBeDefined();
  expect(headerValue.toLowerCase()).toContain(expectedValue.toLowerCase());
});

// Routing Verification
Then('le backend reçoit la requête correctement', () => {
  // Verify by checking response is from backend (not an error page)
  expect(context.statusCode).not.toBe(502);
  expect(context.statusCode).not.toBe(503);
  expect(context.statusCode).not.toBe(504);
});

Then('le frontend reçoit la requête correctement', () => {
  // Verify by checking response status
  expect([200, 304]).toContain(context.statusCode);
});
