-- A tenge price is worth nothing to the site without a rate to read it by: no
-- rate on file means no USD value, which means the option sits out the
-- comparison that picks an item's cheapest way to buy. The rate is data rather
-- than schema, but the tenge code ships useless without it, so it travels the
-- same way the schema does — see CLAUDE.md on why nothing here is applied by
-- hand.
--
-- Roughly 540 KZT to the dollar against the 82 RUB the dollar costs here.
-- Guarded so a rate the owner has since corrected is left alone, and so
-- re-running against a database that already has the row is a no-op.
INSERT INTO `ExchangeRate` (`id`, `fromCurrency`, `toCurrency`, `rate`, `updatedAt`)
SELECT
  COALESCE((SELECT MAX(`id`) FROM `ExchangeRate`), 0) + 1,
  'KZT',
  'RUB',
  0.15,
  '2026-08-07T00:00:00.000Z'
WHERE NOT EXISTS (
  SELECT 1 FROM `ExchangeRate`
  WHERE `fromCurrency` = 'KZT' AND `toCurrency` = 'RUB'
);
