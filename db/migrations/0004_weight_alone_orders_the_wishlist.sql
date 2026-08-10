-- The wishlist used to rank by priority first and weight second, which left two
-- mechanisms fighting over one order: dragging the admin list writes weights
-- only, so a drag across a priority boundary saved without complaint and then
-- sprang back on the next load. Weight alone decides the order now.
--
-- Left alone, that would reshuffle the live wishlist on deploy: priority is set
-- on every item, weight on barely a dozen, so fifty items sharing a weight of 0
-- would collapse into date order and the owner's arrangement would be gone. So
-- the old order is written into the weights here, once, before the code that
-- reads them ships — the list looks exactly as it did, and dragging edits it
-- from there.
--
-- Highest weight sorts first, hence `total - position + 1`: the same numbering
-- the admin panel's reorder produces, so a first drag after this changes only
-- what the owner actually moved. Received items keep whatever weight they have
-- — they sort to the end regardless.
WITH `ranked` AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE `priority`
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          WHEN 'low' THEN 2
          ELSE 3
        END ASC,
        `weight` DESC,
        `createdAt` DESC
    ) AS `position`,
    (SELECT COUNT(*) FROM `WishlistItem` WHERE `received` = 0) AS `total`
  FROM `WishlistItem`
  WHERE `received` = 0
)
UPDATE `WishlistItem`
SET `weight` = (
  SELECT `total` - `position` + 1 FROM `ranked` WHERE `ranked`.`id` = `WishlistItem`.`id`
)
WHERE `received` = 0;
