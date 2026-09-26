import type { Area } from './types';
import type { Lang } from './time';
import { AREA_ORDER } from './roster';

export function areaLabel(a: Pick<Area, 'area_name' | 'area_name_en'>, lang: Lang): string {
  return lang === 'en' ? a.area_name_en || a.area_name : a.area_name;
}

/**
 * เรียงพื้นที่ตามลำดับของโรงงาน (VSM1–4 · QC · OFFICE)
 * ถ้าเรียงตามตัวอักษร OFFICE จะขึ้นก่อน VSM1 ซึ่งไม่ตรงกับที่หน้างานคุ้นเคย
 * พื้นที่ที่ผู้ดูแลเพิ่มเองภายหลังจะต่อท้ายตามชื่อ
 */
export function sortAreas(areas: Area[], lang: Lang = 'th'): Area[] {
  const rank = (a: Area) => {
    const i = AREA_ORDER.indexOf(a.id);
    return i < 0 ? AREA_ORDER.length : i;
  };
  return [...areas].sort(
    (a, b) => rank(a) - rank(b) || areaLabel(a, lang).localeCompare(areaLabel(b, lang), 'th', { numeric: true }),
  );
}

/** เส้นทางเต็ม เช่น 'VSM1 › ไลน์ประกอบ A' (พื้นที่ระดับบนสุดจะได้ชื่อตัวเอง) */
export function fullPath(areas: Area[], areaId: string, lang: Lang = 'th'): string {
  const byId = new Map(areas.map((a) => [a.id, a]));
  const parts: string[] = [];
  let cur = byId.get(areaId);
  let guard = 0;
  while (cur && guard++ < 12) {
    parts.unshift(areaLabel(cur, lang));
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return parts.join(' › ');
}

/** id ของตัวเองและลูกหลานทั้งหมด */
export function descendantIds(areas: Area[], id: string): string[] {
  const out = [id];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    areas.filter((a) => a.parent_id === cur).forEach((a) => (out.push(a.id), stack.push(a.id)));
  }
  return out;
}
