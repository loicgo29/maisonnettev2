import { Given, When, Then, Before } from '@cucumber/cucumber';
import axios, { AxiosInstance } from 'axios';
import { expect } from 'expect';

interface TestContext {
  apiClient: AxiosInstance;
  response?: any;
  error?: any;
  token?: string;
  statusCode?: number;
}

const context: TestContext = {
  apiClient: axios.create({
    baseURL: 'http://localhost:3001',
    validateStatus: () => true, // Don't throw on any status
  }),
};

Before(() => {
  context.response = undefined;
  context.error = undefined;
  context.statusCode = undefined;
});

// Authentication context
Given('Authentik est disponible sur http://localhost:9000', async () => {
  const response = await axios.get('http://localhost:9000/-/health/live/', {
    validateStatus: () => true,
  });
  expect(response.status).toBe(200);
});

Given('le frontend est accessible sur http://localhost:5173', async () => {
  const response = await axios.get('http://localhost:5173', {
    validateStatus: () => true,
  });
  expect([200, 304]).toContain(response.status);
});

Given('le backend est accessible sur http://localhost:3001', async () => {
  const response = await axios.get('http://localhost:3001/health', {
    validateStatus: () => true,
  });
  expect([200, 503]).toContain(response.status);
});

// Navigation steps
When('je navigue vers {string}', async (url: string) => {
  try {
    context.response = await context.apiClient.get(url.replace('http://localhost:3001', ''));
    context.statusCode = context.response.status;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

When('j\'appelle GET {string}', async (endpoint: string) => {
  try {
    context.response = await context.apiClient.get(endpoint.replace('http://localhost:3001', ''));
    context.statusCode = context.response.status;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

When('j\'appelle GET {string} avec un JWT valide', async (endpoint: string) => {
  try {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6OTk5OTk5OTk5OX0.test';
    context.response = await context.apiClient.get(
      endpoint.replace('http://localhost:3001', ''),
      {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      }
    );
    context.statusCode = context.response.status;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

When('j\'appelle GET {string} sans authentification', async (endpoint: string) => {
  try {
    context.response = await context.apiClient.get(
      endpoint.replace('http://localhost:3001', '')
    );
    context.statusCode = context.response.status;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

When('j\'appelle GET {string} avec un JWT expiré', async (endpoint: string) => {
  try {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTAwMDAwMDAwMH0.expired';
    context.response = await context.apiClient.get(
      endpoint.replace('http://localhost:3001', ''),
      {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      }
    );
    context.statusCode = context.response.status;
  } catch (error) {
    context.error = error;
    context.statusCode = 500;
  }
});

// Verification steps
Then('la réponse est {int}', (status: number) => {
  expect(context.statusCode).toBe(status);
});

Then('la réponse est {int} ou {int}', (status1: number, status2: number) => {
  expect([status1, status2]).toContain(context.statusCode);
});

Then('le service est {string}', (state: string) => {
  if (state === 'healthy') {
    expect(context.response.data).toHaveProperty('http');
  }
});

Then('le statut n\'est pas {int}', (status: number) => {
  expect(context.statusCode).not.toBe(status);
});

Then('le message contient {string}', (text: string) => {
  const response = JSON.stringify(context.response.data);
  expect(response.toLowerCase()).toContain(text.toLowerCase());
});

Then('le champ {string} existe', (field: string) => {
  expect(context.response.data).toHaveProperty(field);
});

Then('je vois la documentation Swagger', () => {
  const content = context.response.data || '';
  expect(content.toString().toLowerCase()).toMatch(/swagger|openapi|api/i);
});

Then('la page charge', () => {
  expect(context.statusCode).toBeLessThan(500);
});

Then('je vois {string} ou {string}', (text1: string, text2: string) => {
  const content = JSON.stringify(context.response.data).toLowerCase();
  const hasText = content.includes(text1.toLowerCase()) || content.includes(text2.toLowerCase());
  expect(hasText).toBe(true);
});

Then('la page se charge sans erreur', () => {
  expect(context.statusCode).not.toBe(500);
});
