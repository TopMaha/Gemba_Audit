import { Check } from 'lucide-react';
import { areaLabel } from '@/lib/areaTree';
import { useI18n } from '@/lib/i18n';
import type { Area } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * เลือกพื้นที่ — โรงงานมีพื้นที่เดินแค่ 6 แห่ง (VSM1–4 · QC · OFFICE)
 * จึงวางเป็นปุ่มให้แตะเลือกได้ในครั้งเดียว ไม่ต้องเปิดหน้าต่างค้นหา
 *
 * พื้นที่ที่ถูกปิดใช้งานแล้วจะไม่แสดง ยกเว้นเป็นค่าที่เลือกอยู่
 * (เช่นแก้แผนเก่าที่ผูกกับพื้นที่ชุดเดิม) เพื่อให้ผู้ใช้ยังเห็นว่าเลือกอะไรไว้
 */
export function AreaPicker({
  areas,
  value,
  onChange,
}: {
  areas: Area[];
  value: string | null;
  onChange: (areaId: string) => void;
}) {
  const { lang } = useI18n();
  const list = areas.filter((a) => a.is_active || a.id === value);

  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {list.map((a) => {
        const on = a.id === value;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(a.id)}
            className={cn(
              'press focusable relative flex min-h-[48px] items-center justify-center rounded-md border px-2 py-2 text-center',
              on
                ? 'border-accent bg-accent text-accent-foreground shadow-panel'
                : 'bg-card text-foreground hover:border-accent/60 hover:bg-accent/5',
              !a.is_active && 'opacity-60',
            )}
          >
            {on ? <Check className="absolute right-1 top-1 h-3 w-3" aria-hidden /> : null}
            <span className="text-[13px] font-semibold leading-tight tracking-wide">{areaLabel(a, lang)}</span>
          </button>
        );
      })}
    </div>
  );
}
