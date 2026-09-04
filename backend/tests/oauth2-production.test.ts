import { describe, it, expect } from 'vitest';

describe('OAuth2 Production Flow', () => {
  const PROD_URL = 'https://maisonnette-pecheur-bertheaume.fr';
  const AUTH_URL = 'https://auth.maisonnette-pecheur-bertheaume.fr';

  it('Admin page should load without "Client not found"', async () => {
    const res = await fetch(`${PROD_URL}/admin`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).not.toContain('Client not found');
  });

  it('Keycloak realm should be accessible', async () => {
    const res = await fetch(`${AUTH_URL}/realms/maisonnettev2/.well-known/openid-configuration`);
    expect(res.status).toBe(200);
  });

  it('OAuth2 clients should be configured', async () => {
    const clients = ['maisonnettev2-frontend', 'maisonnettev2', 'maisonnette'];
    let oneWorks = false;
    
    for (const client of clients) {
      const authUrl = `${AUTH_URL}/realms/maisonnettev2/protocol/openid-connect/auth?client_id=${client}&response_type=code&redirect_uri=https://maisonnette-pecheur-bertheaume.fr/admin/callback`;
      const res = await fetch(authUrl);
      const body = await res.text();
      if (!body.includes('Client not found')) {
        oneWorks = true;
        break;
      }
    }
    
    expect(oneWorks).toBe(true);
  });

  it('API health should be working', async () => {
    const res = await fetch(`${PROD_URL}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });
});
