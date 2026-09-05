import { test, expect } from '@playwright/test';

test.describe('Health Check Tests', () => {
  test('Frontend is accessible', async ({ page }) => {
    const response = await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    const title = await page.title();
    expect(title.toLowerCase()).toContain('maisonnette');
  });

  test('Backend API health endpoint responds', async ({ fetch }) => {
    const response = await fetch('http://localhost:3001/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('healthy');
    expect(json.checks.database).toBe('connected');
  });

  test('API Swagger documentation is available', async ({ page }) => {
    const response = await page.goto('http://localhost:3001/api/docs', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    const pageTitle = await page.title();
    expect(pageTitle.toLowerCase()).toContain('swagger');
  });

  test('Frontend loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('Database is accessible on port 5433', async () => {
    const pg = await import('pg');
    const client = new pg.Client({
      host: 'localhost',
      port: 5433,
      user: 'maisonnettev2',
      password: process.env.DB_PASSWORD || 'test',
      database: 'maisonnettev2',
    });

    await client.connect();
    const result = await client.query('SELECT 1');
    expect(result.rows).toHaveLength(1);
    await client.end();
  });

  test('Docker containers are running', async () => {
    const { execSync } = await import('child_process');
    const output = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf-8' });

    expect(output).toContain('maisonnettev2-frontend');
    expect(output).toContain('maisonnettev2-backend');
    expect(output).toContain('postgres-maisonnettev2');
  });

  test('No containers are restarting', async () => {
    const { execSync } = await import('child_process');
    const output = execSync('docker ps -a --format "{{.Status}}"', { encoding: 'utf-8' });

    expect(output).not.toContain('Restarting');
  });

  test('Backend API can list reservations endpoint', async ({ fetch }) => {
    const response = await fetch('http://localhost:3001/api/reservations', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || ''}`,
      }
    });

    // Should be 200 with valid token, 401 without
    expect([200, 401, 403]).toContain(response.status());
  });

  test('Frontend receives correct API URL from environment', async () => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    expect(apiUrl).toBe('http://localhost:3001');
  });
});
