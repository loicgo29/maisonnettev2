/**
 * Gabarits des sept messages du séjour.
 *
 * Ton volontairement sobre et tutoiement écarté : ce sont des clients, pas des
 * proches. Ces textes sont une proposition, destinée à être relue et ajustée —
 * c'est la voix de Loïc qui doit s'y entendre, pas la mienne.
 */

import type { TypeMessage } from '../../config/messages.js';

export interface Variables {
  clientPrenom: string;
  clientNom: string;
  giteNom: string;
  adresse: string;
  dateDebut: Date;
  dateFin: Date;
  telephone: string;
}

export interface MessageRendu {
  sujet: string;
  corps: string;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });

/** Le prénom peut manquer sur une réservation importée : on reste poli sans lui. */
const salutation = (v: Variables) => (v.clientPrenom ? `Bonjour ${v.clientPrenom},` : 'Bonjour,');

const enveloppe = (contenu: string, v: Variables) => `
<div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #2b2b2b; max-width: 560px;">
${contenu}
<p style="margin-top: 2em; color: #6b6b6b; font-size: 14px;">
Loïc — ${v.giteNom}<br>
${v.telephone}
</p>
</div>`.trim();

type Gabarit = (v: Variables) => MessageRendu;

const GABARITS: Record<TypeMessage, Gabarit> = {
  CANAL: (v) => ({
    sujet: `Votre séjour à ${v.giteNom} — comment souhaitez-vous qu'on échange ?`,
    corps: enveloppe(
      `<p>${salutation(v)}</p>
<p>Merci pour votre réservation du ${formatDate(v.dateDebut)} au ${formatDate(v.dateFin)}. Je suis ravi de vous accueillir.</p>
<p>Pour préparer votre arrivée, je vous enverrai quelques informations pratiques. Préférez-vous que nous échangions par e-mail, par SMS ou par WhatsApp ? Répondez-moi simplement, j'utiliserai le canal qui vous arrange.</p>
<p>À très bientôt.</p>`,
      v
    ),
  }),

  GUIDE: (v) => ({
    sujet: `${v.giteNom} — le guide de la maison`,
    corps: enveloppe(
      `<p>${salutation(v)}</p>
<p>Votre séjour approche : vous arrivez le ${formatDate(v.dateDebut)}.</p>
<p>Vous trouverez ci-joint le guide de la maison — les équipements, le fonctionnement du chauffage, le tri, et quelques adresses que nous aimons dans les environs.</p>
<p>N'hésitez pas si une question vous vient d'ici là.</p>`,
      v
    ),
  }),

  RAPPEL_ARRIVEE: (v) => ({
    sujet: `Votre arrivée à ${v.giteNom} — adresse et contact`,
    corps: enveloppe(
      `<p>${salutation(v)}</p>
<p>Vous arrivez après-demain, le ${formatDate(v.dateDebut)}. Voici les informations utiles :</p>
<p style="background:#f4f4f2; padding: 1em; border-radius: 6px;">
<strong>Adresse</strong><br>${v.adresse}<br><br>
<strong>Mon téléphone</strong><br>${v.telephone}
</p>
<p>Prévenez-moi de votre heure d'arrivée approximative, je m'organiserai pour vous accueillir.</p>
<p>Bonne route.</p>`,
      v
    ),
  }),

  ARRIVEE_OK: (v) => ({
    sujet: `Bien arrivés à ${v.giteNom} ?`,
    corps: enveloppe(
      `<p>${salutation(v)}</p>
<p>J'espère que votre voyage s'est bien passé et que vous avez trouvé la maison sans difficulté.</p>
<p>Tout est-il en ordre ? Si quelque chose manque ou ne fonctionne pas comme prévu, dites-le moi : je préfère le savoir tout de suite.</p>
<p>Bon séjour.</p>`,
      v
    ),
  }),

  PLANTES: (v) => ({
    sujet: `${v.giteNom} — un petit service`,
    corps: enveloppe(
      `<p>${salutation(v)}</p>
<p>J'espère que votre séjour se passe bien.</p>
<p>Auriez-vous la gentillesse d'arroser les plantes ? Un passage tous les deux jours suffit largement. L'arrosoir est près de la porte.</p>
<p>Merci beaucoup.</p>`,
      v
    ),
  }),

  CHECKOUT: (v) => ({
    sujet: `${v.giteNom} — votre départ demain`,
    corps: enveloppe(
      `<p>${salutation(v)}</p>
<p>Votre séjour se termine demain, le ${formatDate(v.dateFin)}. Je vous rappelle que le départ se fait <strong>avant 12 h</strong>.</p>
<p>Rien de particulier à prévoir : laissez simplement les clés sur la table et refermez la porte derrière vous.</p>
<p>Si vous avez besoin d'un peu plus de temps, écrivez-moi, nous verrons ce qui est possible.</p>`,
      v
    ),
  }),

  RETOUR: (v) => ({
    sujet: `Votre séjour à ${v.giteNom}`,
    corps: enveloppe(
      `<p>${salutation(v)}</p>
<p>J'espère que vous êtes bien rentrés et que votre séjour vous a plu.</p>
<p>Si vous avez un moment, votre avis m'aiderait beaucoup — sur ce qui vous a plu comme sur ce qui pourrait être amélioré. Je lis tout, et j'en tiens compte.</p>
<p>Merci d'avoir choisi la maison, et au plaisir de vous y revoir.</p>`,
      v
    ),
  }),
};

export function rendreMessage(type: string, variables: Variables): MessageRendu {
  const gabarit = GABARITS[type as TypeMessage];
  if (!gabarit) {
    // Échouer bruyamment : un message sans gabarit ne doit jamais partir avec
    // un corps vide, le client recevrait un e-mail incompréhensible.
    throw new Error(`Aucun gabarit pour le type de message « ${type} »`);
  }
  return gabarit(variables);
}
