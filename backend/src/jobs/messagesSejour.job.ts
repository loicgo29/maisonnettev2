import cron, { type ScheduledTask } from 'node-cron';
import { executerPassage } from '../services/messagesSejour.js';

/**
 * Planificateur des messages de séjour.
 *
 * Sans lui, `executerPassage()` n'était appelé qu'à la création d'une
 * réservation depuis le backoffice : un séjour saisi longtemps à l'avance
 * n'envoyait jamais son rappel J-2, faute de quoi que ce soit pour le
 * réveiller le moment venu.
 *
 * Passage horaire et non quotidien : les règles se calent sur des dates, pas
 * sur des heures précises, mais un passage fréquent rattrape sans bruit les
 * redémarrages de conteneur et les fenêtres manquées.
 *
 * L'envoi réel reste conditionné à MESSAGES_AUTO=true (garde-fou porté par le
 * service lui-même) : sans cette variable, le passage se contente de créer et
 * d'annuler les messages, ce qui rend l'activation en production explicite.
 */

const PLANIFICATION = '0 * * * *'; // toutes les heures, à la minute 0

let tache: ScheduledTask | null = null;

async function passage(): Promise<void> {
  try {
    const resultat = await executerPassage();
    const total =
      resultat.crees + resultat.annules + resultat.envoyes + resultat.impossibles + resultat.echecs;

    // Silencieux quand il n'y a rien eu à faire : le passage tourne 24 fois par
    // jour et n'a aucune raison d'inonder les journaux.
    if (total > 0) {
      console.log(
        `📬 Messages séjour — créés:${resultat.crees} annulés:${resultat.annules} ` +
          `envoyés:${resultat.envoyes} impossibles:${resultat.impossibles} échecs:${resultat.echecs}`
      );
    }
  } catch (erreur) {
    // Une erreur ne doit jamais arrêter la planification : le passage suivant
    // reprendra le travail là où celui-ci a échoué.
    const motif = erreur instanceof Error ? erreur.message : String(erreur);
    console.error(`💥 Messages séjour — passage en échec : ${motif}`);
  }
}

export function demarrerPlanificateurMessages(): void {
  if (tache) return;

  tache = cron.schedule(PLANIFICATION, passage);

  const envoiActif = process.env.MESSAGES_AUTO === 'true';
  console.log(
    `⏰ Planificateur messages séjour actif (${PLANIFICATION}) — ` +
      `envoi ${envoiActif ? 'activé' : 'désactivé (MESSAGES_AUTO≠true)'}`
  );

  // Un passage au démarrage rattrape ce qui était dû pendant que le service
  // était arrêté, sans attendre la prochaine heure ronde.
  void passage();
}

export function arreterPlanificateurMessages(): void {
  tache?.stop();
  tache = null;
}
