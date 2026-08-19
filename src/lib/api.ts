import { mutate, query } from './db';
import { ONLINE_MODE } from './config';
import { apiPost } from './net';
import { enqueue, type QueueKind } from './queue';
import { refreshPending, syncNow } from './sync';
import { nowStamp, todayISO, type ISODate } from './time';
import { uid } from './utils';
import type {
  Area,
  AppSettings,
  ChangeHistory,
  GembaPlan,
  LoginHistory,
  Manager,
  Superuser,
  WalkRecord,
  WalkTheme,
  WeeklyFocus,
} from './types';

/**
 * ── ชั้นข้อมูลของโดเมน ──────────────────────────────────────
 * ทุกฟังก์ชันเขียนลง "สำเนาในเครื่อง" ก่อนเสมอ แล้วค่อยใส่คิวรอซิงก์
 * ผู้ใช้จึงบันทึกงานได้ทันทีแม้เน็ตไม่ถึง ซึ่งเป็นเรื่องปกติในโรงงาน
 * ส่วนการส่งขึ้นเซิร์ฟเวอร์เป็นหน้าที่ของ src/lib/sync.ts
 *
 * ชื่อฟังก์ชันและชนิดข้อมูลคงเดิมทุกตัว หน้าจอจึงไม่ต้องแก้อะไรเลย
 */

/**
 * ใส่งานเข้าคิวรอซิงก์ แล้วลองส่งทันทีถ้าออนไลน์อยู่
 *
 * ⚠️ ห้ามโยนข้อผิดพลาดออกไปเด็ดขาด
 * ข้อมูลถูกเขียนลงสำเนาในเครื่องเรียบร้อยแล้วก่อนถึงบรรทัดนี้
 * ถ้าปล่อยให้ล้ม ผู้ใช้จะเห็นว่า "บันทึกไม่สำเร็จ" ทั้งที่งานถูกเก็บไว้แล้ว
 * แล้วจะกดบันทึกซ้ำจนเกิดข้อมูลซ้ำ — แย่กว่าการซิงก์ช้าไปหนึ่งรอบ
 */
async function queueWrite(kind: QueueKind, localId: string, payload: unknown) {
  if (!ONLINE_MODE) return; // โหมดในเครื่องล้วน ไม่ต้องซิงก์
  try {
    await enqueue({ kind, localId, payload });
    await refreshPending();
    void syncNow();
  } catch (e) {
    // เข้าคิวไม่ได้ (เช่น IndexedDB ถูกปิดหรือพื้นที่เต็ม)
    // งานยังอยู่ในเครื่องครบ รอบซิงก์ถัดไปจะดึงของจากเซิร์ฟเวอร์มาเทียบเอง
    console.warn('ใส่คิวรอซิงก์ไม่สำเร็จ — ข้อมูลถูกบันทึกในเครื่องแล้ว', kind, localId, e);
  }
}

/** ── การเข้าสู่ระบบ ─────────────────────────────────────── */

export async function loginManager(code: string): Promise<{ manager?: Manager; error?: 'not_found' | 'inactive' }> {
  // ตรวจกับสำเนาในเครื่อง เพื่อให้เข้าระบบได้แม้เน็ตไม่ถึง
  // แล้วแจ้งเซิร์ฟเวอร์แบบไม่รอผล ประวัติการเข้าระบบฝั่งเซิร์ฟเวอร์จะได้ครบ
  if (ONLINE_MODE) void apiPost('/api/auth/login', { code: code.trim() }).catch(() => {});
  return mutate((db) => {
    const m = db.managers.find((x) => x.manager_code === code.trim());
    const log: LoginHistory = {
      id: uid('log'),
      actor_id: m?.id ?? '-',
      actor_name: m?.full_name ?? code,
      role: 'manager',
      at: nowStamp(),
      result: m && m.is_active ? 'success' : 'failed',
    };
    db.login_history.unshift(log);
    if (!m) return { error: 'not_found' as const };
    if (!m.is_active) return { error: 'inactive' as const };
    return { manager: m };
  });
}

export async function loginAdmin(code: string): Promise<Superuser | null> {
  if (ONLINE_MODE) void apiPost('/api/auth/admin', { code: code.trim() }).catch(() => {});
  return mutate((db) => {
    const su = db.superusers.find((s) => s.admin_code === code.trim()) ?? null;
    db.login_history.unshift({
      id: uid('log'),
      actor_id: su?.id ?? '-',
      actor_name: su?.full_name ?? 'admin',
      role: 'admin',
      at: nowStamp(),
      result: su ? 'success' : 'failed',
    });
    return su;
  });
}

export async function getLoginHistory(): Promise<LoginHistory[]> {
  return query((db) => db.login_history.slice(0, 100));
}

/** ── ข้อมูลหลัก ─────────────────────────────────────────── */

export async function getManagers(): Promise<Manager[]> {
  return query((db) => [...db.managers].sort((a, b) => a.manager_code.localeCompare(b.manager_code)));
}

export async function getManager(id: string): Promise<Manager | undefined> {
  return query((db) => db.managers.find((m) => m.id === id));
}

export async function saveManager(input: Partial<Manager> & { id?: string }, actor: string): Promise<Manager> {
  const saved = await mutate((db) => {
    if (input.id) {
      const idx = db.managers.findIndex((m) => m.id === input.id);
      const before = db.managers[idx];
      const next = { ...before, ...input } as Manager;
      db.managers[idx] = next;
      logDiff(db.change_history, 'managers', next.id, before, next, actor);
      return next;
    }
    const created: Manager = {
      id: uid('mgr'),
      manager_code: input.manager_code ?? '',
      full_name: input.full_name ?? '',
      full_name_en: input.full_name_en,
      department: input.department ?? '',
      position: input.position,
      avatar_url: input.avatar_url ?? null,
      is_active: input.is_active ?? true,
      dashboard_enabled: input.dashboard_enabled ?? true,
      created_at: nowStamp(),
    };
    db.managers.push(created);
    db.change_history.unshift(entry('managers', created.id, 'create', null, created.full_name, actor));
    return created;
  });

  await queueWrite('manager.save', input.id ?? `new:${saved.id}`, {
    id: saved.id,
    manager_code: saved.manager_code,
    full_name: saved.full_name,
    full_name_en: saved.full_name_en,
    department: saved.department,
    position: saved.position,
    avatar_url: saved.avatar_url,
    is_active: saved.is_active,
    dashboard_enabled: saved.dashboard_enabled,
  });
  return saved;
}

export async function getAreas(): Promise<Area[]> {
  return query((db) => db.areas);
}

export async function saveArea(input: Partial<Area> & { id?: string }, actor: string): Promise<Area> {
  const saved = await mutate((db) => {
    if (input.id) {
      const idx = db.areas.findIndex((a) => a.id === input.id);
      const before = db.areas[idx];
      const next = { ...before, ...input } as Area;
      db.areas[idx] = next;
      logDiff(db.change_history, 'areas', next.id, before, next, actor);
      return next;
    }
    const created: Area = {
      id: uid('ar'),
      area_name: input.area_name ?? '',
      area_name_en: input.area_name_en,
      parent_id: input.parent_id ?? null,
      department: input.department ?? '',
      is_active: input.is_active ?? true,
    };
    db.areas.push(created);
    db.change_history.unshift(entry('areas', created.id, 'create', null, created.area_name, actor));
    return created;
  });

  await queueWrite('area.save', input.id ?? `new:${saved.id}`, {
    id: saved.id,
    area_name: saved.area_name,
    area_name_en: saved.area_name_en,
    parent_id: saved.parent_id,
    department: saved.department,
    is_active: saved.is_active,
  });
  return saved;
}

export async function getThemes(): Promise<WalkTheme[]> {
  return query((db) => db.walk_themes);
}

export async function saveTheme(input: Partial<WalkTheme> & { id?: string }, actor: string): Promise<WalkTheme> {
  const saved = await mutate((db) => {
    if (input.id) {
      const idx = db.walk_themes.findIndex((t) => t.id === input.id);
      const before = db.walk_themes[idx];
      const next = { ...before, ...input } as WalkTheme;
      db.walk_themes[idx] = next;
      logDiff(db.change_history, 'walk_themes', next.id, before, next, actor);
      return next;
    }
    const created: WalkTheme = {
      id: uid('th'),
      theme_name: input.theme_name ?? '',
      theme_name_en: input.theme_name_en,
      is_active: input.is_active ?? true,
    };
    db.walk_themes.push(created);
    db.change_history.unshift(entry('walk_themes', created.id, 'create', null, created.theme_name, actor));
    return created;
  });

  await queueWrite('theme.save', input.id ?? `new:${saved.id}`, {
    id: saved.id,
    theme_name: saved.theme_name,
    theme_name_en: saved.theme_name_en,
    is_active: saved.is_active,
  });
  return saved;
}

export async function getSettings(): Promise<AppSettings> {
  return query((db) => db.app_settings);
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const saved = await mutate((db) => {
    db.app_settings = { ...db.app_settings, ...patch };
    return db.app_settings;
  });

  await queueWrite('settings.save', 'settings', patch);
  return saved;
}

/** ── แผนการเดิน ─────────────────────────────────────────── */

export async function getPlans(): Promise<GembaPlan[]> {
  return query((db) => db.gemba_plans);
}

export type PlanInput = {
  manager_id: string;
  plan_date: ISODate;
  plan_time: string;
  area_id: string;
  theme_ids: string[];
  note?: string;
};

export async function createPlan(input: PlanInput, actor: string): Promise<GembaPlan> {
  const created = await mutate((db) => {
    const created: GembaPlan = {
      id: uid('plan'),
      manager_id: input.manager_id,
      plan_date: input.plan_date,
      plan_time: input.plan_time,
      area_id: input.area_id,
      theme_ids: input.theme_ids.slice(0, 3),
      theme_id: input.theme_ids[0] ?? null,
      note: input.note ?? '',
      status: 'planned',
      created_at: nowStamp(),
    };
    db.gemba_plans.push(created);
    db.change_history.unshift(entry('gemba_plans', created.id, 'create', null, created.plan_date, actor));
    return created;
  });

  // ส่ง id ที่สร้างในเครื่องไปด้วย เพื่อให้ id สองฝั่งตรงกันหลังซิงก์
  await queueWrite('plan.create', created.id, {
    id: created.id,
    manager_id: created.manager_id,
    plan_date: created.plan_date,
    plan_time: created.plan_time,
    area_id: created.area_id,
    theme_ids: created.theme_ids,
    note: created.note,
  });
  return created;
}

export async function updatePlan(id: string, patch: Partial<GembaPlan>, actor: string): Promise<GembaPlan> {
  const next = await mutate((db) => {
    const idx = db.gemba_plans.findIndex((p) => p.id === id);
    const before = db.gemba_plans[idx];
    const next: GembaPlan = { ...before, ...patch };
    if (patch.theme_ids) {
      next.theme_ids = patch.theme_ids.slice(0, 3);
      next.theme_id = next.theme_ids[0] ?? null;
    }
    db.gemba_plans[idx] = next;
    logDiff(db.change_history, 'gemba_plans', id, before, next, actor);
    return next;
  });

  await queueWrite('plan.update', id, {
    manager_id: next.manager_id,
    plan_date: next.plan_date,
    plan_time: next.plan_time,
    area_id: next.area_id,
    theme_ids: next.theme_ids,
    note: next.note,
    status: next.status,
  });
  return next;
}

export async function cancelPlan(id: string, actor: string) {
  return updatePlan(id, { status: 'cancelled' }, actor);
}

/** ── บันทึกการเดิน ──────────────────────────────────────── */

export async function getRecords(): Promise<WalkRecord[]> {
  return query((db) => db.gemba_walk_records);
}

export type RecordInput = {
  plan_id: string | null;
  manager_id: string;
  actual_date: ISODate;
  actual_time: string;
  actual_area_id: string;
  theme_ids: string[];
  observation: string;
  has_issue: boolean;
  issue_summary?: string;
  photo_urls: string[];
  participant_names: string[];
  ci_required?: boolean;
  ci_ticket_no?: string;
  ci_ticket_link?: string;
};

export async function createRecord(input: RecordInput, actor: string): Promise<WalkRecord> {
  const created = await mutate((db) => {
    const created: WalkRecord = {
      id: uid('rec'),
      plan_id: input.plan_id,
      manager_id: input.manager_id,
      actual_date: input.actual_date,
      actual_time: input.actual_time,
      actual_area_id: input.actual_area_id,
      theme_ids: input.theme_ids,
      observation: input.observation,
      has_issue: input.has_issue,
      issue_summary: input.issue_summary ?? '',
      photo_urls: input.photo_urls,
      participant_names: input.participant_names,
      ci_required: input.ci_required ?? false,
      ci_ticket_no: input.ci_ticket_no ?? '',
      ci_ticket_link: input.ci_ticket_link ?? '',
      completed_at: nowStamp(),
    };
    db.gemba_walk_records.push(created);
    if (input.plan_id) {
      const p = db.gemba_plans.find((x) => x.id === input.plan_id);
      if (p) p.status = 'completed';
    }
    db.change_history.unshift(entry('gemba_walk_records', created.id, 'create', null, created.actual_date, actor));
    return created;
  });

  // รูปยังเป็นคีย์ local: อยู่ ตัวซิงก์จะอัปโหลดขึ้น R2 แล้วสลับคีย์ให้เอง
  await queueWrite('record.create', created.id, {
    id: created.id,
    plan_id: created.plan_id,
    manager_id: created.manager_id,
    actual_date: created.actual_date,
    actual_time: created.actual_time,
    actual_area_id: created.actual_area_id,
    theme_ids: created.theme_ids,
    observation: created.observation,
    has_issue: created.has_issue,
    issue_summary: created.issue_summary,
    photo_urls: created.photo_urls,
    participant_names: created.participant_names,
    ci_required: created.ci_required,
    ci_ticket_no: created.ci_ticket_no,
    ci_ticket_link: created.ci_ticket_link,
  });
  return created;
}

export async function updateRecord(id: string, patch: Partial<WalkRecord>, actor: string): Promise<WalkRecord> {
  const next = await mutate((db) => {
    const idx = db.gemba_walk_records.findIndex((r) => r.id === id);
    const before = db.gemba_walk_records[idx];
    const next: WalkRecord = { ...before, ...patch };
    db.gemba_walk_records[idx] = next;
    logDiff(db.change_history, 'gemba_walk_records', id, before, next, actor);

    // แก้หัวข้อการเดินย้อนหลัง = แก้ที่แผนด้วย เพื่อให้รายงานตรงกัน
    if (patch.theme_ids && before.plan_id) {
      const p = db.gemba_plans.find((x) => x.id === before.plan_id);
      if (p) {
        const pb = { ...p };
        p.theme_ids = patch.theme_ids.slice(0, 3);
        p.theme_id = p.theme_ids[0] ?? null;
        logDiff(db.change_history, 'gemba_plans', p.id, pb, p, actor);
      }
    }
    return next;
  });

  // ส่งเฉพาะฟิลด์ที่ผู้ใช้แก้จริง เพื่อไม่ให้ทับค่าที่คนอื่นเพิ่งแก้บนเซิร์ฟเวอร์
  const body: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) body[key] = (next as unknown as Record<string, unknown>)[key];
  await queueWrite('record.update', id, body);
  return next;
}

/** ── Audit trail ────────────────────────────────────────── */

export async function getChangeHistory(recordId?: string): Promise<ChangeHistory[]> {
  return query((db) =>
    recordId ? db.change_history.filter((c) => c.record_id === recordId) : db.change_history.slice(0, 300),
  );
}

function entry(
  table: string,
  recordId: string,
  action: ChangeHistory['action_type'],
  oldV: string | null,
  newV: string | null,
  actor: string,
  field?: string,
): ChangeHistory {
  return {
    id: uid('ch'),
    table_name: table,
    record_id: recordId,
    action_type: action,
    field,
    old_value: oldV,
    new_value: newV,
    changed_by: actor,
    changed_at: nowStamp(),
  };
}

const IGNORED_FIELDS = new Set(['id', 'created_at', 'completed_at']);

function logDiff(sink: ChangeHistory[], table: string, id: string, before: any, after: any, actor: string) {
  for (const key of Object.keys(after)) {
    if (IGNORED_FIELDS.has(key)) continue;
    const a = normalize(before?.[key]);
    const b = normalize(after[key]);
    if (a === b) continue;
    sink.unshift(entry(table, id, 'update', a, b, actor, key));
  }
}

function normalize(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

/** ── ประกาศประจำสัปดาห์ ─────────────────────────────────── */

export async function getWeeklyFocusList(): Promise<WeeklyFocus[]> {
  return query((db) => [...db.weekly_focus].sort((a, b) => b.week_start.localeCompare(a.week_start)));
}

export async function getActiveFocus(date: ISODate = todayISO()): Promise<WeeklyFocus | null> {
  return query(
    (db) =>
      db.weekly_focus.find((f) => f.is_active && f.week_start <= date && date <= f.week_end) ?? null,
  );
}

export async function saveWeeklyFocus(input: Partial<WeeklyFocus> & { id?: string }): Promise<WeeklyFocus> {
  const saved = await mutate((db) => {
    if (input.id) {
      const idx = db.weekly_focus.findIndex((f) => f.id === input.id);
      db.weekly_focus[idx] = { ...db.weekly_focus[idx], ...input } as WeeklyFocus;
      return db.weekly_focus[idx];
    }
    const created: WeeklyFocus = {
      id: uid('wf'),
      week_start: input.week_start!,
      week_end: input.week_end!,
      theme_ids: input.theme_ids ?? [],
      message_th: input.message_th ?? '',
      message_en: input.message_en ?? '',
      is_active: input.is_active ?? true,
    };
    db.weekly_focus.push(created);
    return created;
  });

  await queueWrite('focus.save', input.id ?? `new:${saved.id}`, {
    id: saved.id,
    week_start: saved.week_start,
    week_end: saved.week_end,
    theme_ids: saved.theme_ids,
    message_th: saved.message_th,
    message_en: saved.message_en,
    is_active: saved.is_active,
  });
  return saved;
}
