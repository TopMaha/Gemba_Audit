import type { Area, Db, GembaPlan, Manager, WalkRecord, WalkTheme } from './types';
import { addDays, endOfWeek, startOfWeek, todayISO, weekdayIndex } from './time';
import { seededRandom } from './utils';

/** ข้อมูลตัวอย่างเริ่มต้น — สร้างครั้งเดียวตอนเปิดแอปครั้งแรก (ล้างได้ที่หน้าตั้งค่า) */

const MANAGERS: Omit<Manager, 'created_at'>[] = [
  { id: 'mgr_01', manager_code: '1001', full_name: 'สมชาย วัฒนกิจ', full_name_en: 'Somchai W.', department: 'Production', position: 'Production Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_02', manager_code: '1002', full_name: 'ปรียา ศรีสุข', full_name_en: 'Preeya S.', department: 'Quality', position: 'QA Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_03', manager_code: '1003', full_name: 'อนุชา ทองดี', full_name_en: 'Anucha T.', department: 'Maintenance', position: 'Maintenance Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_04', manager_code: '1004', full_name: 'วิภาดา จันทร์เพ็ญ', full_name_en: 'Wipada J.', department: 'Warehouse', position: 'Warehouse Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_05', manager_code: '1005', full_name: 'ธนากร พงษ์เจริญ', full_name_en: 'Thanakorn P.', department: 'Production', position: 'Shift Manager', avatar_url: null, is_active: true, dashboard_enabled: false },
  { id: 'mgr_06', manager_code: '1006', full_name: 'ณัฐพล อินทร์แก้ว', full_name_en: 'Nattapon I.', department: 'Safety', position: 'SHE Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_07', manager_code: '1007', full_name: 'กมลชนก บุญมี', full_name_en: 'Kamonchanok B.', department: 'Engineering', position: 'Engineering Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_08', manager_code: '1008', full_name: 'สุริยา แสงทอง', full_name_en: 'Suriya S.', department: 'Production', position: 'Line Leader', avatar_url: null, is_active: true, dashboard_enabled: false },
  { id: 'mgr_09', manager_code: '1009', full_name: 'พิมพ์ชนก เรืองศรี', full_name_en: 'Pimchanok R.', department: 'HR', position: 'HR Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_10', manager_code: '1010', full_name: 'เอกชัย มั่นคง', full_name_en: 'Ekkachai M.', department: 'Utility', position: 'Utility Manager', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_11', manager_code: '1011', full_name: 'จิราพร ใจงาม', full_name_en: 'Jiraporn J.', department: 'Quality', position: 'QC Supervisor', avatar_url: null, is_active: true, dashboard_enabled: true },
  { id: 'mgr_12', manager_code: '1012', full_name: 'ประเสริฐ ดำรงค์', full_name_en: 'Prasert D.', department: 'Production', position: 'Assistant Manager', avatar_url: null, is_active: false, dashboard_enabled: false },
];

type SeedArea = [id: string, th: string, en: string, parent: string | null, dept: string];

const AREAS: SeedArea[] = [
  ['ar_prod', 'สายการผลิต', 'Production', null, 'Production'],
  ['ar_line1', 'ไลน์ผลิต 1', 'Line 1', 'ar_prod', 'Production'],
  ['ar_line1_a', 'สถานีประกอบ A', 'Assembly A', 'ar_line1', 'Production'],
  ['ar_line1_qc', 'จุดตรวจ QC-1', 'QC Point 1', 'ar_line1', 'Quality'],
  ['ar_line2', 'ไลน์ผลิต 2', 'Line 2', 'ar_prod', 'Production'],
  ['ar_line3', 'ไลน์ผลิต 3', 'Line 3', 'ar_prod', 'Production'],
  ['ar_mix', 'ห้องผสม', 'Mixing Room', 'ar_prod', 'Production'],
  ['ar_pack', 'แผนกบรรจุ', 'Packing', 'ar_prod', 'Production'],

  ['ar_wh', 'คลังสินค้า', 'Warehouse', null, 'Warehouse'],
  ['ar_wh_in', 'พื้นที่รับเข้า', 'Inbound', 'ar_wh', 'Warehouse'],
  ['ar_wh_out', 'พื้นที่จ่ายออก', 'Outbound', 'ar_wh', 'Warehouse'],
  ['ar_wh_rack', 'โซนแร็ค A–C', 'Rack Zone A–C', 'ar_wh', 'Warehouse'],
  ['ar_wh_fg', 'คลังสินค้าสำเร็จรูป', 'Finished Goods', 'ar_wh', 'Warehouse'],

  ['ar_util', 'ระบบสาธารณูปโภค', 'Utility', null, 'Utility'],
  ['ar_boiler', 'ห้องหม้อไอน้ำ', 'Boiler Room', 'ar_util', 'Utility'],
  ['ar_comp', 'ห้องคอมเพรสเซอร์', 'Compressor Room', 'ar_util', 'Utility'],
  ['ar_wwtp', 'ระบบบำบัดน้ำเสีย', 'WWTP', 'ar_util', 'Utility'],
  ['ar_chiller', 'ห้องชิลเลอร์', 'Chiller Room', 'ar_util', 'Utility'],

  ['ar_maint', 'ซ่อมบำรุง', 'Maintenance', null, 'Maintenance'],
  ['ar_workshop', 'โรงซ่อม', 'Workshop', 'ar_maint', 'Maintenance'],
  ['ar_spare', 'คลังอะไหล่', 'Spare Parts', 'ar_maint', 'Maintenance'],

  ['ar_qa', 'ห้องปฏิบัติการ QA', 'QA Laboratory', null, 'Quality'],
  ['ar_common', 'พื้นที่ส่วนกลาง', 'Common Area', null, 'HR'],
  ['ar_canteen', 'โรงอาหาร', 'Canteen', 'ar_common', 'HR'],
  ['ar_gate', 'ประตูทางเข้า–ออก', 'Main Gate', 'ar_common', 'Safety'],
  ['ar_park', 'ลานจอดรถ', 'Parking', 'ar_common', 'Safety'],
];

const THEMES: WalkTheme[] = [
  { id: 'th_01', theme_name: '1-Safety: พฤติกรรมความปลอดภัย', theme_name_en: '1-Safety: Behaviour Based Safety', is_active: true },
  { id: 'th_02', theme_name: '2-Safety: การ์ดเครื่องจักร', theme_name_en: '2-Safety: Machine Guarding', is_active: true },
  { id: 'th_03', theme_name: '3-Safety: รถยก/MHE', theme_name_en: '3-Safety: MHE/PIVs', is_active: true },
  { id: 'th_04', theme_name: '4-Quality: ของเสียและงานแก้', theme_name_en: '4-Quality: Defect & Rework', is_active: true },
  { id: 'th_05', theme_name: '5-5ส และความสะอาด', theme_name_en: '5-5S & Housekeeping', is_active: true },
  { id: 'th_06', theme_name: '6-การทำงานตามมาตรฐาน', theme_name_en: '6-Standard Work', is_active: true },
  { id: 'th_07', theme_name: '7-พลังงานและสิ่งแวดล้อม', theme_name_en: '7-Energy & Environment', is_active: true },
  { id: 'th_08', theme_name: '8-การมีส่วนร่วมของพนักงาน', theme_name_en: '8-People Engagement', is_active: true },
];

const OBSERVATIONS = [
  'พบพนักงานสวมใส่ PPE ครบถ้วนตามข้อกำหนด พูดคุยเรื่องจุดเสี่ยงหน้างานกับหัวหน้ากะ',
  'ตรวจการ์ดเครื่องจักรจุดสายพาน พบสกรูยึดหลวม 1 จุด แจ้งช่างซ่อมบำรุงแล้ว',
  'พื้นที่ทางเดินรถยกมีกล่องวางกีดขวางบางส่วน ให้ย้ายออกทันทีและตีเส้นใหม่',
  'สอบถามพนักงานเรื่องมาตรฐานการทำงาน พนักงานอธิบายขั้นตอนได้ถูกต้องครบถ้วน',
  'ป้ายบ่งชี้พื้นที่จัดเก็บซีดจาง อ่านยาก เสนอให้จัดทำป้ายใหม่ภายในสัปดาห์หน้า',
  'ตรวจการคัดแยกของเสีย พบถังขยะรีไซเคิลปนกับขยะทั่วไป ได้อบรมย้ำหน้างานแล้ว',
  'จุดล้างมือและอ่างฉุกเฉินใช้งานได้ปกติ ทดสอบน้ำไหลผ่านเกณฑ์',
  'ระบบระบายอากาศเสียงดังผิดปกติ แจ้งทีมซ่อมบำรุงเข้าตรวจสอบภายในวันนี้',
  'พูดคุยกับพนักงานใหม่ 3 คน เรื่องขั้นตอนหยุดฉุกเฉิน ทุกคนชี้จุดปุ่ม E-stop ได้ถูกต้อง',
  'ตรวจ 5ส บริเวณจุดเก็บเครื่องมือ พบเครื่องมือไม่คืนเข้าเงา (shadow board) 2 ชิ้น',
];

const ISSUES = [
  'สกรูยึดการ์ดเครื่องจักรหลวม เสี่ยงต่อการหลุดระหว่างเดินเครื่อง',
  'ทางเดินรถยกมีสิ่งกีดขวาง เสี่ยงต่อการชน',
  'ป้ายบ่งชี้พื้นที่ชำรุด/อ่านไม่ออก',
  'ถังดับเพลิงเลยกำหนดตรวจสอบประจำเดือน',
  'พบน้ำมันรั่วซึมบริเวณใต้เครื่องจักร เสี่ยงลื่นล้ม',
];

const PARTICIPANTS = ['หัวหน้ากะ A', 'หัวหน้ากะ B', 'จป.วิชาชีพ', 'วิศวกรประจำไลน์', 'ช่างซ่อมบำรุง', 'ผู้ช่วยผู้จัดการ', 'พนักงาน QC'];

export function buildSeedDb(): Db {
  const rnd = seededRandom(20260808);
  const today = todayISO();
  const nowIso = new Date().toISOString();

  const managers: Manager[] = MANAGERS.map((m) => ({ ...m, created_at: nowIso }));
  const areas: Area[] = AREAS.map(([id, th, en, parent, dept]) => ({
    id,
    area_name: th,
    area_name_en: en,
    parent_id: parent,
    department: dept,
    is_active: true,
  }));

  const leafAreas = areas.filter((a) => areas.some((c) => c.parent_id === a.id) === false);
  const activeManagers = managers.filter((m) => m.is_active);

  const plans: GembaPlan[] = [];
  const records: WalkRecord[] = [];
  let n = 0;

  // ย้อนหลัง 63 วัน ถึงล่วงหน้า 12 วัน
  for (let offset = -63; offset <= 12; offset++) {
    const date = addDays(today, offset);
    const dow = weekdayIndex(date);
    if (dow === 0) continue; // ไม่วางแผนวันอาทิตย์

    for (const m of activeManagers) {
      // ความถี่ ~1.6 ครั้ง/สัปดาห์/คน
      if (rnd() > 0.27) continue;

      const area = leafAreas[Math.floor(rnd() * leafAreas.length)];
      const themeCount = 1 + Math.floor(rnd() * 3);
      const pool = [...THEMES];
      const themeIds: string[] = [];
      for (let i = 0; i < themeCount; i++) {
        themeIds.push(...pool.splice(Math.floor(rnd() * pool.length), 1).map((t) => t.id));
      }
      const hour = 8 + Math.floor(rnd() * 8);
      const time = `${String(hour).padStart(2, '0')}:${rnd() > 0.5 ? '30' : '00'}`;
      const id = `plan_${String(++n).padStart(4, '0')}`;

      const isPastDate = offset < 0;
      const roll = rnd();
      // แผนที่เลยกำหนดเก็บไว้เฉพาะ 10 วันล่าสุด ที่เก่ากว่านั้นถือว่าปิดเรื่องไปแล้ว
      const staleFallback = offset > -10 ? 'planned' : 'cancelled';
      const status = !isPastDate ? 'planned' : roll < 0.79 ? 'completed' : roll < 0.87 ? 'cancelled' : staleFallback;

      plans.push({
        id,
        manager_id: m.id,
        plan_date: date,
        plan_time: time,
        area_id: area.id,
        theme_ids: themeIds,
        theme_id: themeIds[0] ?? null,
        note: rnd() > 0.8 ? 'ตรวจตามรอบประจำสัปดาห์' : '',
        status: status as GembaPlan['status'],
        created_at: nowIso,
      });

      if (status === 'completed') {
        const hasIssue = rnd() < 0.28;
        const ciRequired = hasIssue && rnd() < 0.55;
        const parts = PARTICIPANTS.filter(() => rnd() < 0.3).slice(0, 3);
        records.push({
          id: `rec_${String(n).padStart(4, '0')}`,
          plan_id: id,
          manager_id: m.id,
          actual_date: date,
          actual_time: `${String(hour).padStart(2, '0')}:${String(10 + Math.floor(rnd() * 45)).padStart(2, '0')}`,
          actual_area_id: area.id,
          theme_ids: themeIds,
          observation: OBSERVATIONS[Math.floor(rnd() * OBSERVATIONS.length)],
          has_issue: hasIssue,
          issue_summary: hasIssue ? ISSUES[Math.floor(rnd() * ISSUES.length)] : '',
          photo_urls: [],
          participant_names: parts,
          ci_required: ciRequired,
          ci_ticket_no: ciRequired ? `CI-${2600 + Math.floor(rnd() * 400)}` : '',
          ci_ticket_link: '',
          completed_at: `${date}T${String(hour).padStart(2, '0')}:45:00.000Z`,
        });
      }
    }

    // การเดินแบบ Ad-hoc (ไม่ผูกแผน)
    if (offset < 0 && rnd() < 0.18) {
      const m = activeManagers[Math.floor(rnd() * activeManagers.length)];
      const area = leafAreas[Math.floor(rnd() * leafAreas.length)];
      const themeIds = [THEMES[Math.floor(rnd() * THEMES.length)].id];
      records.push({
        id: `rec_adhoc_${String(++n).padStart(4, '0')}`,
        plan_id: null,
        manager_id: m.id,
        actual_date: date,
        actual_time: '13:20',
        actual_area_id: area.id,
        theme_ids: themeIds,
        observation: OBSERVATIONS[Math.floor(rnd() * OBSERVATIONS.length)],
        has_issue: rnd() < 0.3,
        issue_summary: '',
        photo_urls: [],
        participant_names: [],
        ci_required: false,
        completed_at: `${date}T13:40:00.000Z`,
      });
    }
  }

  // ทุกคนต้องมีแผนล่วงหน้าอย่างน้อย 2 รายการภายใน 7 วัน เพื่อให้หน้าแผนไม่ว่าง
  for (const m of activeManagers) {
    let need =
      2 - plans.filter((p) => p.manager_id === m.id && p.plan_date >= today && p.status === 'planned').length;
    for (let offset = 0; offset <= 7 && need > 0; offset++) {
      const date = addDays(today, offset);
      if (weekdayIndex(date) === 0) continue;
      if (plans.some((p) => p.manager_id === m.id && p.plan_date === date)) continue;

      const area = leafAreas[Math.floor(rnd() * leafAreas.length)];
      const themeIds = [THEMES[Math.floor(rnd() * THEMES.length)].id];
      if (rnd() > 0.5) themeIds.push(THEMES[Math.floor(rnd() * THEMES.length)].id);
      const uniqueThemes = [...new Set(themeIds)];
      const hour = 8 + Math.floor(rnd() * 8);

      plans.push({
        id: `plan_${String(++n).padStart(4, '0')}`,
        manager_id: m.id,
        plan_date: date,
        plan_time: `${String(hour).padStart(2, '0')}:${rnd() > 0.5 ? '30' : '00'}`,
        area_id: area.id,
        theme_ids: uniqueThemes,
        theme_id: uniqueThemes[0],
        note: '',
        status: 'planned',
        created_at: nowIso,
      });
      need--;
    }
  }

  const ws = startOfWeek(today);

  return {
    _version: 1,
    managers,
    superusers: [{ id: 'su_01', admin_code: '9999', full_name: 'ผู้ดูแลระบบ' }],
    areas,
    walk_themes: THEMES,
    gemba_plans: plans,
    gemba_walk_records: records,
    change_history: [],
    weekly_focus: [
      {
        id: 'wf_01',
        week_start: ws,
        week_end: endOfWeek(today),
        theme_ids: ['th_03', 'th_02'],
        message_th: 'สัปดาห์นี้เน้นความปลอดภัยรถยก (MHE/PIVs) และการ์ดเครื่องจักร — ขอให้ทุกท่านเดินอย่างน้อย 1 ครั้งในหัวข้อที่กำหนด',
        message_en: 'This week focuses on MHE/PIVs safety and machine guarding — please complete at least one walk on the highlighted themes.',
        is_active: true,
      },
    ],
    login_history: [],
    app_settings: {
      weekly_target: 1,
      recent_visit_days: 7,
      company_name: 'Calue Manufacturing',
      plant_name: 'โรงงานบางปะกง',
    },
  };
}
