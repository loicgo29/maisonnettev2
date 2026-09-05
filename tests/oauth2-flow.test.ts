import { describe, it, expect } from 'vitest';

describe('OAuth2 Flow - Production', () => {
  const PROD_URL = 'https://maisonnette-pecheur-bertheaume.fr';
  const AUTH_URL = 'https://auth.maisonnette-pecheur-bertheaume.fr';

  it('should reach admin page', async () => {
    const res = await fetch(`${PROD_URL}/admin`);
    expect(res.status).toBe(200);
  });

  it('Keycloak realm should be accessible', async () => {
    const res = await fetch(`${AUTH_URL}/realms/maisonnettev2/.well-known/openid-configuration`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authorization_endpoint).toBeDefined();
  });

  it('should NOT return "Client not found" error', async () => {
    const clients = ['maisonnettev2-frontend', 'maisonnettev2', 'maisonnette', 'frontend'];
    
    for (const client of clients) {
      const authUrl = `${AUTH_URL}/realms/maisonnettev2/protocol/openid-connect/auth?` +
        `client_id=${client}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(`${PROD_URL}/admin/callback`)}`;
      
      const res = await fetch(authUrl);
      const body = await res.text();
      
      if (!body.includes('Client not found')) {
        return; // Success - at least one client works
      }
    }
    
    throw new Error('All OAuth2 clients returned "Client not found"');
  });

  it('OAuth2 authorization endpoint should be accessible', async () => {
    const authUrl = `${AUTH_URL}/realms/maisonnettev2/protocol/openid-connect/auth?` +
      `client_id=maisonnettev2-frontend&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(`${PROD_URL}/admin/callback`)}`;
    
    const res = await fetch(authUrl);
    expect(res.status).toBe(200);
    expect(res.text()).resolves.not.toContain('Client not found');
  });

  it('health endpoint should be working', async () => {
    const res = await fetch(`${PROD_URL}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });
});
