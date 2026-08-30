import { describe, it, expect, beforeEach, vi } from 'vitest';
import { jeton, estConnecte, demarrerConnexion, deconnexion, chargeUtile, aLeRoleAdmin } from '../../frontend/src/lib/auth';

describe('Auth Module', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('jeton()', () => {
    it('should return null if no token is stored', () => {
      const token = jeton();
      expect(token).toBeNull();
    });

    it('should return token from sessionStorage', () => {
      const testToken = 'test-jwt-token';
      sessionStorage.setItem('admin_jeton_acces', testToken);
      const token = jeton();
      expect(token).toBe(testToken);
    });

    it('should cache token in memory after first retrieval', () => {
      const testToken = 'cached-token';
      sessionStorage.setItem('admin_jeton_acces', testToken);

      const token1 = jeton();
      sessionStorage.clear(); // Simuler suppression de sessionStorage
      const token2 = jeton(); // Devrait retourner le token en mémoire

      expect(token1).toBe(testToken);
      expect(token2).toBe(testToken);
    });
  });

  describe('estConnecte()', () => {
    it('should return false if no token', () => {
      const connected = estConnecte();
      expect(connected).toBe(false);
    });

    it('should return true if token exists', () => {
      sessionStorage.setItem('admin_jeton_acces', 'valid-token');
      const connected = estConnecte();
      expect(connected).toBe(true);
    });
  });

  describe('demarrerConnexion()', () => {
    it('should store PKCE verifier in sessionStorage', async () => {
      const locationHrefSpy = vi.spyOn(window.location, 'href', 'get');

      // Mock crypto.getRandomValues
      global.crypto = {
        getRandomValues: (arr: Uint8Array) => {
          arr.fill(42);
          return arr;
        },
        subtle: {
          digest: vi.fn().mockResolvedValue(new Uint8Array(32)),
        },
      } as any;

      await demarrerConnexion('/admin');

      const verifier = sessionStorage.getItem('admin_pkce_verifier');
      const retour = sessionStorage.getItem('admin_retour_apres_connexion');

      expect(verifier).toBeTruthy();
      expect(retour).toBe('/admin');
    });

    it('should store redirect return URL', async () => {
      global.crypto = {
        getRandomValues: (arr: Uint8Array) => {
          arr.fill(42);
          return arr;
        },
        subtle: {
          digest: vi.fn().mockResolvedValue(new Uint8Array(32)),
        },
      } as any;

      await demarrerConnexion('/admin/reservations');

      const retour = sessionStorage.getItem('admin_retour_apres_connexion');
      expect(retour).toBe('/admin/reservations');
    });
  });

  describe('terminerConnexion()', () => {
    it('should throw error if no PKCE verifier', async () => {
      const code = 'auth-code-123';

      try {
        await (terminerConnexion as any)(code);
        expect.fail('Should throw error');
      } catch (error: any) {
        expect(error.message).toContain('PKCE');
      }
    });

    it('should store token in sessionStorage on success', async () => {
      const code = 'auth-code';
      const mockToken = 'mock-access-token';

      sessionStorage.setItem('admin_pkce_verifier', 'verifier');

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          access_token: mockToken,
        }),
      });

      const result = await (terminerConnexion as any)(code);

      const storedToken = sessionStorage.getItem('admin_jeton_acces');
      expect(storedToken).toBe(mockToken);
      expect(result).toBe('/admin'); // Default return URL
    });

    it('should throw error if token exchange fails', async () => {
      sessionStorage.setItem('admin_pkce_verifier', 'verifier');

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValueOnce('Invalid code'),
      });

      try {
        await (terminerConnexion as any)('invalid-code');
        expect.fail('Should throw error');
      } catch (error: any) {
        expect(error.message).toContain('401');
      }
    });

    it('should handle PKCE code mismatch error', async () => {
      sessionStorage.setItem('admin_pkce_verifier', 'incorrect-verifier');

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValueOnce(
          JSON.stringify({
            error: 'invalid_grant',
            error_description: 'PKCE verification failed: Code mismatch',
          })
        ),
      });

      try {
        await (terminerConnexion as any)('valid-code');
        expect.fail('Should throw error');
      } catch (error: any) {
        expect(error.message).toContain('400');
        expect(error.message).toContain('PKCE');
      }
    });
  });

  describe('deconnexion()', () => {
    it('should clear sessionStorage token', () => {
      sessionStorage.setItem('admin_jeton_acces', 'some-token');

      // Mock location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      deconnexion();

      const token = sessionStorage.getItem('admin_jeton_acces');
      expect(token).toBeNull();
    });
  });

  describe('chargeUtile()', () => {
    it('should decode JWT payload', () => {
      // JWT format: header.payload.signature
      const payload = { sub: 'user123', email: 'user@test.com', name: 'Test User' };
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const jwt = `header.${payloadB64}.signature`;

      const decoded = chargeUtile(jwt);

      expect(decoded?.sub).toBe('user123');
      expect(decoded?.email).toBe('user@test.com');
      expect(decoded?.name).toBe('Test User');
    });

    it('should return null for invalid JWT', () => {
      const decoded = chargeUtile('invalid-jwt');
      expect(decoded).toBeNull();
    });
  });

  describe('aLeRoleAdmin()', () => {
    it('should return true if user has admin role', () => {
      const payload = {
        sub: 'admin123',
        realm_access: {
          roles: ['admin', 'user'],
        },
      };
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const jwt = `header.${payloadB64}.signature`;

      const isAdmin = aLeRoleAdmin(jwt);
      expect(isAdmin).toBe(true);
    });

    it('should return false if user does not have admin role', () => {
      const payload = {
        sub: 'user123',
        realm_access: {
          roles: ['user'],
        },
      };
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const jwt = `header.${payloadB64}.signature`;

      const isAdmin = aLeRoleAdmin(jwt);
      expect(isAdmin).toBe(false);
    });

    it('should handle missing realm_access', () => {
      const payload = { sub: 'user123' };
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const jwt = `header.${payloadB64}.signature`;

      const isAdmin = aLeRoleAdmin(jwt);
      expect(isAdmin).toBe(false);
    });
  });
});
