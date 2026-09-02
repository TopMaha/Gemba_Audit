import type { Db, WalkTheme } from './types';
import { buildAreas, buildManagers, buildSuperusers } from './roster';

/**
 * ข้อมูลตั้งต้นตอนเปิดแอปครั้งแรก — ทะเบียนผู้ใช้/พื้นที่/หัวข้อเท่านั้น
 *
 * ไม่มีแผน ไม่มีบันทึกการเดิน ไม่มีประวัติใด ๆ ทั้งสิ้น ระบบเริ่มจากศูนย์จริง
 * ทะเบียนผู้ใช้และพื้นที่อยู่ใน src/lib/roster.ts ซึ่งสร้างจากฐานข้อมูล PSIF
 */

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

export function buildSeedDb(): Db {
  return {
    _version: 3,
    managers: buildManagers(new Date().toISOString()),
    superusers: buildSuperusers(),
    areas: buildAreas(),
    walk_themes: THEMES,
    gemba_plans: [],
    gemba_walk_records: [],
    change_history: [],
    weekly_focus: [],
    login_history: [],
    app_settings: {
      weekly_target: 1,
      recent_visit_days: 7,
      company_name: 'TENNECO',
      plant_name: 'TENNECO',
    },
  };
}
