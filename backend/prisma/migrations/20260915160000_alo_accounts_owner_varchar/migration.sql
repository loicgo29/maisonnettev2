-- alo.accounts.owner : enum account_owner -> varchar
--
-- En production cette colonne est DÉJÀ un character varying (créée par
-- SQLAlchemy/Alembic, qui est propriétaire du schéma `alo`) et contient de
-- vrais prénoms : 'loic', 'alice'. Seul l'environnement local l'avait en
-- enum, parce que le schéma y avait été créé par Prisma à partir d'une
-- déclaration erronée.
--
-- Écrit à la main plutôt que généré : la génération y ajoutait un
-- DROP TYPE alo.account_owner, qui se serait exécuté en production sur un
-- type appartenant à SQLAlchemy. Le type est conservé tel quel des deux
-- côtés (il n'est plus référencé par aucune colonne).
--
-- Idempotent en production : re-typer un varchar en varchar est accepté par
-- PostgreSQL et ne touche pas aux données.
--
-- Gardé conditionnel : en CI, la base de test est vierge et n'a jamais le
-- schéma/la table `alo.accounts`, car celle-ci est créée par SQLAlchemy
-- (backend Python alo), jamais par une migration Prisma. Sans cette garde,
-- l'ALTER TABLE échoue avec "relation alo.accounts does not exist" dès
-- qu'on exécute `prisma migrate deploy` sur une base fraîche.
DO $$
BEGIN
  IF to_regclass('alo.accounts') IS NOT NULL THEN
    ALTER TABLE "alo"."accounts"
      ALTER COLUMN "owner" TYPE character varying USING "owner"::text;
  END IF;
END
$$;
