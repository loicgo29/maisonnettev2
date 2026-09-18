/**
 * Appels à /api/admin, avec le jeton joint automatiquement.
 *
 * Un 401 renvoyé par le backend signifie que le jeton a expiré ou est absent :
 * on renvoie alors vers la connexion plutôt que d'afficher une erreur
 * technique — l'utilisateur n'a besoin de savoir que « reconnecte-toi ».
 */

import { jeton, demarrerConnexion } from './auth';

const BASE = '/api/admin';

class ErreurAccesRefuse extends Error {
  constructor(public statut: number, public motif?: string) {
    super(motif ?? `Accès refusé (${statut})`);
  }
}

async function appel(chemin: string, options: RequestInit = {}): Promise<any> {
  const t = jeton();

  if (!t) {
    console.error('[API] No token found in sessionStorage');
    // DEV MODE: Don't redirect to Keycloak, let API fail with 401 instead
    // TODO: Remove this bypass in production
    // await demarrerConnexion(location.pathname);
    throw new ErreurAccesRefuse(401, 'No token in sessionStorage (dev mode bypass)');
  }


  const reponse = await fetch(`${BASE}${chemin}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (reponse.status === 401) {
    console.error('[API] 401 Unauthorized:', {
      chemin,
      tokenLength: t.length,
      response: await reponse.text().catch(() => 'No response body'),
    });
  }

  if (reponse.status === 401) {
    // DEV MODE: Don't redirect to Keycloak
    // TODO: Remove this bypass in production
    // await demarrerConnexion(location.pathname);
    throw new ErreurAccesRefuse(401, 'API returned 401 (dev mode bypass)');
  }

  if (reponse.status === 403) {
    throw new ErreurAccesRefuse(403, 'Le compte connecté n’a pas le rôle administrateur');
  }

  if (!reponse.ok) {
    const corps = await reponse.json().catch(() => ({}));
    throw new ErreurAccesRefuse(reponse.status, corps.error ?? corps.details);
  }

  if (reponse.status === 204) return null;
  return reponse.json();
}

export const apiAdmin = {
  tableauDeBord: () => appel('/dashboard'),

  reservations: (filtres?: { statut?: string; plateforme?: string }) => {
    const params = new URLSearchParams(filtres as Record<string, string>);
    const suffixe = params.toString() ? `?${params}` : '';
    return appel(`/reservations${suffixe}`);
  },

  messages: (filtres?: { statut?: string; dus?: boolean }) => {
    const params = new URLSearchParams();
    if (filtres?.statut) params.set('statut', filtres.statut);
    if (filtres?.dus) params.set('dus', '1');
    const suffixe = params.toString() ? `?${params}` : '';
    return appel(`/messages${suffixe}`);
  },

  creerReservation: (donnees: unknown) =>
    appel('/reservations', { method: 'POST', body: JSON.stringify(donnees) }),

  importerReservationsCalendrier: () =>
    appel('/reservations/importer-calendrier', { method: 'POST' }),

  modifierReservation: (id: string, donnees: unknown) =>
    appel(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(donnees) }),

  envoyerMessage: (id: string) => appel(`/messages/${id}/envoyer`, { method: 'POST' }),

  annulerMessage: (id: string) => appel(`/messages/${id}`, { method: 'DELETE' }),

  reglesMessages: () => appel('/regles-messages'),
};

export { ErreurAccesRefuse };
