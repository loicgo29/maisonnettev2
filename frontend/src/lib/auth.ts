/**
 * Authentification du backoffice contre Keycloak — Authorization Code + PKCE.
 *
 * Pas de librairie OIDC : le flux PKCE tient en une douzaine de fonctions
 * s'appuyant sur les Web Crypto API natives, et une dépendance de plus pour ça
 * n'aurait rien apporté. Le jeton reste en mémoire (une variable de module),
 * jamais dans localStorage ni un cookie : un script injecté par XSS ne doit
 * pas pouvoir l'exfiltrer en le lisant simplement.
 *
 * Conséquence assumée : le jeton disparaît à un rechargement de page. Pour un
 * usage interne à quelques personnes, revalider la session au rechargement
 * est un compromis acceptable face au risque de vol de jeton.
 */

import { browser } from '$app/environment';
import { PUBLIC_AUTH_URL, PUBLIC_AUTH_REALM, PUBLIC_AUTH_CLIENT_ID } from '$env/static/public';

const REALM_URL = `${PUBLIC_AUTH_URL}/realms/${PUBLIC_AUTH_REALM}`;
const CLE_VERIFICATEUR = 'admin_pkce_verifier';
const CLE_RETOUR = 'admin_retour_apres_connexion';

let jetonActuel: string | null = null;

export function jeton(): string | null {
  return jetonActuel;
}

export function estConnecte(): boolean {
  return jetonActuel !== null;
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

  // sessionStorage et non localStorage : le vérificateur ne sert qu'à cette
  // tentative de connexion, il n'a aucune raison de survivre à l'onglet.
  sessionStorage.setItem(CLE_VERIFICATEUR, verificateur);
  sessionStorage.setItem(CLE_RETOUR, retourApres);

  const params = new URLSearchParams({
    client_id: PUBLIC_AUTH_CLIENT_ID,
    response_type: 'code',
    scope: 'openid',
    redirect_uri: `${location.origin}/admin/callback`,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  location.href = `${REALM_URL}/protocol/openid-connect/auth?${params}`;
}

/**
 * À appeler sur /admin/callback : échange le code contre un jeton.
 * Lève une erreur explicite en cas d'échec — l'appelant décide de l'affichage.
 */
export async function terminerConnexion(code: string): Promise<string> {
  const verificateur = sessionStorage.getItem(CLE_VERIFICATEUR);
  if (!verificateur) {
    throw new Error('Aucune tentative de connexion en cours (vérificateur PKCE absent)');
  }

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
    throw new Error(`Échange du code refusé par Keycloak (${reponse.status}) ${detail.slice(0, 200)}`);
  }

  const donnees = await reponse.json();
  jetonActuel = donnees.access_token;

  const retour = sessionStorage.getItem(CLE_RETOUR) || '/admin';
  sessionStorage.removeItem(CLE_RETOUR);
  return retour;
}

export function deconnexion(): void {
  jetonActuel = null;
  if (browser) {
    location.href = `${REALM_URL}/protocol/openid-connect/logout?client_id=${PUBLIC_AUTH_CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(location.origin)}`;
  }
}

/**
 * Décode le payload d'un JWT sans le vérifier — la vérification cryptographique
 * appartient au backend. Ici on lit seulement des informations d'affichage
 * (nom, rôles pour l'UI), jamais une décision de sécurité.
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
