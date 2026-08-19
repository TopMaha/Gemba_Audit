import type { ISODate } from './time';

export interface Manager {
  id: string;
  manager_code: string;
  full_name: string;
  full_name_en?: string;
  department: string;
  position?: string;
  avatar_url?: string | null;
  is_active: boolean;
  dashboard_enabled: boolean;
  created_at: string;
}

export interface Superuser {
  id: string;
  admin_code: string;
  full_name: string;
}

export interface Area {
  id: string;
  area_name: string;
  area_name_en?: string;
  parent_id: string | null;
  department: string;
  is_active: boolean;
}

export interface WalkTheme {
  id: string;
  theme_name: string;
  theme_name_en?: string;
  color?: string;
  is_active: boolean;
}

export type PlanStatus = 'planned' | 'completed' | 'cancelled';

export interface GembaPlan {
  id: string;
  manager_id: string;
  plan_date: ISODate;
  plan_time: string; // HH:mm
  area_id: string;
  /** หัวข้อที่ใช้งานจริง (สูงสุด 3) */
  theme_ids: string[];
  /** ค่าเดียว คงไว้เพื่อความเข้ากันได้กับโค้ดเดิม */
  theme_id: string | null;
  note?: string;
  status: PlanStatus;
  created_at: string;
}

export interface WalkRecord {
  id: string;
  plan_id: string | null; // null = Ad-hoc
  manager_id: string;
  actual_date: ISODate;
  actual_time: string;
  actual_area_id: string;
  /** สำหรับ Ad-hoc ที่ไม่มีแผน — เก็บหัวข้อไว้ในเรคคอร์ดเอง */
  theme_ids: string[];
  observation: string;
  has_issue: boolean;
  issue_summary?: string;
  photo_urls: string[];
  participant_names: string[];
  ci_required: boolean;
  ci_ticket_no?: string;
  ci_ticket_link?: string;
  completed_at: string;
}

export type ChangeAction = 'create' | 'update' | 'delete';

export interface ChangeHistory {
  id: string;
  table_name: string;
  record_id: string;
  action_type: ChangeAction;
  field?: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
}

export interface WeeklyFocus {
  id: string;
  week_start: ISODate;
  week_end: ISODate;
  theme_ids: string[];
  message_th: string;
  message_en: string;
  is_active: boolean;
}

export interface LoginHistory {
  id: string;
  actor_id: string;
  actor_name: string;
  role: 'manager' | 'admin';
  at: string;
  result: 'success' | 'failed';
}

export interface AppSettings {
  /** จำนวนครั้งขั้นต่ำที่ทุกคนต้องเดินต่อสัปดาห์ */
  weekly_target: number;
  /** เตือนเมื่อพื้นที่ถูกเดินภายในกี่วัน */
  recent_visit_days: number;
  company_name: string;
  plant_name: string;
}

export interface Db {
  managers: Manager[];
  superusers: Superuser[];
  areas: Area[];
  walk_themes: WalkTheme[];
  gemba_plans: GembaPlan[];
  gemba_walk_records: WalkRecord[];
  change_history: ChangeHistory[];
  weekly_focus: WeeklyFocus[];
  login_history: LoginHistory[];
  app_settings: AppSettings;
  _version: number;
}
