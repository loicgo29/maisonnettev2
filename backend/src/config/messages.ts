/**
 * Les sept messages qui accompagnent un séjour, et quand ils partent.
 *
 * Tout est regroupé ici pour qu'ajuster un délai ne demande pas de toucher au
 * moteur : c'est le fichier que Loïc modifiera après avoir observé quelques
 * séjours.
 *
 * Les délais sont relatifs aux dates du séjour, jamais absolus : une
 * réservation décalée voit ses messages se replanifier seuls.
 */

export type TypeMessage =
  | 'CANAL'
  | 'GUIDE'
  | 'RAPPEL_ARRIVEE'
  | 'ARRIVEE_OK'
  | 'PLANTES'
  | 'CHECKOUT'
  | 'RETOUR';

/** Point de référence à partir duquel le délai est compté. */
type Ancre = 'CREATION' | 'ARRIVEE' | 'DEPART' | 'MILIEU_SEJOUR';

export interface RegleMessage {
  type: TypeMessage;
  libelle: string;
  ancre: Ancre;
  /** Décalage en jours par rapport à l'ancre. Négatif = avant. */
  decalageJours: number;
  /** Heure d'envoi, en heures locales (Europe/Paris). */
  heure: number;
  /** Proposé coché dans le formulaire de saisie. */
  cochePardefaut: boolean;
}

export const REGLES_MESSAGES: RegleMessage[] = [
  {
    type: 'CANAL',
    libelle: 'Par quel canal communique-t-on',
    ancre: 'CREATION',
    decalageJours: 1,
    heure: 10,
    cochePardefaut: true,
  },
  {
    type: 'GUIDE',
    libelle: 'Guide de la maison',
    ancre: 'ARRIVEE',
    decalageJours: -7,
    heure: 10,
    cochePardefaut: true,
  },
  {
    type: 'RAPPEL_ARRIVEE',
    libelle: "Rappel de l'adresse et du téléphone",
    ancre: 'ARRIVEE',
    decalageJours: -2,
    heure: 10,
    cochePardefaut: true,
  },
  {
    type: 'ARRIVEE_OK',
    libelle: 'Êtes-vous bien arrivé',
    ancre: 'ARRIVEE',
    decalageJours: 0,
    heure: 19,
    cochePardefaut: true,
  },
  {
    type: 'PLANTES',
    libelle: 'Arrosage des plantes',
    ancre: 'MILIEU_SEJOUR',
    decalageJours: 0,
    heure: 10,
    // Décoché par défaut : ne concerne que certaines périodes, et un séjour
    // d'une nuit n'a pas de milieu.
    cochePardefaut: false,
  },
  {
    type: 'CHECKOUT',
    libelle: 'Rappel du départ à 12 h',
    ancre: 'DEPART',
    decalageJours: -1,
    heure: 18,
    cochePardefaut: true,
  },
  {
    type: 'RETOUR',
    libelle: 'Le séjour s’est-il bien passé',
    ancre: 'DEPART',
    decalageJours: 1,
    heure: 10,
    cochePardefaut: true,
  },
];

/**
 * Calcule la date d'envoi d'un message pour un séjour donné.
 *
 * Les heures sont exprimées en Europe/Paris. On construit la date en heure
 * locale puis on la convertit : planifier « 19 h » en UTC enverrait le message
 * à 21 h l'été, quand le client vient d'arriver.
 */
export function calculerDateEnvoi(
  regle: RegleMessage,
  reservation: { createdAt: Date; dateDebut: Date; dateFin: Date }
): Date {
  let base: Date;

  switch (regle.ancre) {
    case 'CREATION':
      base = new Date(reservation.createdAt);
      break;
    case 'ARRIVEE':
      base = new Date(reservation.dateDebut);
      break;
    case 'DEPART':
      base = new Date(reservation.dateFin);
      break;
    case 'MILIEU_SEJOUR': {
      const duree = reservation.dateFin.getTime() - reservation.dateDebut.getTime();
      base = new Date(reservation.dateDebut.getTime() + duree / 2);
      break;
    }
  }

  base.setDate(base.getDate() + regle.decalageJours);

  // Heure locale de Paris ramenée en UTC. Le décalage varie selon la saison,
  // on le mesure sur la date visée plutôt que de coder +1 ou +2 en dur.
  const decalageMinutes = decalageParisMinutes(base);
  base.setUTCHours(regle.heure, 0, 0, 0);
  base.setUTCMinutes(base.getUTCMinutes() - decalageMinutes);

  return base;
}

/** Décalage d'Europe/Paris par rapport à UTC, en minutes, à une date donnée. */
function decalageParisMinutes(date: Date): number {
  const paris = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((paris.getTime() - utc.getTime()) / 60000);
}

/**
 * Un séjour trop court n'a pas de milieu exploitable : le message d'arrosage
 * tomberait le jour même de l'arrivée ou du départ.
 */
export function sejourTropCourtPourMilieu(dateDebut: Date, dateFin: Date): boolean {
  const nuits = Math.round((dateFin.getTime() - dateDebut.getTime()) / 86400000);
  return nuits < 3;
}
