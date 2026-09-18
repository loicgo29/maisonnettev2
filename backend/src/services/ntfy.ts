/**
 * Notifications ntfy — utilisé pour les relances d'acompte/solde, qui
 * demandent toujours une approbation manuelle de Loïc avant envoi (argent en
 * jeu, contrairement aux sept messages de séjour qui peuvent partir seuls).
 *
 * NTFY_URL pointe un topic ntfy.sh privé (nom = secret d'accès, non commité —
 * voir .env). Silencieux en cas d'échec : une notification manquée ne doit
 * jamais faire échouer le passage du planificateur, le message reste visible
 * dans /admin/messages de toute façon.
 */

export interface NotificationRelance {
  titre: string;
  message: string;
}

export async function notifier(options: NotificationRelance): Promise<boolean> {
  const url = process.env.NTFY_URL;
  if (!url) {
    console.warn('⚠️  NTFY_URL non configuré — notification de relance ignorée');
    return false;
  }

  try {
    const reponse = await fetch(url, {
      method: 'POST',
      headers: {
        Title: options.titre,
        Priority: 'high',
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: options.message,
    });
    return reponse.ok;
  } catch (erreur) {
    const motif = erreur instanceof Error ? erreur.message : String(erreur);
    console.error(`💥 Notification ntfy en échec : ${motif}`);
    return false;
  }
}
