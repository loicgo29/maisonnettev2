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
    await demarrerConnexion(location.pathname);
    // demarrerConnexion redirige la page : cette ligne n'est jamais atteinte
    // en conditions réelles, mais TypeScript exige un retour.
    throw new ErreurAccesRefuse(401, 'Redirection vers la connexion');
  }

  console.log('[API] Sending request with token:', {
    chemin,
    tokenLength: t.length,
    tokenStart: t.substring(0, 20) + '...',
  });

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
    await demarrerConnexion(location.pathname);
    throw new ErreurAccesRefuse(401);
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

  modifierReservation: (id: string, donnees: unknown) =>
    appel(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(donnees) }),

  envoyerMessage: (id: string) => appel(`/messages/${id}/envoyer`, { method: 'POST' }),

  annulerMessage: (id: string) => appel(`/messages/${id}`, { method: 'DELETE' }),

  reglesMessages: () => appel('/regles-messages'),
};

export { ErreurAccesRefuse };
