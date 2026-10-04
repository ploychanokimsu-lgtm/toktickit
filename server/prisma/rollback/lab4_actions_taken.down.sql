-- Rollback for 20261004093253_lab4_actions_taken.
-- Run ONLY on a disposable or restored database, then delete the matching
-- row from "_prisma_migrations". Lab 1-3 tables are not affected.
DROP TABLE IF EXISTS "ActionTaken";
DROP TYPE IF EXISTS "ActionTakenStatus";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261004093253_lab4_actions_taken';
