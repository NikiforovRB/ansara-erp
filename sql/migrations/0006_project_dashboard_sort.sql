ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "dashboard_sort_order" integer DEFAULT 0 NOT NULL;

UPDATE "projects" p
SET "dashboard_sort_order" = s.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY "updated_at" DESC) - 1 AS rn
  FROM "projects"
) AS s
WHERE p.id = s.id;
