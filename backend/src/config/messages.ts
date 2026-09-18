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
  | 'RETOUR'
  | 'RELANCE_ACOMPTE'
  | 'RELANCE_SOLDE';

/**
 * Point de référence à partir duquel le délai est compté.
 * ACOMPTE_MIN est un cas particulier : la relance d'acompte part à la
 * première des deux échéances atteintes (création + 10 j, ou arrivée - 10 j),
 * pas à un délai simple par rapport à une seule ancre.
 */
type Ancre = 'CREATION' | 'ARRIVEE' | 'DEPART' | 'MILIEU_SEJOUR' | 'ACOMPTE_MIN';

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
  {
    type: 'RELANCE_ACOMPTE',
    libelle: "Relance de l'acompte (Leboncoin, Direct, Autre)",
    // decalageJours ignoré pour cette ancre : le calcul réel (J+10 création
    // ou J-10 arrivée, la première échéance atteinte) vit dans
    // calculerDateEnvoi. Ne concerne pas Airbnb/Booking, qui encaissent
    // eux-mêmes — filtré dans messagesSejour.ts, pas ici.
    ancre: 'ACOMPTE_MIN',
    decalageJours: 0,
    heure: 10,
    cochePardefaut: true,
  },
  {
    type: 'RELANCE_SOLDE',
    libelle: 'Relance du solde (Leboncoin, Direct, Autre)',
    ancre: 'ARRIVEE',
    decalageJours: -3,
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
    case 'ACOMPTE_MIN': {
      const creationPlus10 = new Date(reservation.createdAt);
      creationPlus10.setDate(creationPlus10.getDate() + 10);
      const arriveeMoins10 = new Date(reservation.dateDebut);
      arriveeMoins10.setDate(arriveeMoins10.getDate() - 10);
      base = creationPlus10.getTime() < arriveeMoins10.getTime() ? creationPlus10 : arriveeMoins10;

      // Plancher au lendemain de la réservation : pour un séjour réservé à
      // moins de 10 jours de l'arrivée, `arrivée - 10` tombe avant que la
      // réservation n'existe. Le moteur ignore toute date passée de plus de
      // deux jours, donc sans ce plancher une réservation de dernière minute
      // ne recevrait aucune relance — silencieusement.
      const lendemainCreation = new Date(reservation.createdAt);
      lendemainCreation.setDate(lendemainCreation.getDate() + 1);
      if (base.getTime() < lendemainCreation.getTime()) base = lendemainCreation;
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
