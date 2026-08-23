import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { prisma } from '../lib/prisma';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

class GoogleCalendarService {
  private auth: any;
  private calendar: any;

  async initialize() {
    try {
      const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
      if (!keyPath) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH not configured');
      }

      const keyFile = await fs.readFile(keyPath, 'utf-8');
      const keyData = JSON.parse(keyFile);

      this.auth = new google.auth.GoogleAuth({
        credentials: keyData,
        scopes: SCOPES,
      });

      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    } catch (error) {
      console.error('[GoogleCalendar] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get available slots for a gite within a date range
   */
  async getAvailableSlots(
    calendarId: string,
    dateStart: Date,
    dateEnd: Date
  ): Promise<{ available: boolean; busySlots: Array<{ start: Date; end: Date }> }> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: dateStart.toISOString(),
          timeMax: dateEnd.toISOString(),
          items: [{ id: calendarId }],
        },
      });

      const busySlots = response.data.calendars[calendarId]?.busy || [];
      const available = busySlots.length === 0;

      return {
        available,
        busySlots: busySlots.map((slot: any) => ({
          start: new Date(slot.start),
          end: new Date(slot.end),
        })),
      };
    } catch (error) {
      console.error('[GoogleCalendar] getAvailableSlots failed:', error);
      throw error;
    }
  }

  /**
   * Create calendar event for reservation
   */
  async createReservationEvent(
    calendarId: string,
    reservation: {
      id: string;
      clientNom: string;
      clientEmail: string;
      dateDebut: Date;
      dateFin: Date;
      giteName: string;
    }
  ): Promise<string> {
    try {
      const event = {
        summary: `Réservation: ${reservation.giteName} - ${reservation.clientNom}`,
        description: `Réservation ID: ${reservation.id}\nClient: ${reservation.clientNom}\nEmail: ${reservation.clientEmail}`,
        start: {
          dateTime: reservation.dateDebut.toISOString(),
          timeZone: 'Europe/Paris',
        },
        end: {
          dateTime: reservation.dateFin.toISOString(),
          timeZone: 'Europe/Paris',
        },
        attendees: [{ email: reservation.clientEmail }],
        transparency: 'opaque', // Block time as busy
      };

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      return response.data.id;
    } catch (error) {
      console.error('[GoogleCalendar] createReservationEvent failed:', error);
      throw error;
    }
  }

  /**
   * Update calendar event status
   */
  async updateReservationEvent(
    calendarId: string,
    eventId: string,
    status: 'CONFIRMED' | 'CANCELLED'
  ): Promise<void> {
    try {
      const event = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      event.data.status = status === 'CONFIRMED' ? 'confirmed' : 'cancelled';

      await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: event.data,
      });
    } catch (error) {
      console.error('[GoogleCalendar] updateReservationEvent failed:', error);
      throw error;
    }
  }

  /**
   * Delete calendar event (for cancelled reservations)
   */
  async deleteReservationEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      console.error('[GoogleCalendar] deleteReservationEvent failed:', error);
      throw error;
    }
  }

  /**
   * Sync Authentik events to calendar (periodic job)
   */
  async syncReservationsToCalendar(): Promise<{
    synced: number;
    failed: number;
  }> {
    let synced = 0;
    let failed = 0;

    try {
      // Find all gites with Google Calendar ID
      const gites = await prisma.gite.findMany({
        where: {
          googleCalendarId: { not: null },
        },
      });

      for (const gite of gites) {
        // Get confirmed reservations without calendar events
        const reservations = await prisma.reservation.findMany({
          where: {
            giteId: gite.id,
            statut: 'CONFIRMED',
            googleCalendarEventId: null,
          },
        });

        for (const reservation of reservations) {
          try {
            const eventId = await this.createReservationEvent(gite.googleCalendarId!, {
              id: reservation.id,
              clientNom: reservation.clientNom,
              clientEmail: reservation.clientEmail,
              dateDebut: reservation.dateDebut,
              dateFin: reservation.dateFin,
              giteName: gite.nom,
            });

            // Save event ID
            await prisma.reservation.update({
              where: { id: reservation.id },
              data: { googleCalendarEventId: eventId },
            });

            synced++;
          } catch (error) {
            console.error(
              `[GoogleCalendar] Failed to sync reservation ${reservation.id}:`,
              error
            );
            failed++;
          }
        }
      }
    } catch (error) {
      console.error('[GoogleCalendar] syncReservationsToCalendar failed:', error);
    }

    return { synced, failed };
  }
}

// Singleton instance
let googleCalendarService: GoogleCalendarService | null = null;

export async function getGoogleCalendarService(): Promise<GoogleCalendarService> {
  if (!googleCalendarService) {
    googleCalendarService = new GoogleCalendarService();
    await googleCalendarService.initialize();
  }
  return googleCalendarService;
}
