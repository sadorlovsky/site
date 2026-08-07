-- Left behind by @astrojs/db, which recorded the schema it had pushed here so
-- the next `astro db push` could diff against it. That command no longer exists
-- (removed with the package in Astro 7) and nothing reads this table now;
-- drizzle-kit keeps its own history in db/migrations/meta.
--
-- IF EXISTS because a database built from these migrations never had it — only
-- production, which predates them, does.
DROP TABLE IF EXISTS `_astro_db_snapshot`;
