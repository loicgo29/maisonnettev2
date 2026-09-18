/**
 * Import des réservations depuis Google Calendar.
 *
 * Le calendrier (Airbnb/Booking/Leboncoin y synchronisent déjà leurs
 * réservations via flux iCal côté Google) est la vraie source des séjours à
 * venir — la table `Reservation` ne se remplit, elle, que par saisie
 * manuelle. Sans import, toute réservation vue uniquement sur le calendrier
 * public reste invisible du backoffice (relances de paiement incluses).
 *
 * Réutilise la même voie que `GET /api/calendar/public` (clé API, lecture
 * seule) plutôt que le service account OAuth de `googleCalendar.ts`, qui
 * n'est configuré nulle part dans ce projet (GOOGLE_SERVICE_ACCOUNT_KEY_PATH
 * absent de tous les .env).
 */

import { prisma } from '../lib/prisma.js';

interface EvenementGoogle {
  id: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: Array<{ email?: string }>;
}

export interface ResultatImportCalendrier {
  importees: number;
  ignorees: number;
  total: number;
}

/** Heuristique sur le titre : les flux iCal des plateformes gardent leur nom dedans. */
function devinerPlateforme(summary: string): string {
  const s = summary.toLowerCase();
  if (s.includes('airbnb')) return 'AIRBNB';
  if (s.includes('booking')) return 'BOOKING';
  if (s.includes('leboncoin')) return 'LEBONCOIN';
  return 'AUTRE';
}

export async function importerReservationsDepuisCalendrier(): Promise<ResultatImportCalendrier> {
  const calendarId = process.env.PUBLIC_CALENDAR_ID || 'lgbertheaume@gmail.com';
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY manquant');
  }

  // Un seul gîte dans ce projet : inutile de faire correspondre un calendarId
  // par gîte comme le fait googleCalendar.ts pour le sens réservation→calendrier.
  const gite = await prisma.gite.findFirst();
  if (!gite) {
    throw new Error('Aucun gîte en base');
  }

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 90);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 365);

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    `key=${apiKey}&timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}&` +
    `maxResults=250&singleEvents=true&orderBy=startTime`;

  const reponse = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!reponse.ok) {
    const erreur = (await reponse.json()) as { error?: { message?: string } };
    throw new Error(erreur.error?.message || 'Échec de lecture du calendrier');
  }

  const donnees = (await reponse.json()) as { items?: EvenementGoogle[] };
  const evenements = donnees.items ?? [];

  let importees = 0;
  let ignorees = 0;

  for (const evenement of evenements) {
    const debut = evenement.start?.dateTime ?? evenement.start?.date;
    const fin = evenement.end?.dateTime ?? evenement.end?.date;
    if (!debut || !fin) {
      ignorees++;
      continue;
    }

    const dejaImportee = await prisma.reservation.findFirst({
      where: { googleCalendarEventId: evenement.id },
    });
    if (dejaImportee) {
      ignorees++;
      continue;
    }

    const summary = evenement.summary?.trim() || 'Réservation importée';

    await prisma.reservation.create({
      data: {
        giteId: gite.id,
        clientNom: summary,
        clientEmail: evenement.attendees?.[0]?.email ?? null,
        clientTelephone: '',
        dateDebut: new Date(debut),
        dateFin: new Date(fin),
        // Le calendrier ne porte ni montant ni acompte : à compléter à la main
        // depuis la fiche réservation, comme une saisie manuelle classique.
        montantTotal: 0,
        statut: 'CONFIRMED',
        plateforme: devinerPlateforme(summary),
        googleCalendarEventId: evenement.id,
        notesInternes: 'Importée automatiquement depuis le calendrier',
      },
    });
    importees++;
  }

  return { importees, ignorees, total: evenements.length };
}
