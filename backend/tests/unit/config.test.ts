import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ces tests gardent la répartition entre configuration et secrets.
 *
 * Chacun correspond à une panne réellement vécue : sans eux, rien n'empêche la
 * dérive de revenir, et ces défauts-là ne se voient pas — ils se manifestent
 * plus tard, sur un symptôme sans rapport apparent.
 */

// tests/unit/ -> backend/ -> racine du projet
const racine = join(import.meta.dirname, '..', '..', '..');
const compose = readFileSync(join(racine, 'docker-compose.yml'), 'utf-8');
const exemple = readFileSync(join(racine, '.env.example'), 'utf-8');

function variablesAttendues(texte: string): string[] {
  return [...new Set([...texte.matchAll(/\$\{([A-Z_]+)/g)].map((m) => m[1]))];
}

function variablesDeclarees(texte: string): string[] {
  return [...new Set([...texte.matchAll(/^#?\s*([A-Z_]+)=/gm)].map((m) => m[1]))];
}

describe('Répartition configuration / secrets', () => {
  it('toute variable exigée par le compose figure dans .env.example', () => {
    const declarees = variablesDeclarees(exemple);
    const manquantes = variablesAttendues(compose).filter((v) => !declarees.includes(v));

    // Sans ce contrôle, on découvre une variable manquante au démarrage d'un
    // environnement neuf — ou pire, en production, comme JWT_SECRET le 6/09.
    expect(manquantes, `absentes de .env.example : ${manquantes.join(', ')}`).toEqual([]);
  });

  it('les secrets obligatoires font échouer le démarrage plutôt que de valoir vide', () => {
    for (const secret of ['DB_PASSWORD', 'JWT_SECRET']) {
      const motif = new RegExp(`\\$\\{${secret}:\\?`);
      expect(
        compose,
        `${secret} doit utiliser \${${secret}:?…} pour échouer explicitement`
      ).toMatch(motif);
    }
  });

  it('aucun secret ne traîne en clair dans le compose', () => {
    // Les identifiants publics (client_id OAuth) sont admis : ils circulent
    // déjà dans les URL d'autorisation.
    const suspects = [/JWT_SECRET:\s*['"]?[A-Za-z0-9+/]{16,}/, /PASSWORD:\s*['"]?[A-Za-z0-9+/]{12,}/];
    for (const motif of suspects) {
      expect(compose, `valeur sensible en clair : ${motif}`).not.toMatch(motif);
    }
  });

  it('le realm master et les chemins Authentik sont bannis du compose', () => {
    // Deux erreurs commises le 7/09 : `master` est le realm d'administration de
    // Keycloak, et /application/o/ est un chemin Authentik — produit que le
    // projet n'utilise pas.
    expect(compose).not.toMatch(/realms\/master/);
    expect(compose).not.toMatch(/\/application\/o\//);
  });

  it('.env.example ne contient aucune valeur renseignée', () => {
    const renseignees = exemple
      .split('\n')
      .filter((l) => /^[A-Z_]+=.+/.test(l))
      .map((l) => l.split('=')[0]);

    expect(
      renseignees,
      `valeurs présentes dans le modèle : ${renseignees.join(', ')}`
    ).toEqual([]);
  });
});
