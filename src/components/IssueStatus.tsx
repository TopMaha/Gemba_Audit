import { CheckCircle2, CircleDot, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import type { IssueStatus } from '@/lib/types';

const TONE = { open: 'bad', acknowledged: 'warn', closed: 'ok' } as const;
const ICON = { open: CircleDot, acknowledged: Eye, closed: CheckCircle2 } as const;

/** ป้ายสถานะปัญหา — มีไอคอนกำกับ ไม่ใช้สีอย่างเดียวบอกความหมาย */
export function IssueStatusBadge({ status, size }: { status: IssueStatus; size?: 'sm' | 'md' }) {
  const { t } = useI18n();
  const Icon = ICON[status];
  return (
    <Badge tone={TONE[status]} size={size}>
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {t(`issues.status_${status}`)}
    </Badge>
  );
}

/** สีแถบข้างการ์ดตามสถานะ (ใช้กับ before:bg-*) */
export const ISSUE_STRIPE: Record<IssueStatus, string> = {
  open: 'before:bg-bad',
  acknowledged: 'before:bg-warn',
  closed: 'before:bg-ok',
};
