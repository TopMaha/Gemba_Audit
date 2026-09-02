/**
 * ตัวซิงก์ข้อมูลระหว่างเครื่องกับเซิร์ฟเวอร์
 *
 * แนวคิด: หน้าจอทุกหน้าอ่าน–เขียนกับ "สำเนาในเครื่อง" (src/lib/db.ts) เท่านั้น
 * ไฟล์นี้ทำหน้าที่สองอย่างอยู่เบื้องหลัง
 *   pull — ดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์มาทับสำเนาในเครื่อง
 *   push — ส่งงานที่ค้างในคิวขึ้นเซิร์ฟเวอร์ตามลำดับที่ทำไว้
 *
 * ผลคือแอปใช้งานได้ต่อเนื่องแม้เน็ตหลุดกลางคัน ซึ่งเป็นเรื่องปกติในโรงงาน
 * และไม่ต้องแก้หน้าจอสักหน้าเดียว
 */

import { ONLINE_MODE } from './config';
import { hydrate, peek } from './db';
import { ApiError, apiGet, apiPost, apiPut, apiUpload } from './net';
import { LOCAL_PREFIX, getPhotoBlob } from './photos';
import { listQueue, markFailed, queueSize, removeFromQueue, type QueueItem } from './queue';
import type { Area, GembaPlan, LoginHistory, Manager, WalkRecord, WalkTheme, WeeklyFocus, AppSettings } from './types';

export type SyncState = 'offline' | 'idle' | 'syncing' | 'pending' | 'error';

export interface SyncStatus {
  state: SyncState;
  /** จำนวนงานที่ยังไม่ได้ส่งขึ้นเซิร์ฟเวอร์ */
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  online: boolean;
}

let status: SyncStatus = {
  state: ONLINE_MODE ? 'idle' : 'offline',
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};

const listeners = new Set<() => void>();

/** snapshot ต้องเป็น reference เดิมถ้าค่าไม่เปลี่ยน ไม่งั้น useSyncExternalStore จะวนไม่จบ */
export const getSyncStatus = () => status;

export function subscribeSync(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function setStatus(patch: Partial<SyncStatus>) {
  const next = { ...status, ...patch };
  const same =
    next.state === status.state &&
    next.pending === status.pending &&
    next.lastSyncedAt === status.lastSyncedAt &&
    next.lastError === status.lastError &&
    next.online === status.online;
  if (same) return;
  status = next;
  listeners.forEach((fn) => fn());
}

/* ── ดึงข้อมูลจากเซิร์ฟเวอร์มาทับสำเนาในเครื่อง ───────────────────────── */

export async function pull(): Promise<void> {
  if (!ONLINE_MODE) return;

  const [managers, areas, themes, plans, records, focusList, loginHistory, settings] = await Promise.all([
    apiGet<Manager[]>('/api/managers'),
    apiGet<Area[]>('/api/areas'),
    apiGet<WalkTheme[]>('/api/themes'),
    apiGet<GembaPlan[]>('/api/plans?limit=5000'),
    apiGet<WalkRecord[]>('/api/records?limit=5000'),
    apiGet<WeeklyFocus[]>('/api/focus/list'),
    apiGet<LoginHistory[]>('/api/login-history'),
    apiGet<AppSettings>('/api/settings'),
  ]);

  hydrate({
    managers,
    areas,
    walk_themes: themes,
    gemba_plans: plans,
    gemba_walk_records: records,
    weekly_focus: focusList,
    login_history: loginHistory,
    app_settings: settings,
    // superusers เก็บของเดิมไว้ เพราะ API ไม่เปิดให้ดึงรายชื่อ (มีแค่ endpoint ตรวจรหัส)
    superusers: peek((db) => db.superusers),
    change_history: peek((db) => db.change_history),
  });
}

/* ── ส่งงานที่ค้างขึ้นเซิร์ฟเวอร์ ───────────────────────────────────────── */

/**
 * อัปโหลดรูปที่ยังอยู่ในเครื่อง แล้วคืนคีย์ที่เซิร์ฟเวอร์ให้มา
 * คีย์ที่ไม่ได้ขึ้นต้นด้วย local: แปลว่าอัปโหลดไปแล้ว ปล่อยผ่าน
 */
async function uploadPendingPhotos(keys: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const key of keys) {
    if (!key.startsWith(LOCAL_PREFIX)) {
      out.push(key);
      continue;
    }
    const blob = await getPhotoBlob(key);
    if (!blob) continue; // รูปหายไปจากเครื่องแล้ว ข้ามไปไม่ให้ทั้งคิวค้าง
    out.push(await apiUpload(blob));
  }
  return out;
}

/** ส่งงานหนึ่งชิ้น — โยน ApiError ออกไปให้ผู้เรียกตัดสินใจว่าจะหยุดหรือข้าม */
async function pushItem(item: QueueItem): Promise<void> {
  const p = item.payload as Record<string, unknown>;

  switch (item.kind) {
    case 'plan.create':
      await apiPost('/api/plans', p);
      return;
    case 'plan.update':
      await apiPut(`/api/plans/${item.localId}`, p);
      return;

    case 'record.create': {
      const photos = await uploadPendingPhotos((p.photo_urls as string[]) ?? []);
      await apiPost('/api/records', { ...p, photo_urls: photos });
      return;
    }
    case 'record.update': {
      const body = { ...p };
      if (Array.isArray(p.photo_urls)) body.photo_urls = await uploadPendingPhotos(p.photo_urls as string[]);
      await apiPut(`/api/records/${item.localId}`, body);
      return;
    }

    case 'manager.save':
      await (item.localId.startsWith('new:')
        ? apiPost('/api/managers', p)
        : apiPut(`/api/managers/${item.localId}`, p));
      return;
    case 'area.save':
      await (item.localId.startsWith('new:') ? apiPost('/api/areas', p) : apiPut(`/api/areas/${item.localId}`, p));
      return;
    case 'theme.save':
      await (item.localId.startsWith('new:') ? apiPost('/api/themes', p) : apiPut(`/api/themes/${item.localId}`, p));
      return;

    case 'settings.save':
      await apiPut('/api/settings', p);
      return;
    case 'focus.save':
      await (item.localId.startsWith('new:') ? apiPost('/api/focus', p) : apiPut(`/api/focus/${item.localId}`, p));
      return;
  }
}

/**
 * ส่งคิวทั้งหมดตามลำดับ
 *
 * เจอเน็ตหลุดให้หยุดทันที เก็บที่เหลือไว้รอบหน้า (ลำดับสำคัญ)
 * แต่ถ้าเซิร์ฟเวอร์ปฏิเสธเพราะข้อมูลผิด (4xx) ให้ทิ้งงานชิ้นนั้นแล้วไปต่อ
 * ไม่งั้นงานเสียชิ้นเดียวจะขวางคิวทั้งหมดตลอดไป
 */
async function pushAll(): Promise<{ sent: number; dropped: number }> {
  let sent = 0;
  let dropped = 0;

  for (const item of await listQueue()) {
    try {
      await pushItem(item);
      await removeFromQueue(item.seq!);
      sent++;
    } catch (e) {
      const err = e as ApiError;
      // 401/403 = สิทธิ์ยังไม่พร้อม (เช่นเซสชันผู้ดูแลหมดอายุระหว่างที่งานค้างคิว)
      // ไม่ใช่ข้อมูลผิด ห้ามทิ้ง ไม่งั้นงานที่ผู้ใช้เห็นว่าบันทึกแล้วจะหายเงียบ ๆ
      // แล้วโดน pull() รอบถัดไปทับกลับเป็นค่าเก่า เก็บไว้รอจนกว่าจะเข้าสู่ระบบใหม่
      if (err.isOffline || err.status >= 500 || err.status === 401 || err.status === 403) {
        await markFailed(item, err.message);
        throw err; // เน็ต สิทธิ์ หรือเซิร์ฟเวอร์มีปัญหา หยุดทั้งรอบ
      }
      // ข้อมูลชิ้นนี้เซิร์ฟเวอร์ไม่รับ — ทิ้งไปเพื่อไม่ให้ขวางคิว
      console.warn('ทิ้งงานที่ซิงก์ไม่ได้', item.kind, item.localId, err.message);
      await removeFromQueue(item.seq!);
      dropped++;
    }
  }
  return { sent, dropped };
}

/* ── รอบซิงก์ ───────────────────────────────────────────────────────────── */

let running = false;
/** ให้ TanStack Query รู้ว่าข้อมูลเปลี่ยน จะได้โหลดหน้าจอใหม่ */
let onChanged: (() => void) | null = null;

export function setSyncListener(fn: () => void) {
  onChanged = fn;
}

/** ซิงก์หนึ่งรอบ: ส่งของค้างขึ้นก่อน แล้วค่อยดึงของใหม่ลงมา */
export async function syncNow(): Promise<void> {
  if (!ONLINE_MODE || running) return;
  running = true;
  setStatus({ state: 'syncing', lastError: null });

  try {
    const { sent } = await pushAll();
    await pull();
    setStatus({
      state: 'idle',
      pending: await queueSize(),
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
      online: true,
    });
    if (sent > 0 || onChanged) onChanged?.();
  } catch (e) {
    const err = e as ApiError;
    const pending = await queueSize();
    setStatus({
      state: err.isOffline ? 'offline' : 'error',
      pending,
      lastError: err.message,
      online: err.isOffline ? false : status.online,
    });
  } finally {
    running = false;
    if (status.state === 'idle' && status.pending > 0) setStatus({ state: 'pending' });
  }
}

/** เรียกหลังเขียนข้อมูลลงคิว เพื่ออัปเดตตัวเลข "ยังไม่ซิงก์" ให้เห็นทันที */
export async function refreshPending(): Promise<void> {
  const pending = await queueSize();
  setStatus({ pending, state: pending > 0 && status.state === 'idle' ? 'pending' : status.state });
}

let started = false;

/** เริ่มระบบซิงก์ — เรียกครั้งเดียวตอนแอปบูต */
export function startSync(): void {
  if (started || !ONLINE_MODE) return;
  started = true;

  window.addEventListener('online', () => {
    setStatus({ online: true });
    void syncNow();
  });
  window.addEventListener('offline', () => setStatus({ online: false, state: 'offline' }));

  // กลับมาที่แท็บแล้วซิงก์ให้อัตโนมัติ
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });

  // ลองส่งของค้างเป็นระยะ เผื่อสัญญาณกลับมาโดยที่เบราว์เซอร์ไม่แจ้ง event
  setInterval(() => {
    if (status.pending > 0 || status.state === 'offline' || status.state === 'error') void syncNow();
  }, 60_000);

  void syncNow();
}
