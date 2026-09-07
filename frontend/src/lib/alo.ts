/**
 * Emplacement d'alo, déduit de l'hôte courant.
 *
 * alo vit sur un sous-domaine et non sur un chemin : le nginx embarqué dans son
 * image proxifie déjà `/api` vers son propre backend, et sous un chemin ces
 * appels entreraient en collision avec l'API de maisonnettev2.
 *
 * L'URL se déduit de l'hôte plutôt que d'être écrite en dur, pour valoir aussi
 * bien en développement (`maisonnette.localhost:8030`) qu'en production.
 */
export function urlAlo(url: URL): string {
  const hote = url.hostname.replace(/^www\./, '');
  const port = url.port ? `:${url.port}` : '';
  return `${url.protocol}//alo.${hote}${port}/`;
}

/** Destination de repli quand alo n'est pas déployé sur cet environnement. */
export const REPLI_APRES_CONNEXION = '/backoffice/meals';

/**
 * Où envoyer l'utilisateur après une connexion réussie.
 *
 * alo est la destination souhaitée, mais il n'est pas déployé partout : le
 * sous-domaine n'existe pas encore en production. Y renvoyer sans vérifier
 * rendrait la connexion inutilisable là-bas — on se retrouverait sur une erreur
 * de résolution de nom, sans retour possible.
 *
 * D'où ce contrôle préalable. `no-cors` suffit : on ne lit pas la réponse, on
 * veut seulement savoir si l'hôte répond. Le délai est court, l'attente après
 * connexion devant rester imperceptible.
 */
export async function destinationApresConnexion(url: URL): Promise<string> {
  const cible = urlAlo(url);
  try {
    await fetch(cible, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: AbortSignal.timeout(1500),
    });
    return cible;
  } catch {
    return REPLI_APRES_CONNEXION;
  }
}
