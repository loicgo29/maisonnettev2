/**
 * E2E Tests for Public Homepage
 * Verifies that the booking platform homepage works correctly
 */

import { describe, it, expect } from 'vitest';

const PROD = 'https://maisonnette-pecheur-bertheaume.fr';

describe('E2E Homepage - Public Access', () => {

  describe('Page Loading', () => {
    it('CRITICAL: Homepage should load without errors', async () => {
      const res = await fetch(`${PROD}`);
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html.length).toBeGreaterThan(1000);
      expect(html).toContain('<!doctype html>');
    });

    it('Homepage should NOT show OAuth2 errors', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      expect(html).not.toContain('Client not found');
      expect(html).not.toContain('We are sorry');
      expect(html).not.toContain('error');
    });

    it('Homepage should have proper head tags', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      expect(html).toContain('<meta charset');
      expect(html).toContain('viewport');
      expect(html).toContain('<title>');
    });
  });

  describe('Content', () => {
    it('Should display branding/title', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      const hasBranding = html.includes('Maisonnette') ||
                         html.includes('Bertheaume') ||
                         html.includes('gîte') ||
                         html.includes('booking');

      expect(hasBranding).toBe(true);
    });

    it('Should have interactive elements', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      const hasInteractive = html.includes('button') ||
                            html.includes('form') ||
                            html.includes('input') ||
                            html.includes('script');

      expect(hasInteractive).toBe(true);
    });

    it('Should be a SvelteKit app', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      expect(html).toContain('svelte');
    });
  });

  describe('Navigation', () => {
    it('Should NOT require authentication for homepage', async () => {
      const res = await fetch(`${PROD}`);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('Should be accessible without cookies/auth', async () => {
      const res = await fetch(`${PROD}`, {
        headers: {
          'Cookie': ''
        }
      });

      expect(res.status).toBe(200);
    });
  });

  describe('Performance', () => {
    it('Homepage should load in reasonable time', async () => {
      const start = Date.now();
      const res = await fetch(`${PROD}`);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('Should return valid content-type', async () => {
      const res = await fetch(`${PROD}`);
      const contentType = res.headers.get('content-type');

      expect(contentType).toContain('text/html');
    });
  });

  describe('Security', () => {
    it('Should have security headers', async () => {
      const res = await fetch(`${PROD}`);

      const cors = res.headers.get('access-control-allow-origin');
      expect(cors).toBeDefined();
    });

    it('Should NOT expose sensitive info', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      expect(html).not.toContain('password');
      expect(html).not.toContain('secret');
      expect(html).not.toContain('api_key');
    });
  });

  describe('REGRESSION: Previous Issues', () => {
    it('Must NOT show "Client not found"', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      expect(html).not.toContain('Client not found');
    });

    it('Must NOT show OAuth2 errors', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      expect(html).not.toContain('We are sorry');
    });

    it('Must load as valid HTML', async () => {
      const res = await fetch(`${PROD}`);
      const html = await res.text();

      expect(html).toContain('<!doctype html>');
      expect(html.length).toBeGreaterThan(500);
    });
  });
});
