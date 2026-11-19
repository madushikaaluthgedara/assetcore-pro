-- ============================================================
--  AssetCore Pro — FACTORY (Manufacturing) Upgrade
--  Run this ONCE in MySQL Workbench on your existing asset_db.
--  (Open this file in Workbench, then press the lightning /
--   "Execute All" button.)
--
--  What it adds:
--   devices (machines): machine code, department, location,
--                       install date, live status
--   assets (work orders): maintenance type, breakdown
--                       downtime start/end, spare parts used
-- ============================================================

USE asset_db;

ALTER TABLE devices
  ADD COLUMN machineCode VARCHAR(50)  NOT NULL DEFAULT '',
  ADD COLUMN department  VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN location    VARCHAR(150) NOT NULL DEFAULT '',
  ADD COLUMN installDate DATE NULL,
  ADD COLUMN status      VARCHAR(30)  NOT NULL DEFAULT 'Running';

ALTER TABLE assets
  ADD COLUMN maintenanceType VARCHAR(30) NOT NULL DEFAULT 'Preventive',
  ADD COLUMN downtimeStart   DATETIME NULL,
  ADD COLUMN downtimeEnd     DATETIME NULL,
  ADD COLUMN spareParts     TEXT NULL;
