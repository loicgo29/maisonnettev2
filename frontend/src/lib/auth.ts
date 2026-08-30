/**
 * Authentification du backoffice contre Keycloak — Authorization Code + PKCE.
 *
 * Token stocké en sessionStorage : persiste entre rechargements et redirections,
 * disparaît à fermeture du navigateur. Simple et fiable.
 */

import { browser } from '$app/environment';
import { PUBLIC_AUTH_URL, PUBLIC_AUTH_REALM, PUBLIC_AUTH_CLIENT_ID } from '$env/static/public';

const REALM_URL = `${PUBLIC_AUTH_URL}/realms/${PUBLIC_AUTH_REALM}`;
const CLE_VERIFICATEUR = 'admin_pkce_verifier';
const CLE_RETOUR = 'admin_retour_apres_connexion';
const CLE_JETON = 'admin_jeton_acces';

let jetonActuel: string | null = null;

function chargerJetonSiPresent() {
  if (jetonActuel) return;
  if (!browser) return;
  const j = sessionStorage.getItem(CLE_JETON);
  if (j) jetonActuel = j;
}

export function jeton(): string | null {
  chargerJetonSiPresent();
  return jetonActuel;
}

export function estConnecte(): boolean {
  return jeton() !== null;
}

// --- PKCE : génération du couple verifier / challenge -----------------------

function chaineAleatoire(longueur: number): string {
  const octets = crypto.getRandomValues(new Uint8Array(longueur));
  return base64Url(octets);
}

function base64Url(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function challengeDepuisVerificateur(verificateur: string): Promise<string> {
  const donnees = new TextEncoder().encode(verificateur);
  const hache = await crypto.subtle.digest('SHA-256', donnees);
  return base64Url(new Uint8Array(hache));
}

/** Lance le flux : redirige vers Keycloak. À appeler depuis un clic « Se connecter ». */
export async function demarrerConnexion(retourApres = '/admin'): Promise<void> {
  if (!browser) return;

  const verificateur = chaineAleatoire(32);
  const challenge = await challengeDepuisVerificateur(verificateur);

  sessionStorage.setItem(CLE_VERIFICATEUR, verificateur);
  sessionStorage.setItem(CLE_RETOUR, retourApres);

  // Log pour déboguer PKCE
  console.log('[AUTH] PKCE Verifier stored:', {
    verifierLength: verificateur.length,
    challengeLength: challenge.length,
  });

  const params = new URLSearchParams({
    client_id: PUBLIC_AUTH_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: `${location.origin}/admin/callback`,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  console.log('[AUTH] Redirecting to Authentik with params:', {
    client_id: PUBLIC_AUTH_CLIENT_ID,
    redirect_uri: `${location.origin}/admin/callback`,
    code_challenge_length: challenge.length,
  });

  location.href = `${REALM_URL}/protocol/openid-connect/auth?${params}`;
}

/**
 * À appeler sur /admin/callback : échange le code contre un jeton.
 * Le token est stocké en sessionStorage pour persister entre pages.
 */
export async function terminerConnexion(code: string): Promise<string> {
  const verificateur = sessionStorage.getItem(CLE_VERIFICATEUR);
  if (!verificateur) {
    console.error('[AUTH] PKCE Verifier missing from sessionStorage');
    throw new Error('Aucune tentative de connexion en cours (vérificateur PKCE absent)');
  }

  console.log('[AUTH] Exchanging code for token with:', {
    codeLength: code.length,
    verifierLength: verificateur.length,
    client_id: PUBLIC_AUTH_CLIENT_ID,
    redirect_uri: `${location.origin}/admin/callback`,
  });

  const reponse = await fetch(`${REALM_URL}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: PUBLIC_AUTH_CLIENT_ID,
      code,
      redirect_uri: `${location.origin}/admin/callback`,
      code_verifier: verificateur,
    }),
  });

  sessionStorage.removeItem(CLE_VERIFICATEUR);

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => '');
    console.error('[AUTH] Token exchange failed:', {
      status: reponse.status,
      error: detail,
    });
    throw new Error(`Échange du code refusé (${reponse.status}) ${detail.slice(0, 200)}`);
  }

  console.log('[AUTH] Token exchange successful');

  const donnees = await reponse.json();
  jetonActuel = donnees.access_token;
  // Persist en sessionStorage pour survire aux rechargements du callback redirect
  if (browser) sessionStorage.setItem(CLE_JETON, donnees.access_token);

  const retour = sessionStorage.getItem(CLE_RETOUR) || '/admin';
  sessionStorage.removeItem(CLE_RETOUR);
  return retour;
}

export function deconnexion(): void {
  jetonActuel = null;
  if (browser) {
    sessionStorage.removeItem(CLE_JETON);
    location.href = `${REALM_URL}/protocol/openid-connect/logout?client_id=${PUBLIC_AUTH_CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(location.origin)}`;
  }
}

/**
 * Décode le payload d'un JWT sans le vérifier — la vérification cryptographique
 * appartient au backend. Ici on lit seulement des informations d'affichage.
 */
export function chargeUtile(jwt: string): Record<string, any> | null {
  try {
    const [, payload] = jwt.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function aLeRoleAdmin(jwt: string): boolean {
  const donnees = chargeUtile(jwt);
  const roles: string[] = donnees?.realm_access?.roles ?? [];
  return roles.includes('admin');
}
