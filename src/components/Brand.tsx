import { cn } from '@/lib/utils';

/** สัดส่วนจริงของไฟล์โลโก้ (public/brand/tenneco-logo.png = 640 × 104) */
const RATIO = 640 / 104;

/**
 * โลโก้ TENNECO — ใช้ไฟล์ขององค์กรตามจริง ไม่วาดใหม่ ไม่เปลี่ยนสีหรือสัดส่วน
 * วางบนแผ่นพื้นขาวเสมอ ในโหมดมืดจึงยังเป็นโลโก้น้ำเงินบนขาวเหมือนต้นฉบับ
 */
export function TennecoLogo({ height = 18, className }: { height?: number; className?: string }) {
  return (
    <span className={cn('logo-plate shrink-0 px-2 py-1.5', className)}>
      <img
        src={`${import.meta.env.BASE_URL}brand/tenneco-logo.png`}
        alt="TENNECO"
        width={Math.round(height * RATIO)}
        height={height}
        className="block"
        style={{ height, width: 'auto' }}
        draggable={false}
      />
    </span>
  );
}
