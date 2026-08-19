-- ============================================================================
--  Gemba Walk — ข้อมูลตั้งต้น
--  รันด้วย: wrangler d1 execute gemba-audit --file=./seed.sql --remote
--
--  แบ่งเป็น 2 ส่วน
--    ส่วน A  ข้อมูลอ้างอิง — จำเป็นต่อการใช้งานจริง ห้ามลบ
--    ส่วน B  ข้อมูลทดสอบ  — ลบทิ้งได้เมื่อขึ้นระบบจริง (ดูคำสั่งท้ายไฟล์)
--
--  ทุกคำสั่งใช้ INSERT OR IGNORE จึงรันซ้ำได้โดยไม่พัง และไม่ทับข้อมูลที่แก้ไปแล้ว
--
--  เรื่องวันที่: D1 ทำงานบน UTC แต่ระบบนี้ใช้เวลาไทย จึงบวก '+7 hours' ทุกครั้ง
--  ใช้วันที่แบบสัมพัทธ์ (ไม่ hardcode) ข้อมูลตัวอย่างจึงสดเสมอไม่ว่ารันวันไหน
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ส่วน A — ข้อมูลอ้างอิง                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── ผู้ดูแลระบบ (เข้าที่ /admin ด้วยรหัส 9999) ────────────────────────────
INSERT OR IGNORE INTO superusers (id, admin_code, full_name) VALUES
  ('su_01', '9999', 'ผู้ดูแลระบบ');


-- ── ตั้งค่าระบบ (แถวเดียวเสมอ) ────────────────────────────────────────────
INSERT OR IGNORE INTO app_settings (id, weekly_target, recent_visit_days, company_name, plant_name) VALUES
  (1, 1, 7, 'Calue Manufacturing', 'โรงงานบางปะกง');


-- ── ผู้จัดการ 12 คน (mgr_12 ตั้งเป็น inactive ไว้ทดสอบการถูกปิดบัญชี) ─────
INSERT OR IGNORE INTO managers
  (id, manager_code, full_name, full_name_en, department, position, avatar_url, is_active, dashboard_enabled, created_at)
VALUES
  ('mgr_01', '1001', 'สมชาย วัฒนกิจ',     'Somchai W.',      'Production',  'Production Manager',  NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_02', '1002', 'ปรียา ศรีสุข',      'Preeya S.',       'Quality',     'QA Manager',          NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_03', '1003', 'อนุชา ทองดี',       'Anucha T.',       'Maintenance', 'Maintenance Manager', NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_04', '1004', 'วิภาดา จันทร์เพ็ญ',  'Wipada J.',       'Warehouse',   'Warehouse Manager',   NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_05', '1005', 'ธนากร พงษ์เจริญ',   'Thanakorn P.',    'Production',  'Shift Manager',       NULL, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_06', '1006', 'ณัฐพล อินทร์แก้ว',   'Nattapon I.',     'Safety',      'SHE Manager',         NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_07', '1007', 'กมลชนก บุญมี',      'Kamonchanok B.',  'Engineering', 'Engineering Manager', NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_08', '1008', 'สุริยา แสงทอง',      'Suriya S.',       'Production',  'Line Leader',         NULL, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_09', '1009', 'พิมพ์ชนก เรืองศรี',  'Pimchanok R.',    'HR',          'HR Manager',          NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_10', '1010', 'เอกชัย มั่นคง',      'Ekkachai M.',     'Utility',     'Utility Manager',     NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_11', '1011', 'จิราพร ใจงาม',      'Jiraporn J.',     'Quality',     'QC Supervisor',       NULL, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('mgr_12', '1012', 'ประเสริฐ ดำรงค์',    'Prasert D.',      'Production',  'Assistant Manager',   NULL, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));


-- ── พื้นที่ 26 แห่ง — ต้องใส่ระดับบนก่อน เพราะ parent_id เป็น FK ───────────

-- ระดับบนสุด 6 แห่ง
INSERT OR IGNORE INTO areas (id, area_name, area_name_en, parent_id, department, is_active) VALUES
  ('ar_prod',   'สายการผลิต',          'Production',    NULL, 'Production',  1),
  ('ar_wh',     'คลังสินค้า',           'Warehouse',     NULL, 'Warehouse',   1),
  ('ar_util',   'ระบบสาธารณูปโภค',      'Utility',       NULL, 'Utility',     1),
  ('ar_maint',  'ซ่อมบำรุง',            'Maintenance',   NULL, 'Maintenance', 1),
  ('ar_qa',     'ห้องปฏิบัติการ QA',     'QA Laboratory', NULL, 'Quality',     1),
  ('ar_common', 'พื้นที่ส่วนกลาง',       'Common Area',   NULL, 'HR',          1);

-- ระดับที่ 2
INSERT OR IGNORE INTO areas (id, area_name, area_name_en, parent_id, department, is_active) VALUES
  ('ar_line1',    'ไลน์ผลิต 1',            'Line 1',          'ar_prod',   'Production',  1),
  ('ar_line2',    'ไลน์ผลิต 2',            'Line 2',          'ar_prod',   'Production',  1),
  ('ar_line3',    'ไลน์ผลิต 3',            'Line 3',          'ar_prod',   'Production',  1),
  ('ar_mix',      'ห้องผสม',               'Mixing Room',     'ar_prod',   'Production',  1),
  ('ar_pack',     'แผนกบรรจุ',             'Packing',         'ar_prod',   'Production',  1),
  ('ar_wh_in',    'พื้นที่รับเข้า',          'Inbound',         'ar_wh',     'Warehouse',   1),
  ('ar_wh_out',   'พื้นที่จ่ายออก',          'Outbound',        'ar_wh',     'Warehouse',   1),
  ('ar_wh_rack',  'โซนแร็ค A–C',           'Rack Zone A–C',   'ar_wh',     'Warehouse',   1),
  ('ar_wh_fg',    'คลังสินค้าสำเร็จรูป',     'Finished Goods',  'ar_wh',     'Warehouse',   1),
  ('ar_boiler',   'ห้องหม้อไอน้ำ',          'Boiler Room',     'ar_util',   'Utility',     1),
  ('ar_comp',     'ห้องคอมเพรสเซอร์',       'Compressor Room', 'ar_util',   'Utility',     1),
  ('ar_wwtp',     'ระบบบำบัดน้ำเสีย',       'WWTP',            'ar_util',   'Utility',     1),
  ('ar_chiller',  'ห้องชิลเลอร์',           'Chiller Room',    'ar_util',   'Utility',     1),
  ('ar_workshop', 'โรงซ่อม',                'Workshop',        'ar_maint',  'Maintenance', 1),
  ('ar_spare',    'คลังอะไหล่',             'Spare Parts',     'ar_maint',  'Maintenance', 1),
  ('ar_canteen',  'โรงอาหาร',               'Canteen',         'ar_common', 'HR',          1),
  ('ar_gate',     'ประตูทางเข้า–ออก',       'Main Gate',       'ar_common', 'Safety',      1),
  ('ar_park',     'ลานจอดรถ',               'Parking',         'ar_common', 'Safety',      1);

-- ระดับที่ 3 (ลูกของไลน์ผลิต 1)
INSERT OR IGNORE INTO areas (id, area_name, area_name_en, parent_id, department, is_active) VALUES
  ('ar_line1_a',  'สถานีประกอบ A', 'Assembly A',  'ar_line1', 'Production', 1),
  ('ar_line1_qc', 'จุดตรวจ QC-1',  'QC Point 1',  'ar_line1', 'Quality',    1);


-- ── หัวข้อการเดิน 8 หัวข้อ ────────────────────────────────────────────────
INSERT OR IGNORE INTO walk_themes (id, theme_name, theme_name_en, is_active) VALUES
  ('th_01', '1-Safety: พฤติกรรมความปลอดภัย', '1-Safety: Behaviour Based Safety', 1),
  ('th_02', '2-Safety: การ์ดเครื่องจักร',     '2-Safety: Machine Guarding',       1),
  ('th_03', '3-Safety: รถยก/MHE',            '3-Safety: MHE/PIVs',               1),
  ('th_04', '4-Quality: ของเสียและงานแก้',    '4-Quality: Defect & Rework',       1),
  ('th_05', '5-5ส และความสะอาด',             '5-5S & Housekeeping',              1),
  ('th_06', '6-การทำงานตามมาตรฐาน',          '6-Standard Work',                  1),
  ('th_07', '7-พลังงานและสิ่งแวดล้อม',        '7-Energy & Environment',           1),
  ('th_08', '8-การมีส่วนร่วมของพนักงาน',      '8-People Engagement',              1);


-- ── ประกาศหัวข้อประจำสัปดาห์นี้ ───────────────────────────────────────────
-- week_start = วันอาทิตย์ของสัปดาห์ปัจจุบัน คำนวณจาก strftime('%w') ซึ่งคืน 0 = อาทิตย์
INSERT OR IGNORE INTO weekly_focus (id, week_start, week_end, message_th, message_en, is_active) VALUES
  ('wf_01',
   date('now', '+7 hours', '-' || strftime('%w', 'now', '+7 hours') || ' days'),
   date('now', '+7 hours', '-' || strftime('%w', 'now', '+7 hours') || ' days', '+6 days'),
   'สัปดาห์นี้เน้นความปลอดภัยรถยก (MHE/PIVs) และการ์ดเครื่องจักร — ขอให้ทุกท่านเดินอย่างน้อย 1 ครั้งในหัวข้อที่กำหนด',
   'This week focuses on MHE/PIVs safety and machine guarding — please complete at least one walk on the highlighted themes.',
   1);

INSERT OR IGNORE INTO focus_themes (focus_id, theme_id) VALUES
  ('wf_01', 'th_03'),
  ('wf_01', 'th_02');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ส่วน B — ข้อมูลทดสอบ                                                    ║
-- ║  10 แผน · 5 บันทึกการเดิน (4 ผูกแผน + 1 Ad-hoc)                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── แผนการเดิน ───────────────────────────────────────────────────────────
-- ครอบทุกสถานะ เพื่อให้ทดสอบ adherence() ได้ครบทุกกิ่ง
INSERT OR IGNORE INTO gemba_plans (id, manager_id, plan_date, plan_time, area_id, note, status, created_at) VALUES
  -- เดินไปแล้ว (มีบันทึกผูกอยู่ในส่วนถัดไป)
  ('plan_0001', 'mgr_01', date('now', '+7 hours', '-6 days'),  '09:00', 'ar_line1_a', 'ตรวจตามรอบประจำสัปดาห์', 'completed', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('plan_0002', 'mgr_02', date('now', '+7 hours', '-5 days'),  '10:30', 'ar_line1_qc', '',                      'completed', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('plan_0003', 'mgr_06', date('now', '+7 hours', '-3 days'),  '14:00', 'ar_wh_rack',  '',                      'completed', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('plan_0004', 'mgr_10', date('now', '+7 hours', '-2 days'),  '08:30', 'ar_boiler',   '',                      'completed', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- ยกเลิก (ต้องไม่ถูกนับใน adherence)
  ('plan_0005', 'mgr_03', date('now', '+7 hours', '-4 days'),  '13:00', 'ar_workshop', 'ติดประชุมด่วน',          'cancelled', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- เลยกำหนดแล้วแต่ยังไม่ได้เดิน (ต้องถูกนับเป็นความผิดใน adherence)
  ('plan_0006', 'mgr_04', date('now', '+7 hours', '-1 days'),  '11:00', 'ar_wh_in',    '',                      'planned',   strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- วันนี้
  ('plan_0007', 'mgr_01', date('now', '+7 hours'),             '15:00', 'ar_pack',     '',                      'planned',   strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('plan_0008', 'mgr_07', date('now', '+7 hours'),             '16:00', 'ar_comp',     '',                      'planned',   strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- อนาคต (ต้องไม่ถูกนับเป็นความผิด)
  ('plan_0009', 'mgr_02', date('now', '+7 hours', '+2 days'),  '09:30', 'ar_mix',      '',                      'planned',   strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('plan_0010', 'mgr_09', date('now', '+7 hours', '+4 days'),  '10:00', 'ar_canteen',  '',                      'planned',   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO plan_themes (plan_id, theme_id, sort_order) VALUES
  ('plan_0001', 'th_01', 0), ('plan_0001', 'th_05', 1),
  ('plan_0002', 'th_04', 0),
  ('plan_0003', 'th_03', 0), ('plan_0003', 'th_02', 1),
  ('plan_0004', 'th_07', 0),
  ('plan_0005', 'th_06', 0),
  ('plan_0006', 'th_05', 0), ('plan_0006', 'th_03', 1),
  ('plan_0007', 'th_05', 0),
  ('plan_0008', 'th_02', 0), ('plan_0008', 'th_06', 1),
  ('plan_0009', 'th_04', 0),
  ('plan_0010', 'th_08', 0);


-- ── บันทึกการเดิน ────────────────────────────────────────────────────────
INSERT OR IGNORE INTO gemba_walk_records
  (id, plan_id, manager_id, actual_date, actual_time, actual_area_id,
   observation, has_issue, issue_summary, ci_required, ci_ticket_no, ci_ticket_link, completed_at)
VALUES
  ('rec_0001', 'plan_0001', 'mgr_01', date('now', '+7 hours', '-6 days'), '09:15', 'ar_line1_a',
   'พบพนักงานสวมใส่ PPE ครบถ้วนตามข้อกำหนด พูดคุยเรื่องจุดเสี่ยงหน้างานกับหัวหน้ากะ',
   0, '', 0, '', '', date('now', '+7 hours', '-6 days') || 'T09:45:00.000Z'),

  ('rec_0002', 'plan_0002', 'mgr_02', date('now', '+7 hours', '-5 days'), '10:40', 'ar_line1_qc',
   'ตรวจการคัดแยกของเสีย พบถังขยะรีไซเคิลปนกับขยะทั่วไป ได้อบรมย้ำหน้างานแล้ว',
   1, 'ของเสียถูกคัดแยกผิดประเภทที่จุดตรวจ QC-1', 1, 'CI-2731', '',
   date('now', '+7 hours', '-5 days') || 'T11:20:00.000Z'),

  ('rec_0003', 'plan_0003', 'mgr_06', date('now', '+7 hours', '-3 days'), '14:10', 'ar_wh_rack',
   'พื้นที่ทางเดินรถยกมีกล่องวางกีดขวางบางส่วน ให้ย้ายออกทันทีและตีเส้นใหม่',
   1, 'ทางเดินรถยกถูกกีดขวางบริเวณแร็ค B', 1, 'CI-2748', '',
   date('now', '+7 hours', '-3 days') || 'T14:50:00.000Z'),

  ('rec_0004', 'plan_0004', 'mgr_10', date('now', '+7 hours', '-2 days'), '08:40', 'ar_boiler',
   'ระบบระบายอากาศเสียงดังผิดปกติ แจ้งทีมซ่อมบำรุงเข้าตรวจสอบภายในวันนี้',
   1, 'พัดลมระบายอากาศห้องหม้อไอน้ำมีเสียงผิดปกติ', 0, '', '',
   date('now', '+7 hours', '-2 days') || 'T09:10:00.000Z'),

  -- Ad-hoc: เดินโดยไม่ได้วางแผนล่วงหน้า จึงมี plan_id เป็น NULL
  ('rec_adhoc_0001', NULL, 'mgr_08', date('now', '+7 hours', '-1 days'), '13:20', 'ar_line2',
   'ตรวจ 5ส บริเวณจุดเก็บเครื่องมือ พบเครื่องมือไม่คืนเข้าเงา (shadow board) 2 ชิ้น',
   0, '', 0, '', '', date('now', '+7 hours', '-1 days') || 'T13:40:00.000Z');

INSERT OR IGNORE INTO record_themes (record_id, theme_id, sort_order) VALUES
  ('rec_0001', 'th_01', 0), ('rec_0001', 'th_05', 1),
  ('rec_0002', 'th_04', 0),
  ('rec_0003', 'th_03', 0), ('rec_0003', 'th_02', 1),
  ('rec_0004', 'th_07', 0),
  ('rec_adhoc_0001', 'th_05', 0);

INSERT OR IGNORE INTO record_participants (id, record_id, participant_name, sort_order) VALUES
  ('rp_0001', 'rec_0001', 'ก้องภพ (หัวหน้ากะ A)', 0),
  ('rp_0002', 'rec_0001', 'มานี (ช่างเทคนิค)',     1),
  ('rp_0003', 'rec_0002', 'สุดา (QC)',             0),
  ('rp_0004', 'rec_0003', 'วีระ (หัวหน้าคลัง)',     0);

-- ยังไม่ใส่รูปตัวอย่าง เพราะ photo_key ต้องมีอ็อบเจกต์อยู่จริงใน R2
-- ถ้าจะทดสอบ ให้อัปโหลดผ่าน POST /api/uploads แล้วค่อยเพิ่มแถวที่นี่


-- ── ประวัติการแก้ไข + การเข้าสู่ระบบ (ไว้ทดสอบหน้าดูประวัติ) ──────────────
INSERT OR IGNORE INTO change_history
  (id, table_name, record_id, action_type, field, old_value, new_value, changed_by, changed_at) VALUES
  ('ch_0001', 'gemba_walk_records', 'rec_0002', 'create', NULL, NULL, NULL, 'ปรียา ศรีสุข', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')),
  ('ch_0002', 'gemba_walk_records', 'rec_0002', 'update', 'ci_ticket_no', NULL, 'CI-2731', 'ปรียา ศรีสุข', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'));

INSERT OR IGNORE INTO login_history (id, actor_id, actor_name, role, at, result) VALUES
  ('log_0001', 'mgr_01', 'สมชาย วัฒนกิจ', 'manager', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'), 'success'),
  ('log_0002', '-',      '9998',          'manager', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'), 'failed');


-- ============================================================================
--  ล้างเฉพาะข้อมูลทดสอบ (ส่วน B) ตอนขึ้นระบบจริง — เก็บผู้ใช้/พื้นที่/หัวข้อไว้
--  คัดลอกไปรันเองเมื่อพร้อม
--
--    DELETE FROM login_history;
--    DELETE FROM change_history;
--    DELETE FROM gemba_walk_records;   -- ตารางลูกหายตาม CASCADE
--    DELETE FROM gemba_plans;          -- ตารางลูกหายตาม CASCADE
--
--  ลำดับสำคัญ: ต้องลบ records ก่อน plans เพราะ records อ้าง plan_id อยู่
-- ============================================================================
