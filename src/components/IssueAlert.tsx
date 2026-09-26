import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Inbox, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCoreData, useIssueInbox, useSession } from '@/hooks/useData';
import { managerLabel, useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/time';

/** ปัญหาที่ผู้รับเรื่องเห็นแจ้งเตือนไปแล้ว — เก็บแยกรายคนในเครื่อง */
const seenKey = (managerId: string) => `gemba.issues.seen.${managerId}`;

function readSeen(managerId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey(managerId)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** จดว่าเห็นแล้ว — เก็บเฉพาะ id ที่ยังรออยู่ รายการจึงไม่โตไปเรื่อย ๆ */
export function markIssuesSeen(managerId: string, ids: string[]) {
  try {
    localStorage.setItem(seenKey(managerId), JSON.stringify(ids));
  } catch {
    // เก็บไม่ได้ก็แค่เด้งเตือนซ้ำ ไม่เสียหาย
  }
}

/**
 * แจ้งเตือนผู้รับเรื่องที่จุดรวม — มีบันทึกที่พบปัญหาเข้ามาใหม่ให้เด้งขึ้นทันทีที่เปิดแอป
 * (และทุกครั้งที่ซิงก์แล้วเจอเรื่องใหม่) จนกว่าจะกด "ดู" หรือ "ภายหลัง"
 */
export function IssueAlert() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { isOwner, waiting } = useIssueInbox();
  const { managers, pathOf } = useCoreData();
  const navigate = useNavigate();
  const location = useLocation();
  const managerId = session?.manager_id ?? '';
  const [seen, setSeen] = useState<string[]>(() => (managerId ? readSeen(managerId) : []));

  const onInbox = location.pathname.startsWith('/issues');
  // เรื่องที่ผู้รับเรื่องบันทึกเองไม่ต้องเด้งเตือนตัวเอง
  const unseen = waiting.filter((r) => !seen.includes(r.id) && r.manager_id !== managerId);

  // อยู่หน้าจุดรวมอยู่แล้ว = เห็นครบแล้ว ไม่ต้องเด้งซ้ำ
  useEffect(() => {
    if (!isOwner || !onInbox || !unseen.length) return;
    const ids = waiting.map((r) => r.id);
    markIssuesSeen(managerId, ids);
    setSeen(ids);
  }, [isOwner, onInbox, unseen.length, waiting, managerId]);

  if (!isOwner || onInbox || !unseen.length) return null;

  const acknowledge = (go: boolean) => {
    const ids = waiting.map((r) => r.id);
    markIssuesSeen(managerId, ids);
    setSeen(ids);
    if (go) navigate('/issues');
  };

  const newest = [...unseen].sort((a, b) => b.completed_at.localeCompare(a.completed_at)).slice(0, 3);

  return (
    <Dialog open onOpenChange={(o) => !o && acknowledge(false)}>
      <DialogContent
        title={t('issues.alertTitle', { n: unseen.length })}
        description={t('issues.alertHint')}
        footer={
          <>
            <Button variant="outline" className="h-11" onClick={() => acknowledge(false)}>
              {t('issues.later')}
            </Button>
            <Button variant="accent" className="h-11" onClick={() => acknowledge(true)}>
              <Inbox className="h-4 w-4" />
              {t('issues.openInbox')}
            </Button>
          </>
        }
      >
        <ul className="space-y-2">
          {newest.map((r) => {
            const m = managers.find((x) => x.id === r.manager_id);
            return (
              <li key={r.id} className="rounded-md border border-bad/30 bg-bad/[0.05] p-3">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  {pathOf(r.actual_area_id)}
                  <span className="num ml-auto text-[11px] font-normal text-muted-foreground">
                    {formatDate(r.actual_date, lang)} · {r.actual_time}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug">{r.issue_summary || r.observation}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{managerLabel(m, lang)}</p>
              </li>
            );
          })}
        </ul>
        {unseen.length > newest.length ? (
          <p className="mt-2 text-center text-[12px] text-muted-foreground">
            {t('issues.andMore', { n: unseen.length - newest.length })}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
