/**
 * REAL END-TO-END PRODUCTION TESTS
 * Tests the ACTUAL production system, not mocks
 * These tests would have caught the OAuth2 client issue
 */

import { describe, it, expect } from 'vitest';

const PROD = 'https://maisonnette-pecheur-bertheaume.fr';
const AUTH = 'https://auth.maisonnette-pecheur-bertheaume.fr';

describe('E2E Production Tests - REAL PRODUCTION', () => {

  describe('OAuth2 Configuration', () => {
    it('CRITICAL: OAuth2 clients must be configured in Keycloak', async () => {
      const clients = ['maisonnettev2', 'maisonnettev2-frontend', 'maisonnette', 'frontend'];
      const errors = [];

      for (const client of clients) {
        const url = `${AUTH}/realms/maisonnettev2/protocol/openid-connect/auth?` +
          `client_id=${client}&response_type=code&` +
          `redirect_uri=${encodeURIComponent(`${PROD}/admin/callback`)}`;

        const res = await fetch(url);
        const body = await res.text();

        if (body.includes('Client not found')) {
          errors.push(`❌ Client '${client}' returns "Client not found"`);
        } else {
          console.log(`✅ Client '${client}' is configured`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`OAuth2 Configuration Errors:\n${errors.join('\n')}`);
      }
    });

    it('CRITICAL: Admin page must NOT show "Client not found"', async () => {
      const res = await fetch(`${PROD}/admin`);
      const body = await res.text();

      if (body.includes('Client not found')) {
        throw new Error('❌ ADMIN PAGE BROKEN: "Client not found" error visible to users');
      }

      expect(res.status).toBe(200);
    });

    it('CRITICAL: Keycloak realm must be accessible', async () => {
      const res = await fetch(`${AUTH}/realms/maisonnettev2/.well-known/openid-configuration`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.authorization_endpoint).toBeDefined();
      expect(data.token_endpoint).toBeDefined();
    });

    it('CRITICAL: Redirect URIs must be configured correctly', async () => {
      const authUrl = `${AUTH}/realms/maisonnettev2/protocol/openid-connect/auth?` +
        `client_id=maisonnettev2&response_type=code&` +
        `redirect_uri=${encodeURIComponent(`${PROD}/admin/callback`)}&` +
        `state=test123`;

      const res = await fetch(authUrl);
      const body = await res.text();

      // Should NOT show "Client not found" or "Redirect URI mismatch"
      expect(body).not.toContain('Client not found');
      expect(body).not.toContain('Redirect URI mismatch');
    });
  });

  describe('Production System Health', () => {
    it('Backend API must be responsive', async () => {
      const res = await fetch(`${PROD}/api/health`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.checks.database).toBe('connected');
    });

    it('Frontend must load without errors', async () => {
      const res = await fetch(`${PROD}`);
      expect(res.status).toBe(200);

      const body = await res.text();
      expect(body).toContain('<!doctype html>');
      expect(body).not.toContain('Error');
    });

    it('Admin panel must load', async () => {
      const res = await fetch(`${PROD}/admin`);
      expect(res.status).toBe(200);

      const body = await res.text();
      expect(body).toContain('<!doctype html>');
    });
  });

  describe('REGRESSION: Previous OAuth2 Issues', () => {
    it('Must NOT return "Client not found" anymore', async () => {
      const res = await fetch(`${PROD}/admin`);
      const body = await res.text();

      if (body.includes('We are sorry')) {
        throw new Error('❌ REGRESSION: "We are sorry" error is back!');
      }

      if (body.includes('Client not found')) {
        throw new Error('❌ REGRESSION: "Client not found" error returned!');
      }
    });

    it('Must NOT redirect to wrong client_id', async () => {
      const originalUrl = `${AUTH}/realms/maisonnettev2/protocol/openid-connect/auth?` +
        `client_id=maisonnettev2-frontend&response_type=code&` +
        `redirect_uri=${encodeURIComponent(`${PROD}/admin/callback`)}`;

      const res = await fetch(originalUrl, { redirect: 'manual' });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location') || '';
        if (location.includes('client_id=maisonnettev2&') && !location.includes('client_id=maisonnettev2-frontend')) {
          throw new Error('❌ REGRESSION: Client ID is being rewritten incorrectly');
        }
      }
    });
  });

  describe('User Experience', () => {
    it('Admin login flow should NOT show errors to users', async () => {
      const res = await fetch(`${PROD}/admin`);
      const body = await res.text();

      const forbiddenTexts = [
        'Client not found',
        'Redirect URI mismatch',
        'Invalid client',
        'error_description',
        'ErrorMessage'
      ];

      const errors = forbiddenTexts.filter(text => body.includes(text));

      if (errors.length > 0) {
        throw new Error(`❌ ERROR MESSAGES VISIBLE TO USERS: ${errors.join(', ')}`);
      }
    });
  });
});
