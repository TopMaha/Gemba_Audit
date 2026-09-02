import { buildSeedDb } from './seed';
import type { Db } from './types';

/**
 * ── ชั้นเก็บข้อมูล (Data layer) ───────────────────────────────
 * เวอร์ชันนี้เก็บลง localStorage ของเครื่อง เพื่อให้แอปใช้งานได้จริงทันที
 * โดยยังไม่ต้องต่อระบบหลังบ้าน  โครงตารางตรงตามสเปกทุกคอลัมน์
 *
 * เมื่อจะต่อ backend จริง (Lovable Cloud / Supabase / REST):
 *   แก้เฉพาะไฟล์นี้กับ api.ts ให้ยิง HTTP แทน — ส่วนหน้าจอไม่ต้องแก้
 */

/**
 * v2 = ขึ้นระบบจริง ทะเบียนพนักงานจาก PSIF ไม่มีข้อมูลตัวอย่างแล้ว
 * v3 = เพิ่มสิทธิ์เข้าใช้งานรายคน (can_login) — สำเนาชุด v2 ไม่มีฟิลด์นี้
 *      ถ้าไม่ขึ้นเวอร์ชัน เครื่องที่ค้าง v2 จะอ่านได้เป็น undefined แล้วล็อกอินไม่ได้ทั้งหมด
 *
 * การเปลี่ยนเลขนี้ทำให้เครื่องที่ยังค้างสำเนาชุดเก่าเริ่มใหม่จากทะเบียนตั้งต้น
 */
const KEY = 'gemba.db.v3';
const LEGACY_KEYS = ['gemba.db.v1', 'gemba.db.v2'];
const LATENCY = 90; // จำลองดีเลย์เครือข่าย เพื่อให้เห็น loading state จริง

let cache: Db | null = null;
const listeners = new Set<() => void>();

function fresh(): Db {
  // ทิ้งข้อมูลตัวอย่างชุดเก่าที่ยังค้างอยู่ในเครื่อง ไม่งั้นกินพื้นที่ไปเปล่า ๆ
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  const db = buildSeedDb();
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

function read(): Db {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Db) : fresh();
  } catch {
    cache = fresh();
  }
  return cache;
}

function persist() {
  if (cache) localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((fn) => fn());
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** อ่านข้อมูล (async เพื่อให้พฤติกรรมเหมือนเรียก API จริง) */
export async function query<T>(fn: (db: Db) => T): Promise<T> {
  await sleep(LATENCY);
  return structuredClone(fn(read()));
}

/** อ่านแบบทันที ใช้เฉพาะกรณีที่ต้องใช้ค่าใน render loop */
export function peek<T>(fn: (db: Db) => T): T {
  return fn(read());
}

/** เขียนข้อมูล */
export async function mutate<T>(fn: (db: Db) => T): Promise<T> {
  await sleep(LATENCY);
  const db = read();
  const result = fn(db);
  persist();
  return structuredClone(result);
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** ล้างสำเนาในเครื่องแล้วเริ่มใหม่จากทะเบียนตั้งต้น (ไม่กระทบข้อมูลบนเซิร์ฟเวอร์) */
export async function resetDb() {
  localStorage.removeItem(KEY);
  cache = null;
  read();
  persist();
}

/** ล้างข้อมูลการเดินทั้งหมด แต่เก็บผู้ใช้/พื้นที่/หัวข้อไว้ (ใช้ตอนขึ้นระบบจริง) */
export async function clearTransactions() {
  return mutate((db) => {
    db.gemba_plans = [];
    db.gemba_walk_records = [];
    db.change_history = [];
  });
}

export async function exportDb(): Promise<string> {
  return JSON.stringify(read(), null, 2);
}

/**
 * ทับสำเนาในเครื่องด้วยข้อมูลจากเซิร์ฟเวอร์ (ใช้โดย src/lib/sync.ts)
 * เขียนทับเฉพาะตารางที่ส่งมา ตารางอื่นคงของเดิมไว้
 */
export function hydrate(patch: Partial<Db>) {
  const db = read();
  cache = { ...db, ...patch };
  persist();
}

export async function importDb(json: string) {
  const parsed = JSON.parse(json) as Db;
  if (!parsed.managers || !parsed.areas) throw new Error('ไฟล์ข้อมูลไม่ถูกต้อง');
  cache = parsed;
  persist();
}
