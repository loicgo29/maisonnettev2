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
ALTER TABLE "alo"."accounts"
  ALTER COLUMN "owner" TYPE character varying USING "owner"::text;
