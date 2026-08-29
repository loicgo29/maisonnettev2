/**
 * Backoffice — réservations et messages de séjour.
 *
 * TOUTES les routes de ce fichier sont protégées par `verifyOIDCToken` puis
 * `requireRole('admin')`, appliqués au niveau du routeur : une route ajoutée
 * plus tard hérite de la protection sans qu'on ait à y penser. Les oublis se
 * produisent quand la protection est répétée route par route.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyOIDCToken, AuthRequest } from '../middleware/oidc.js';
import { requireRole } from '../middleware/requireRole.js';
import { REGLES_MESSAGES } from '../config/messages.js';
import { envoyerUnMessage, executerPassage } from '../services/messagesSejour.js';

const router = Router();

router.use(verifyOIDCToken);
router.use(requireRole('admin'));

// --- Tableau de bord -------------------------------------------------------
router.get('/dashboard', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const maintenant = new Date();
    const dansTrenteJours = new Date(maintenant.getTime() + 30 * 86400000);

    const [arrivees, messagesEnAttente, reservationsActives] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          statut: { not: 'CANCELLED' },
          dateDebut: { gte: maintenant, lte: dansTrenteJours },
        },
        orderBy: { dateDebut: 'asc' },
        take: 20,
      }),
      prisma.messageSejour.count({ where: { statut: 'PLANIFIE', planifieLe: { lte: maintenant } } }),
      prisma.reservation.count({ where: { statut: { not: 'CANCELLED' } } }),
    ]);

    res.json({
      arrivees,
      messagesEnAttente,
      reservationsActives,
      // Rappelé au frontend pour qu'il puisse afficher un bandeau : sans lui,
      // on croirait les messages partis alors qu'ils attendent un clic.
      envoiAutomatique: process.env.MESSAGES_AUTO === 'true',
    });
  } catch (erreur) {
    res.status(500).json({ error: 'Impossible de charger le tableau de bord' });
  }
});

// --- Réservations ----------------------------------------------------------
router.get('/reservations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { statut, plateforme } = req.query;
    const reservations = await prisma.reservation.findMany({
      where: {
        ...(statut ? { statut: String(statut) } : {}),
        ...(plateforme ? { plateforme: String(plateforme) } : {}),
      },
      include: { messages: { orderBy: { planifieLe: 'asc' } }, gite: { select: { nom: true } } },
      orderBy: { dateDebut: 'desc' },
    });
    res.json(reservations);
  } catch {
    res.status(500).json({ error: 'Impossible de charger les réservations' });
  }
});

/** Saisie manuelle : les réservations viennent d'Airbnb, Booking ou Leboncoin. */
router.post('/reservations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      giteId, clientNom, clientPrenom, clientEmail, clientTelephone,
      plateforme, dateDebut, dateFin, montantTotal, notesInternes,
      messages,
    } = req.body;

    if (!giteId || !clientNom || !dateDebut || !dateFin) {
      res.status(400).json({ error: 'giteId, clientNom, dateDebut et dateFin sont obligatoires' });
      return;
    }

    // Les types de messages cochés sont mémorisés dans les notes internes,
    // relus ensuite par le planificateur.
    const typesCoches: string[] = Array.isArray(messages)
      ? messages
      : REGLES_MESSAGES.filter((r) => r.cochePardefaut).map((r) => r.type);
    const notes = [notesInternes?.trim(), `messages: ${typesCoches.join(',')}`]
      .filter(Boolean)
      .join('\n');

    const reservation = await prisma.reservation.create({
      data: {
        giteId,
        clientNom,
        clientPrenom: clientPrenom ?? '',
        // Facultatif : Airbnb et Leboncoin masquent souvent l'adresse.
        clientEmail: clientEmail || null,
        clientTelephone: clientTelephone ?? '',
        plateforme: plateforme ?? 'DIRECT',
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        montantTotal: Number(montantTotal ?? 0),
        statut: 'CONFIRMED',
        notesInternes: notes,
      },
    });

    // Planification immédiate : sans cela les messages n'apparaîtraient qu'à
    // la prochaine exécution horaire, et la saisie semblerait sans effet.
    await executerPassage();

    const complete = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: { messages: { orderBy: { planifieLe: 'asc' } } },
    });
    res.status(201).json(complete);
  } catch (erreur) {
    res.status(500).json({
      error: 'Création impossible',
      details: erreur instanceof Error ? erreur.message : String(erreur),
    });
  }
});

router.patch('/reservations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { statut, acompteVerse, soldeVerse, notesInternes, clientEmail } = req.body;
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: {
        ...(statut !== undefined && { statut }),
        ...(acompteVerse !== undefined && { acompteVerse }),
        ...(soldeVerse !== undefined && { soldeVerse }),
        ...(notesInternes !== undefined && { notesInternes }),
        ...(clientEmail !== undefined && { clientEmail: clientEmail || null }),
      },
    });
    res.json(reservation);
  } catch {
    res.status(404).json({ error: 'Réservation introuvable' });
  }
});

// --- Messages --------------------------------------------------------------
router.get('/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { statut } = req.query;
    const messages = await prisma.messageSejour.findMany({
      where: statut ? { statut: String(statut) } : {},
      include: {
        reservation: {
          select: { clientNom: true, clientPrenom: true, clientEmail: true, dateDebut: true },
        },
      },
      orderBy: { planifieLe: 'asc' },
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Impossible de charger les messages' });
  }
});

router.post('/messages/:id/envoyer', async (req: AuthRequest, res: Response): Promise<void> => {
  const resultat = await envoyerUnMessage(req.params.id);
  if (resultat.ok) {
    res.json({ envoye: true });
    return;
  }
  // 409 et non 500 : ce n'est pas une panne mais un refus motivé — déjà
  // envoyé, réservation annulée, pas d'adresse. Le frontend doit l'afficher
  // tel quel plutôt que comme une erreur technique.
  res.status(409).json({ envoye: false, motif: resultat.motif });
});

router.patch('/messages/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planifieLe, sujet, corps } = req.body;
    const message = await prisma.messageSejour.update({
      where: { id: req.params.id },
      data: {
        ...(planifieLe && { planifieLe: new Date(planifieLe) }),
        ...(sujet !== undefined && { sujet }),
        ...(corps !== undefined && { corps }),
      },
    });
    res.json(message);
  } catch {
    res.status(404).json({ error: 'Message introuvable' });
  }
});

router.delete('/messages/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await prisma.messageSejour.update({
      where: { id: req.params.id },
      data: { statut: 'ANNULE', erreur: 'Annulé manuellement' },
    });
    res.json(message);
  } catch {
    res.status(404).json({ error: 'Message introuvable' });
  }
});

// --- Règles, pour que le formulaire affiche les cases à cocher --------------
router.get('/regles-messages', (_req: AuthRequest, res: Response): void => {
  res.json(
    REGLES_MESSAGES.map((r) => ({
      type: r.type,
      libelle: r.libelle,
      cochePardefaut: r.cochePardefaut,
    }))
  );
});

export default router;
