/**
 * ธีมสี — ใช้ธีมองค์กร TENNECO (น้ำเงิน–ขาว) ตายตัว ไม่ให้เลือกสีเน้นเองแล้ว
 * ผู้ใช้สลับได้แค่โหมดสว่าง/มืด (มืด = โทนกรมท่า สำหรับกะกลางคืน)
 */

export type Mode = 'light' | 'dark';

/**
 * คีย์ใหม่โดยตั้งใจ — ค่าเดิม (gemba.mode) เคยตามโหมดของเครื่องอัตโนมัติ
 * เครื่องที่ตั้งมืดไว้จึงค้างธีมมืดชุดเก่า ขึ้นคีย์ใหม่ให้ทุกคนเริ่มที่น้ำเงิน–ขาวก่อน
 */
const MODE_KEY = 'gemba.mode.v2';
const LEGACY_KEYS = ['gemba.mode', 'gemba.accent'];

export function getMode(): Mode {
  return localStorage.getItem(MODE_KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(mode: Mode = getMode()) {
  const root = document.documentElement;
  root.classList.remove('theme-steel', 'theme-lime');
  root.classList.toggle('dark', mode === 'dark');
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  localStorage.setItem(MODE_KEY, mode);
}

/** สีประจำตัวจาก id (ใช้กับ avatar และแท็กหัวข้อ) */
export function hueFrom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
