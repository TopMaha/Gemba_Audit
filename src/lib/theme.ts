/** ธีมสี + โหมดสว่าง/มืด — เก็บค่าที่เลือกไว้ในเครื่อง */

export type Accent = 'amber' | 'steel' | 'lime';
export type Mode = 'light' | 'dark';

const ACCENT_KEY = 'gemba.accent';
const MODE_KEY = 'gemba.mode';

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'amber', label: 'Safety Amber', swatch: 'hsl(34 92% 47%)' },
  { id: 'steel', label: 'Steel Blue', swatch: 'hsl(205 62% 40%)' },
  { id: 'lime', label: 'Hi-Vis Lime', swatch: 'hsl(88 58% 38%)' },
];

export function getAccent(): Accent {
  const v = localStorage.getItem(ACCENT_KEY);
  return v === 'steel' || v === 'lime' ? v : 'amber';
}

export function getMode(): Mode {
  const v = localStorage.getItem(MODE_KEY);
  if (v === 'dark' || v === 'light') return v;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(accent: Accent = getAccent(), mode: Mode = getMode()) {
  const root = document.documentElement;
  root.classList.remove('theme-steel', 'theme-lime');
  if (accent !== 'amber') root.classList.add(`theme-${accent}`);
  root.classList.toggle('dark', mode === 'dark');
  localStorage.setItem(ACCENT_KEY, accent);
  localStorage.setItem(MODE_KEY, mode);
}

/** สีประจำตัวจาก id (ใช้กับ avatar และแท็กหัวข้อ) */
export function hueFrom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
