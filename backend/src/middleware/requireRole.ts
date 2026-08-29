/**
 * Contrôle de rôle, à placer APRÈS `verifyOIDCToken`.
 *
 * Le middleware OIDC existant vérifie seulement que le jeton est authentique :
 * n'importe quel compte du royaume passait donc les routes protégées. Pour un
 * backoffice, l'authenticité ne suffit pas — il faut l'autorisation.
 */

import { Response, NextFunction } from 'express';
import type { AuthRequest } from './oidc.js';

/**
 * Keycloak place les rôles du royaume dans `realm_access.roles`, et ceux
 * propres à un client dans `resource_access.<client>.roles`. On regarde les
 * deux : le royaume est configuré avec un rôle `admin` global, mais un projet
 * pourrait le porter au niveau du client.
 */
function rolesDuJeton(user: Record<string, any> | undefined): string[] {
  if (!user) return [];
  const duRoyaume: string[] = user.realm_access?.roles ?? [];
  const desClients: string[] = Object.values(user.resource_access ?? {}).flatMap(
    (acces: any) => acces?.roles ?? []
  );
  return [...duRoyaume, ...desClients];
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Sans utilisateur, c'est que verifyOIDCToken n'a pas été monté avant :
    // échouer bruyamment plutôt que de laisser passer.
    if (!req.user) {
      res.status(401).json({ error: 'Authentification requise' });
      return;
    }

    if (!rolesDuJeton(req.user).includes(role)) {
      // 403 et non 401 : le jeton est valide, c'est l'autorisation qui manque.
      // La distinction compte pour le frontend, qui ne doit pas relancer une
      // authentification qui vient de réussir.
      res.status(403).json({ error: `Rôle « ${role} » requis` });
      return;
    }

    next();
  };
}
