/**
 * รูปภาพ — บีบอัดในเครื่องก่อนเก็บ เพื่อประหยัดพื้นที่และเน็ตของผู้ใช้
 * เก็บไฟล์จริงไว้ใน IndexedDB (แทน storage bucket ของหลังบ้าน)
 * ค่าที่บันทึกลงเรคคอร์ดคือคีย์รูปแบบ 'local:<id>'
 */

import { apiFetchPhoto } from './net';

const DB_NAME = 'gemba-photos';
const STORE = 'photos';
const PREFIX = 'local:';

/** คีย์ที่ขึ้นต้นด้วยค่านี้คือรูปที่ยังอยู่แค่ในเครื่อง ยังไม่ได้อัปโหลดขึ้น R2 */
export const LOCAL_PREFIX = PREFIX;

/** ชนิดไฟล์ที่ Worker รับ — ถ้าย่อรูปไม่ได้แต่เป็นชนิดนี้ ส่งไฟล์เดิมไปได้เลย */
const SERVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
/** ต้องไม่เกิน MAX_PHOTO_BYTES ของ Worker (worker/src/index.js) */
const MAX_RAW_BYTES = 8 * 1024 * 1024;

export type PhotoErrorReason = 'decode' | 'storage';

/** แนบรูปไม่สำเร็จ — หน้าจอใช้ reason เลือกข้อความที่บอกผู้ใช้ว่าต้องทำอะไรต่อ */
export class PhotoError extends Error {
  reason: PhotoErrorReason;
  constructor(reason: PhotoErrorReason, fileName: string) {
    super(`${reason}: ${fileName}`);
    this.name = 'PhotoError';
    this.reason = reason;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * ที่เก็บสำรองในหน่วยความจำ — ใช้เมื่อ IndexedDB ใช้ไม่ได้
 * (โหมดไม่ระบุตัวตน หรือเบราว์เซอร์ในแอปแชทบางตัว)
 * รูปยังแนบและซิงก์ขึ้นเซิร์ฟเวอร์ได้ตามปกติ แค่จะหายถ้าปิดแอปก่อนซิงก์เสร็จ
 */
const memory = new Map<string, Blob>();

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/**
 * ถอดรหัสรูปให้วาดลง canvas ได้ — ลองหลายทาง เพราะแต่ละเบราว์เซอร์รองรับไม่เท่ากัน
 * ของเดิมใช้ createImageBitmap ทางเดียว เจอเบราว์เซอร์ที่ไม่รองรับหรือไฟล์ HEIC
 * ก็ล้มเงียบ ๆ ผู้ใช้กดแนบรูปแล้วไม่มีอะไรเกิดขึ้นเลย
 */
async function decode(file: Blob): Promise<Decoded> {
  // 1) createImageBitmap — เร็วสุด และหมุนตาม EXIF ให้ (รูปแนวตั้งจากมือถือจะไม่ตะแคง)
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close?.() };
    } catch {
      // ไปลองทางถัดไป
    }
  }

  // 2) <img> — Safari รุ่นเก่า เบราว์เซอร์ในแอป และ HEIC บน iPhone ถอดได้ทางนี้
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await (typeof img.decode === 'function'
      ? img.decode()
      : new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('image load failed'));
        }));
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** บีบอัดรูป: ย่อด้านยาวสุดไม่เกิน maxDim และแปลงเป็น JPEG */
export async function compressImage(file: File, maxDim = 1400, quality = 0.72): Promise<Blob> {
  // ย่อไม่ได้ แต่เซิร์ฟเวอร์รับไฟล์เดิมได้ — ดีกว่าให้ผู้ใช้แนบรูปไม่ได้เลย
  const fallback = () => {
    if (SERVER_TYPES.has(file.type) && file.size <= MAX_RAW_BYTES) return file;
    throw new PhotoError('decode', file.name);
  };

  let img: Decoded;
  try {
    img = await decode(file);
  } catch {
    return fallback();
  }

  try {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback();
    // พื้นขาวรองไว้ก่อน รูป PNG โปร่งใสแปลงเป็น JPEG แล้วจะได้ไม่กลายเป็นพื้นดำ
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img.source, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob ?? fallback();
  } catch (e) {
    if (e instanceof PhotoError) throw e;
    return fallback();
  } finally {
    img.release();
  }
}

export async function savePhoto(file: File): Promise<string> {
  const blob = await compressImage(file);
  const key = `${PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      // พื้นที่เต็มจะมาทาง abort ไม่ใช่ error
      tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
    });
  } catch {
    memory.set(key, blob);
  }
  return key;
}

const urlCache = new Map<string, string>();

export async function photoUrl(key: string): Promise<string | null> {
  if (urlCache.has(key)) return urlCache.get(key)!;

  // คีย์ที่ไม่ใช่ของในเครื่อง = อยู่บน R2 ต้องดึงผ่าน API เพราะต้องแนบโทเคน
  // (ใส่ใน <img src> ตรง ๆ ไม่ได้ เบราว์เซอร์ไม่ส่ง header ให้)
  if (!key.startsWith(PREFIX)) {
    const remote = await apiFetchPhoto(key);
    if (!remote) return null;
    const remoteUrl = URL.createObjectURL(remote);
    urlCache.set(key, remoteUrl);
    return remoteUrl;
  }

  const blob = await getPhotoBlob(key);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

/** อ่านไฟล์รูปจากเครื่อง — ใช้ตอนแสดงผล และตอนซิงก์เพื่ออัปโหลดขึ้น R2 */
export async function getPhotoBlob(key: string): Promise<Blob | null> {
  if (!key.startsWith(PREFIX)) return null;
  const inMemory = memory.get(key);
  if (inMemory) return inMemory;
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deletePhoto(key: string) {
  const cached = urlCache.get(key);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(key);
  }
  if (!key.startsWith(PREFIX)) return;
  memory.delete(key);
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // IndexedDB ใช้ไม่ได้ ก็ไม่มีอะไรให้ลบ
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
