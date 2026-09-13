import cron, { type ScheduledTask } from 'node-cron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Régénère le widget météo marine (repo externe et indépendant `meteo-marine`,
 * jamais fusionné dans ce projet — voir décision du 2026-09-13) et le réinjecte
 * dans `public-site/index.html`, toutes les 2h.
 *
 * Couplage volontairement faible : ce job appelle `npm run publish` en
 * sous-processus, exactement comme un humain le ferait depuis un terminal —
 * aucun import de code TypeScript entre les deux repos. `publish.ts` (côté
 * meteo-marine) fait la réinjection lui-même, entre des marqueurs HTML dédiés
 * (`<!-- METEO-MARINE:HEAD/SECTION:START/END -->`) — plus robuste qu'un regex
 * sur la structure de la page, qui cassait si la section changeait de forme.
 *
 * Si `meteo-marine` n'est pas présent sur la machine (ex: un futur déploiement
 * Hetzner où ce second repo n'a pas été cloné), le job se contente de le
 * signaler une fois et ne fait rien, sans jamais faire échouer le démarrage
 * du serveur.
 */

const execFileAsync = promisify(execFile);
const PLANIFICATION = '0 */2 * * *'; // toutes les 2h pile

const dossierCourant = path.dirname(fileURLToPath(import.meta.url));
const METEO_MARINE_DIR = path.resolve(dossierCourant, '../../../../meteo-marine');
const PUBLIC_SITE_INDEX = path.resolve(dossierCourant, '../../../public-site/index.html');

let tache: ScheduledTask | null = null;
let avertissementAbsenceAffiche = false;

async function regenererMeteoMarine(): Promise<void> {
  if (!existsSync(METEO_MARINE_DIR)) {
    if (!avertissementAbsenceAffiche) {
      console.warn(
        `⚠️  Widget météo marine — repo introuvable (${METEO_MARINE_DIR}), job ignoré`
      );
      avertissementAbsenceAffiche = true;
    }
    return;
  }

  try {
    await execFileAsync('npm', ['run', 'publish'], {
      cwd: METEO_MARINE_DIR,
      env: { ...process.env, PUBLISH_TARGET: PUBLIC_SITE_INDEX },
    });
    console.log('⛵ Widget météo marine régénéré et réinjecté');
  } catch (erreur) {
    // Une erreur ne doit jamais arrêter la planification : le passage suivant
    // reprendra le travail là où celui-ci a échoué.
    const motif = erreur instanceof Error ? erreur.message : String(erreur);
    console.error(`💥 Widget météo marine — régénération en échec : ${motif}`);
  }
}

export function demarrerPlanificateurMeteoMarine(): void {
  if (tache) return;

  tache = cron.schedule(PLANIFICATION, () => void regenererMeteoMarine());
  console.log(`⏰ Planificateur météo marine actif (${PLANIFICATION})`);

  // Un passage au démarrage rattrape ce qui était dû pendant que le service
  // était arrêté, sans attendre le prochain créneau de 2h.
  void regenererMeteoMarine();
}

export function arreterPlanificateurMeteoMarine(): void {
  tache?.stop();
  tache = null;
}
