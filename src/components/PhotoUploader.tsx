import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { PhotoError, deletePhoto, photoUrl, savePhoto } from '@/lib/photos';
import { cn } from '@/lib/utils';

/** แปลงคีย์รูปเป็น URL ที่แสดงผลได้ */
export function usePhotoUrls(keys: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const signature = keys.join('|');

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        keys.map(async (k) => [k, (await photoUrl(k)) ?? ''] as const),
      );
      if (alive) setUrls(Object.fromEntries(entries.filter(([, v]) => v)));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return urls;
}

export function PhotoGrid({ keys, className }: { keys: string[]; className?: string }) {
  const urls = usePhotoUrls(keys);
  const [zoom, setZoom] = useState<string | null>(null);

  if (!keys.length) return null;

  return (
    <>
      <div className={cn('grid grid-cols-3 gap-2 sm:grid-cols-4', className)}>
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => urls[k] && setZoom(urls[k])}
            className="press focusable aspect-square overflow-hidden rounded-md border bg-muted"
          >
            {urls[k] ? (
              <img src={urls[k]} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="grid h-full w-full place-items-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            )}
          </button>
        ))}
      </div>
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        {zoom ? (
          <DialogContent title="" size="lg">
            <img src={zoom} alt="" className="mx-auto max-h-[70dvh] rounded-md object-contain" />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

export function PhotoUploader({
  value,
  onChange,
  max = 6,
}: {
  value: string[];
  onChange: (keys: string[]) => void;
  max?: number;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const urls = usePhotoUrls(value);
  // ค่าล่าสุดเสมอ — ระหว่างรอบีบอัด ผู้ใช้อาจลบ/เพิ่มรูปอื่นไปแล้ว ห้ามใช้ค่าที่จับไว้ตอนเริ่ม
  const latest = useRef(value);
  latest.current = value;

  const full = value.length >= max;
  const disabled = busy || full;

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const room = Math.max(0, max - latest.current.length);
      const picked = files.slice(0, room);
      // ทีละไฟล์แยกกัน — รูปเสียรูปเดียวต้องไม่ทำให้รูปอื่นที่เลือกมาพร้อมกันหายไปด้วย
      const results = await Promise.allSettled(picked.map((f) => savePhoto(f)));
      const keys = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      if (keys.length) onChange([...latest.current, ...keys]);

      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length) {
        const unreadable = failed.some((r) => r.reason instanceof PhotoError && r.reason.reason === 'decode');
        toast(t(unreadable ? 'walk.photoUnreadable' : 'walk.photoFailed', { n: failed.length }), 'error');
      }
      if (files.length > room) toast(t('walk.photoLimit', { max }), 'info');
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []);
    // ล้างค่าทันที เพื่อให้เลือกรูปเดิมซ้ำได้
    e.currentTarget.value = '';
    void handleFiles(files);
  };

  const remove = async (key: string) => {
    onChange(latest.current.filter((k) => k !== key));
    await deletePhoto(key);
  };

  return (
    <div>
      {/*
        ใช้ <label> ครอบ input ไฟล์ แทนการสั่ง .click() บน input ที่ซ่อนด้วย display:none
        เบราว์เซอร์ในแอปแชทและ WebView บางตัวไม่ยอมเปิดกล้อง/แกลเลอรีจากการสั่งด้วยสคริปต์
        แต่การแตะ label ที่ผูกกับ input เป็นพฤติกรรมพื้นฐานที่ทุกตัวรองรับ
      */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <PickButton disabled={disabled} icon={<Camera className="h-4 w-4" />} label={t('walk.camera')}>
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled} onChange={onPick} />
        </PickButton>
        <PickButton disabled={disabled} icon={<ImagePlus className="h-4 w-4" />} label={t('walk.gallery')}>
          <input type="file" accept="image/*" multiple className="sr-only" disabled={disabled} onChange={onPick} />
        </PickButton>
      </div>
      <div className="mt-1.5 flex min-h-[20px] items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('walk.compressing')}
          </>
        ) : (
          <span className="num">
            {value.length}/{max}
            {full ? ' · ' + t('walk.photoFull') : ''}
          </span>
        )}
      </div>

      {value.length ? (
        <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((k) => (
            <div key={k} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              {urls[k] ? (
                <img src={urls[k]} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(k)}
                className="press focusable absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white"
                aria-label={t('common.delete')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-1.5 text-[11px] text-muted-foreground">{t('walk.photoHint')}</p>
    </div>
  );
}

/** ปุ่มเลือกรูป — เป็น <label> ที่ครอบ input ไฟล์ไว้ข้างใน (ดูเหตุผลด้านบน) */
function PickButton({
  disabled,
  icon,
  label,
  children,
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <label
      aria-disabled={disabled}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'md' }),
        'h-11 cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        disabled && 'pointer-events-none opacity-45',
      )}
    >
      {children}
      {icon}
      {label}
    </label>
  );
}
