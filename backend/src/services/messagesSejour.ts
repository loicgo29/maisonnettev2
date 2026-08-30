/**
 * Moteur de planification des messages de séjour.
 *
 * Principe : RÉCONCILIATION, pas file d'attente. Chaque passage recalcule ce
 * qui devrait exister à partir de l'état réel des réservations, au lieu de
 * dépiler une liste figée. Une réservation dont les dates changent voit ses
 * messages se replanifier seuls ; une file créée à la réservation deviendrait
 * fausse au premier changement.
 *
 * Trois phases : créer, annuler, envoyer.
 *
 * L'envoi n'a lieu que si MESSAGES_AUTO vaut 'true'. Par défaut le moteur
 * planifie et laisse Loïc envoyer depuis le backoffice : un e-mail parti chez
 * un client ne se rattrape pas, et une erreur de délai se verrait trop tard.
 */

import { prisma } from '../lib/prisma.js';
import { REGLES_MESSAGES, calculerDateEnvoi, sejourTropCourtPourMilieu } from '../config/messages.js';
import { sendEmail } from './email.js';
import { rendreMessage, type MessageRendu } from '../templates/messages/index.js';

interface MessageAvecReservation {
  type: string;
  reservation: {
    clientPrenom: string;
    clientNom: string;
    dateDebut: Date;
    dateFin: Date;
    gite: { nom: string; adresse: string };
  };
}

/**
 * Rendu pur, sans effet de bord — partagé par l'envoi réel et par l'aperçu du
 * backoffice (`GET /messages`), pour que le texte affiché avant envoi soit
 * exactement celui qui partirait.
 */
export function construireApercu(message: MessageAvecReservation): MessageRendu {
  return rendreMessage(message.type, {
    clientPrenom: message.reservation.clientPrenom,
    clientNom: message.reservation.clientNom,
    giteNom: message.reservation.gite.nom,
    adresse: message.reservation.gite.adresse,
    dateDebut: message.reservation.dateDebut,
    dateFin: message.reservation.dateFin,
    telephone: process.env.OWNER_PHONE ?? '',
  });
}

export interface ResultatPassage {
  crees: number;
  annules: number;
  envoyes: number;
  impossibles: number;
  echecs: number;
}

/** Injectable pour que les tests n'expédient jamais rien. */
export type Expediteur = (options: {
  to: string;
  subject: string;
  html: string;
}) => Promise<boolean>;

const expediteurParDefaut: Expediteur = (options) =>
  sendEmail({ to: options.to, subject: options.subject, html: options.html });

export async function executerPassage(
  options: { simulation?: boolean; expediteur?: Expediteur } = {}
): Promise<ResultatPassage> {
  const simulation = options.simulation ?? false;
  const expediteur = options.expediteur ?? expediteurParDefaut;
  const resultat: ResultatPassage = { crees: 0, annules: 0, envoyes: 0, impossibles: 0, echecs: 0 };

  await creerMessagesManquants(resultat, simulation);
  await annulerMessagesSansObjet(resultat, simulation);

  const envoiAutorise = process.env.MESSAGES_AUTO === 'true';
  if (envoiAutorise && !simulation) {
    await envoyerMessagesDus(resultat, expediteur);
  }

  return resultat;
}

/**
 * Phase 1 — créer ce qui manque.
 *
 * Ne crée que les types cochés à la saisie, mémorisés dans notesInternes sous
 * forme d'une ligne `messages: TYPE,TYPE`. Un champ dédié serait plus propre,
 * mais imposerait une migration supplémentaire pour une information qui ne sert
 * qu'à la création.
 */
async function creerMessagesManquants(resultat: ResultatPassage, simulation: boolean) {
  const reservations = await prisma.reservation.findMany({
    where: { statut: { not: 'CANCELLED' } },
    include: { messages: true },
  });

  for (const reservation of reservations) {
    const typesVoulus = typesActives(reservation.notesInternes);
    const dejaPresents = new Set(reservation.messages.map((m) => m.type));

    for (const regle of REGLES_MESSAGES) {
      if (!typesVoulus.has(regle.type)) continue;
      if (dejaPresents.has(regle.type)) continue;

      if (
        regle.ancre === 'MILIEU_SEJOUR' &&
        sejourTropCourtPourMilieu(reservation.dateDebut, reservation.dateFin)
      ) {
        continue;
      }

      const planifieLe = calculerDateEnvoi(regle, reservation);

      // Une date déjà largement passée ne sert plus : créer un message pour
      // l'annuler aussitôt ne ferait qu'encombrer le backoffice.
      if (planifieLe.getTime() < Date.now() - 2 * 86400000) continue;

      if (!simulation) {
        // createMany + skipDuplicates plutôt que create : deux exécutions
        // simultanées ne doivent pas se heurter sur la contrainte unique.
        await prisma.messageSejour.createMany({
          data: [{ reservationId: reservation.id, type: regle.type, planifieLe }],
          skipDuplicates: true,
        });
      }
      resultat.crees++;
    }
  }
}

/** Phase 2 — annuler ce qui n'a plus d'objet. */
async function annulerMessagesSansObjet(resultat: ResultatPassage, simulation: boolean) {
  const candidats = await prisma.messageSejour.findMany({
    where: { statut: 'PLANIFIE' },
    include: { reservation: true },
  });

  for (const message of candidats) {
    const reservationAnnulee = message.reservation.statut === 'CANCELLED';
    // Passé de plus de deux jours : envoyer « êtes-vous bien arrivé » trois
    // jours après l'arrivée serait pire que de ne rien envoyer.
    const tropTard = message.planifieLe.getTime() < Date.now() - 2 * 86400000;

    if (!reservationAnnulee && !tropTard) continue;

    if (!simulation) {
      await prisma.messageSejour.update({
        where: { id: message.id },
        data: {
          statut: 'ANNULE',
          erreur: reservationAnnulee ? 'Réservation annulée' : 'Date dépassée',
        },
      });
    }
    resultat.annules++;
  }
}

/** Phase 3 — envoyer ce qui est dû. */
async function envoyerMessagesDus(resultat: ResultatPassage, expediteur: Expediteur) {
  const dus = await prisma.messageSejour.findMany({
    where: { statut: 'PLANIFIE', planifieLe: { lte: new Date() } },
    include: { reservation: { include: { gite: true } } },
  });

  for (const message of dus) {
    await envoyerUnMessage(message.id, expediteur, resultat);
  }
}

/**
 * Envoi unitaire, partagé par le passage automatique et le bouton du
 * backoffice — une seule implémentation, donc un seul comportement.
 */
export async function envoyerUnMessage(
  messageId: string,
  expediteur: Expediteur = expediteurParDefaut,
  resultat?: ResultatPassage
): Promise<{ ok: boolean; motif?: string }> {
  const message = await prisma.messageSejour.findUnique({
    where: { id: messageId },
    include: { reservation: { include: { gite: true } } },
  });

  if (!message) return { ok: false, motif: 'Message introuvable' };

  if (message.statut === 'ENVOYE') {
    return { ok: false, motif: 'Déjà envoyé' };
  }

  if (message.reservation.statut === 'CANCELLED') {
    await prisma.messageSejour.update({
      where: { id: message.id },
      data: { statut: 'ANNULE', erreur: 'Réservation annulée' },
    });
    return { ok: false, motif: 'Réservation annulée' };
  }

  // Pas d'adresse : état distinct d'un échec. Le backoffice peut alors
  // proposer de saisir l'adresse plutôt que de réessayer en vain.
  if (!message.reservation.clientEmail) {
    await prisma.messageSejour.update({
      where: { id: message.id },
      data: { statut: 'IMPOSSIBLE', erreur: "Pas d'adresse e-mail pour ce client" },
    });
    if (resultat) resultat.impossibles++;
    return { ok: false, motif: "Pas d'adresse e-mail" };
  }

  const rendu = construireApercu(message);

  try {
    const envoye = await expediteur({
      to: message.reservation.clientEmail,
      subject: rendu.sujet,
      html: rendu.corps,
    });

    if (!envoye) throw new Error("L'expéditeur a refusé le message");

    await prisma.messageSejour.update({
      where: { id: message.id },
      data: {
        statut: 'ENVOYE',
        envoyeLe: new Date(),
        sujet: rendu.sujet,
        corps: rendu.corps,
        erreur: null,
      },
    });
    if (resultat) resultat.envoyes++;
    return { ok: true };
  } catch (erreur) {
    const motif = erreur instanceof Error ? erreur.message : String(erreur);
    // Le motif est conservé : c'est ce qui permet le réessai depuis
    // /admin/messages, et ce qui évite un échec silencieux.
    await prisma.messageSejour.update({
      where: { id: message.id },
      data: { statut: 'ECHEC', erreur: motif },
    });
    if (resultat) resultat.echecs++;
    return { ok: false, motif };
  }
}

/**
 * Types cochés à la saisie, relus depuis notesInternes.
 * En l'absence de ligne `messages:`, on retient les types cochés par défaut —
 * c'est le cas des réservations créées par le site public.
 */
export function typesActives(notesInternes: string | null): Set<string> {
  const ligne = notesInternes?.split('\n').find((l) => l.trim().startsWith('messages:'));
  if (!ligne) {
    return new Set(REGLES_MESSAGES.filter((r) => r.cochePardefaut).map((r) => r.type));
  }
  return new Set(
    ligne
      .slice(ligne.indexOf(':') + 1)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  );
}
