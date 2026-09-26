-- ============================================================================
--  ผู้ต้องเดิน Gemba · ตารางเดินรายบุคคล · จุดรวมปัญหา · พื้นที่ 6 แห่ง
--  สำหรับฐานข้อมูลที่ขึ้นระบบไปแล้ว (ฐานใหม่ใช้ schema.sql + seed.sql ได้เลย)
--
--  รันด้วย: wrangler d1 execute gemba-audit --file=./migrate-walkers-issues.sql --remote
--  ⚠️ ต้องรันไฟล์นี้ "ก่อน" deploy Worker ตัวใหม่ ไม่งั้น Worker จะอ้างคอลัมน์ที่ยังไม่มี
--
--  รันซ้ำได้บางส่วน: ALTER TABLE จะฟ้อง "duplicate column name" ถ้าเคยรันแล้ว
--  ให้ลบบรรทัด ALTER ที่ผ่านไปแล้วออก แล้วรันส่วนที่เหลือต่อ (UPDATE/INSERT รันซ้ำได้)
-- ============================================================================


-- ── 1) ผู้ต้องเดิน Gemba + วันประจำ ──────────────────────────────────────
-- โรงงานให้เดินเฉพาะหัวหน้างาน ไม่ใช่ทุกคนที่ล็อกอินได้ ผู้ดูแลเลือกรายคนในหน้าตั้งค่า
-- ค่าตั้งต้น 0 = ยังไม่มีใครถูกกำหนด (ระหว่างนั้นแอปนับทุกคนที่เข้าระบบได้แทน)
ALTER TABLE managers ADD COLUMN is_walker INTEGER NOT NULL DEFAULT 0 CHECK (is_walker IN (0, 1));

-- วันประจำเก็บเป็น bitmask: bit 0 = อาทิตย์ … bit 6 = เสาร์ (เช่น จ.+พ.+ศ. = 2+8+32 = 42)
-- ใช้ตัวเลขตัวเดียวแทนตารางลูก เพราะมีได้แค่ 7 ค่า และไม่มีการค้นย้อนกลับจาก SQL
ALTER TABLE managers ADD COLUMN walk_days INTEGER NOT NULL DEFAULT 0 CHECK (walk_days BETWEEN 0 AND 127);


-- ── 2) จุดรวมปัญหา ───────────────────────────────────────────────────────
-- บันทึกที่พบปัญหาจะเข้าจุดรวมในสถานะ open → acknowledged → closed
ALTER TABLE gemba_walk_records ADD COLUMN issue_status TEXT NOT NULL DEFAULT 'open'
  CHECK (issue_status IN ('open', 'acknowledged', 'closed'));
ALTER TABLE gemba_walk_records ADD COLUMN issue_response TEXT NOT NULL DEFAULT '';

-- ผู้รับเรื่องที่จุดรวม (managers.id) — ตอนนี้ให้ T-815 ไปก่อน เปลี่ยนได้ที่หน้าตั้งค่า › ระบบ
ALTER TABLE app_settings ADD COLUMN issue_owner_id TEXT;

UPDATE app_settings
   SET issue_owner_id = 'mgr_T_815'
 WHERE id = 1
   AND issue_owner_id IS NULL
   AND EXISTS (SELECT 1 FROM managers WHERE id = 'mgr_T_815');

-- หน้าจุดรวมกรองตามสถานะของรายการที่พบปัญหา
CREATE INDEX IF NOT EXISTS idx_records_issue_status ON gemba_walk_records (issue_status) WHERE has_issue = 1;


-- ── 3) พื้นที่เดินเหลือ 6 แห่ง: VSM1 · VSM2 · VSM3 · VSM4 · QC · OFFICE ─────
-- พื้นที่เดิมที่มีแผน/บันทึกผูกอยู่ลบไม่ได้ (RESTRICT) และไม่ควรลบเพราะเป็นหลักฐาน
-- จึงปิดใช้งานแทน ประวัติเดิมยังแสดงชื่อพื้นที่ครบ แต่เลือกใหม่ไม่ได้แล้ว
UPDATE areas SET area_name = 'VSM1', area_name_en = 'VSM1', parent_id = NULL, is_active = 1 WHERE id = 'ar_vsm1';
UPDATE areas SET area_name = 'VSM2', area_name_en = 'VSM2', parent_id = NULL, is_active = 1 WHERE id = 'ar_vsm2';
UPDATE areas SET area_name = 'VSM3', area_name_en = 'VSM3', parent_id = NULL, is_active = 1 WHERE id = 'ar_vsm3';
UPDATE areas SET area_name = 'VSM4', area_name_en = 'VSM4', parent_id = NULL, is_active = 1 WHERE id = 'ar_vsm4';
UPDATE areas SET area_name = 'QC', area_name_en = 'QC', parent_id = NULL, is_active = 1 WHERE id = 'ar_qc';

INSERT OR IGNORE INTO areas (id, area_name, area_name_en, parent_id, department, is_active) VALUES
  ('ar_office', 'OFFICE', 'OFFICE', NULL, 'Office', 1);

UPDATE areas
   SET is_active = 0
 WHERE id NOT IN ('ar_vsm1', 'ar_vsm2', 'ar_vsm3', 'ar_vsm4', 'ar_qc', 'ar_office');
