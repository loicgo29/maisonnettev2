/**
 * Configuration du service, validée au démarrage.
 *
 * Pourquoi ce fichier existe : une variable absente ou mal formée ne se
 * manifestait jusqu'ici qu'à l'exécution, souvent en silence. Le cas d'école est
 * documenté dans middleware/oidc.ts — une URL de realm erronée n'empêche pas le
 * démarrage, mais fait rejeter *tous* les jetons, sans qu'un valide se
 * distingue d'un invalide. On a mis des heures à le voir.
 *
 * Le service refuse désormais de démarrer sur une configuration invalide, avec
 * le nom de la variable fautive et ce qui était attendu.
 *
 * Répartition, à respecter en ajoutant une variable :
 *
 *   Secret      → jamais de valeur par défaut, jamais dans le dépôt. Le compose
 *                 l'exige par `${VAR:?message}` et échoue si elle manque.
 *   Configuration → écrite en clair dans le compose, versionnée, relue en revue.
 *                 Une valeur par défaut ici n'est acceptable que si elle vaut
 *                 pour tous les environnements.
 *
 * La règle tient en une phrase : une variable a une seule source. Deux endroits
 * qui définissent la même valeur, c'est l'un des deux qui gagne en silence.
 */
import { z } from 'zod';

const Booleen = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .or(z.boolean());

const Schema = z.object({
  // ---- Exécution -------------------------------------------------------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default('info'),

  // ---- Base de données -------------------------------------------------
  // Le mot de passe est porté par l'URL : la valider, c'est valider les deux.
  DATABASE_URL: z
    .string()
    .min(1, 'requise')
    .refine((v) => v.startsWith('postgres'), 'doit être une URL PostgreSQL'),

  // ---- Authentification ------------------------------------------------
  // 32 octets au moins : un secret court se force. Le service a déjà tourné en
  // production sans JWT_SECRET, ce qui l'empêchait purement de démarrer.
  JWT_SECRET: z
    .string()
    .min(32, 'au moins 32 caractères — un secret court se force')
    .optional(),

  // Une URL de realm complète, jamais `master` : ce realm est celui de
  // l'administration de Keycloak, ses jetons ne concernent pas l'application.
  KEYCLOAK_REALM_URL: z
    .string()
    .url('doit être une URL complète')
    .refine((v) => !/\/realms\/master\/?$/.test(v), 'le realm `master` ne convient pas')
    .refine(
      (v) => !v.includes('/application/o/'),
      'chemin Authentik détecté — Keycloak attend /realms/<nom>'
    )
    .optional(),

  // ---- Contacts du gîte (configuration, pas des secrets) ---------------
  OWNER_EMAIL: z.string().email().optional(),
  OWNER_PHONE: z.string().optional(),
  MAIL_FROM: z.string().optional(),

  // ---- Intégrations ----------------------------------------------------
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  PRIVATE_GOOGLE_CLIENT_ID: z.string().optional(),
  PRIVATE_GOOGLE_CLIENT_SECRET: z.string().optional(),
  PRIVATE_GOOGLE_REDIRECT_URI: z.string().url().optional(),
  PRIVATE_GITE_CALENDAR_ID: z.string().optional(),
  PUBLIC_CALENDAR_ID: z.string().optional(),

  // ---- Divers ----------------------------------------------------------
  MESSAGES_AUTO: Booleen.default(false),
  MEALS_DATA_DIR: z.string().default('/data/backoffice'),
  ALO_ENABLED: Booleen.default(false),
});

export type Configuration = z.infer<typeof Schema>;

function valider(source: NodeJS.ProcessEnv): Configuration {
  const resultat = Schema.safeParse(source);

  if (!resultat.success) {
    const details = resultat.error.issues
      .map((i) => `  ${i.path.join('.')} : ${i.message}`)
      .join('\n');
    // Échouer ici, bruyamment, plutôt que de servir une application dont on
    // découvrira le défaut de configuration bien plus tard, sur un symptôme
    // sans rapport apparent.
    throw new Error(`Configuration invalide :\n${details}`);
  }

  const config = resultat.data;

  // Exigences propres à la production, où aucune valeur de repli n'est tolérable.
  if (config.NODE_ENV === 'production') {
    const manquantes = (['JWT_SECRET', 'KEYCLOAK_REALM_URL'] as const).filter(
      (cle) => !config[cle]
    );
    if (manquantes.length > 0) {
      throw new Error(
        `Configuration invalide en production : ${manquantes.join(', ')} — ` +
          'requises hors développement.'
      );
    }
  }

  return config;
}

export const config = valider(process.env);
