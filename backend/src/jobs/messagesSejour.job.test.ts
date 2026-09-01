import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Le service est simulé : ces tests portent sur la planification, pas sur la
// logique métier des messages, qui a ses propres tests.
const executerPassage = vi.hoisted(() => vi.fn());
vi.mock('../services/messagesSejour.js', () => ({ executerPassage }));

import {
  demarrerPlanificateurMessages,
  arreterPlanificateurMessages,
} from './messagesSejour.job.js';

const passageVide = { crees: 0, annules: 0, envoyes: 0, impossibles: 0, echecs: 0 };

describe('planificateur des messages de séjour', () => {
  beforeEach(() => {
    executerPassage.mockReset();
    executerPassage.mockResolvedValue(passageVide);
  });

  afterEach(() => {
    arreterPlanificateurMessages();
    vi.restoreAllMocks();
  });

  it('effectue un passage au démarrage', async () => {
    demarrerPlanificateurMessages();
    // Le passage initial est lancé sans await : on laisse la micro-tâche filer.
    await vi.waitFor(() => expect(executerPassage).toHaveBeenCalledTimes(1));
  });

  it('ne démarre pas deux fois si appelé en double', async () => {
    demarrerPlanificateurMessages();
    demarrerPlanificateurMessages();
    await vi.waitFor(() => expect(executerPassage).toHaveBeenCalledTimes(1));
  });

  it("survit à un passage en échec sans propager l'erreur", async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    executerPassage.mockRejectedValue(new Error('base injoignable'));

    expect(() => demarrerPlanificateurMessages()).not.toThrow();
    await vi.waitFor(() => expect(journal).toHaveBeenCalled());
    expect(journal.mock.calls[0][0]).toContain('base injoignable');
  });

  it('peut être redémarré après un arrêt', async () => {
    demarrerPlanificateurMessages();
    await vi.waitFor(() => expect(executerPassage).toHaveBeenCalledTimes(1));

    arreterPlanificateurMessages();
    demarrerPlanificateurMessages();
    await vi.waitFor(() => expect(executerPassage).toHaveBeenCalledTimes(2));
  });
});
