/**
 * แปลงแถวจาก D1 ให้เป็นรูปร่างเดียวกับ src/lib/types.ts ของ frontend
 *
 * ที่ต้องแปลงมี 2 เรื่อง
 *   1. boolean — SQLite เก็บเป็น 0/1 แต่ frontend คาดหวัง true/false
 *   2. อาร์เรย์ — เก็บแยกในตารางลูก ต้องประกอบกลับเป็นอาร์เรย์
 *
 * ⚠️ กติกาสำคัญ: group_concat ต้องมี ORDER BY sort_order เสมอ
 * ไม่งั้นลำดับหัวข้อจะสลับ แล้ว theme_ids[0] (หัวข้อหลักที่หน้าจอใช้) จะเพี้ยน
 */

/** แยกผลของ group_concat กลับเป็นอาร์เรย์ (คืนอาร์เรย์ว่างเมื่อไม่มีสมาชิก) */
function splitList(v) {
  if (v === null || v === undefined || v === '') return [];
  return String(v).split(SEP).filter((s) => s !== '');
}

/**
 * ตัวคั่นที่ใช้ใน group_concat — ใช้ 0x01 แทนจุลภาค
 * เพราะชื่อผู้ร่วมเดินมีจุลภาคปนได้ ถ้าใช้ ',' จะแยกผิด
 */
const SEP = '\u0001';

export const toBool = (v) => v === 1 || v === true;

export function mapManager(r) {
  return {
    id: r.id,
    manager_code: r.manager_code,
    full_name: r.full_name,
    full_name_en: r.full_name_en ?? undefined,
    department: r.department,
    position: r.position ?? undefined,
    avatar_url: r.avatar_url ?? null,
    is_active: toBool(r.is_active),
    dashboard_enabled: toBool(r.dashboard_enabled),
    created_at: r.created_at,
  };
}

export function mapArea(r) {
  return {
    id: r.id,
    area_name: r.area_name,
    area_name_en: r.area_name_en ?? undefined,
    parent_id: r.parent_id ?? null,
    department: r.department,
    is_active: toBool(r.is_active),
  };
}

export function mapTheme(r) {
  return {
    id: r.id,
    theme_name: r.theme_name,
    theme_name_en: r.theme_name_en ?? undefined,
    is_active: toBool(r.is_active),
  };
}

export function mapPlan(r) {
  const theme_ids = splitList(r.theme_ids);
  return {
    id: r.id,
    manager_id: r.manager_id,
    plan_date: r.plan_date,
    plan_time: r.plan_time,
    area_id: r.area_id,
    theme_ids,
    // frontend ยังมีฟิลด์นี้ในชนิดข้อมูล แต่ไม่มีหน้าจอไหนอ่าน
    // จึงคำนวณตอนส่งออกแทนการเก็บซ้ำในฐานข้อมูล (กันหลุด sync)
    theme_id: theme_ids[0] ?? null,
    note: r.note ?? '',
    status: r.status,
    created_at: r.created_at,
  };
}

export function mapRecord(r) {
  return {
    id: r.id,
    plan_id: r.plan_id ?? null,
    manager_id: r.manager_id,
    actual_date: r.actual_date,
    actual_time: r.actual_time,
    actual_area_id: r.actual_area_id,
    theme_ids: splitList(r.theme_ids),
    observation: r.observation ?? '',
    has_issue: toBool(r.has_issue),
    issue_summary: r.issue_summary ?? '',
    photo_urls: splitList(r.photo_urls),
    participant_names: splitList(r.participant_names),
    ci_required: toBool(r.ci_required),
    ci_ticket_no: r.ci_ticket_no ?? '',
    ci_ticket_link: r.ci_ticket_link ?? '',
    completed_at: r.completed_at,
  };
}

export function mapFocus(r) {
  return {
    id: r.id,
    week_start: r.week_start,
    week_end: r.week_end,
    theme_ids: splitList(r.theme_ids),
    message_th: r.message_th ?? '',
    message_en: r.message_en ?? '',
    is_active: toBool(r.is_active),
  };
}

export function mapChange(r) {
  return {
    id: r.id,
    table_name: r.table_name,
    record_id: r.record_id,
    action_type: r.action_type,
    field: r.field ?? undefined,
    old_value: r.old_value ?? null,
    new_value: r.new_value ?? null,
    changed_by: r.changed_by,
    changed_at: r.changed_at,
  };
}

export function mapLogin(r) {
  return {
    id: r.id,
    actor_id: r.actor_id,
    actor_name: r.actor_name,
    role: r.role,
    at: r.at,
    result: r.result,
  };
}

export function mapSettings(r) {
  return {
    weekly_target: r.weekly_target,
    recent_visit_days: r.recent_visit_days,
    company_name: r.company_name,
    plant_name: r.plant_name,
  };
}

/* ── ชิ้นส่วน SQL ที่ใช้ซ้ำ ────────────────────────────────────────────── */

/** แผน + หัวข้อที่ประกอบกลับแล้ว (เรียงตาม sort_order) */
export const PLAN_SELECT = `
  SELECT p.*,
         (SELECT group_concat(pt.theme_id, char(1) ORDER BY pt.sort_order)
            FROM plan_themes pt WHERE pt.plan_id = p.id) AS theme_ids
    FROM gemba_plans p`;

/** บันทึกการเดิน + หัวข้อ + รูป + ผู้ร่วมเดิน */
export const RECORD_SELECT = `
  SELECT r.*,
         (SELECT group_concat(rt.theme_id, char(1) ORDER BY rt.sort_order)
            FROM record_themes rt WHERE rt.record_id = r.id) AS theme_ids,
         (SELECT group_concat(rp.photo_key, char(1) ORDER BY rp.sort_order)
            FROM record_photos rp WHERE rp.record_id = r.id) AS photo_urls,
         (SELECT group_concat(pa.participant_name, char(1) ORDER BY pa.sort_order)
            FROM record_participants pa WHERE pa.record_id = r.id) AS participant_names
    FROM gemba_walk_records r`;

export const FOCUS_SELECT = `
  SELECT f.*,
         (SELECT group_concat(ft.theme_id, char(1))
            FROM focus_themes ft WHERE ft.focus_id = f.id) AS theme_ids
    FROM weekly_focus f`;
