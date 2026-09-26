import { useMemo, useState } from 'react';
import { Camera, CheckCircle2, Eye, Inbox, Info, MapPin, RotateCcw, Ticket } from 'lucide-react';
import { PageTitle } from '@/components/ManagerShell';
import { ISSUE_STRIPE, IssueStatusBadge } from '@/components/IssueStatus';
import { WalkDetailDialog } from '@/components/WalkDetailDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/field';
import { Avatar, EmptyState, SkeletonList } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { useCoreData, useIssueInbox, useUpdateRecord } from '@/hooks/useData';
import { managerLabel, useI18n } from '@/lib/i18n';
import { diffDays, formatDate, todayISO } from '@/lib/time';
import type { IssueStatus, WalkRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

const TABS: IssueStatus[] = ['open', 'acknowledged', 'closed'];

/**
 * จุดรวมปัญหา — บันทึกการเดินที่ "พบปัญหา" ทุกใบจะเด้งมารวมที่นี่
 * ผู้รับเรื่อง (ตั้งในหน้าตั้งค่า › ระบบ) และผู้ดูแลระบบเปลี่ยนสถานะได้
 * คนอื่นเปิดดูความคืบหน้าได้ แต่แก้สถานะไม่ได้
 */
export default function Issues() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { records, managers, pathOf, isLoading } = useCoreData();
  const { owner, canHandle } = useIssueInbox();
  const updateRecord = useUpdateRecord();
  const [tab, setTab] = useState<IssueStatus>('open');
  const [detail, setDetail] = useState<WalkRecord | null>(null);
  const [closing, setClosing] = useState<WalkRecord | null>(null);
  const [response, setResponse] = useState('');

  const today = todayISO();
  const issues = useMemo(() => records.filter((r) => r.has_issue), [records]);
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((s) => [s, issues.filter((r) => r.issue_status === s).length])) as Record<IssueStatus, number>,
    [issues],
  );
  const list = useMemo(() => {
    const rows = issues.filter((r) => r.issue_status === tab);
    // ที่ยังไม่ปิด: ค้างนานสุดขึ้นก่อน · ที่ปิดแล้ว: ล่าสุดขึ้นก่อน
    const asc = (a: WalkRecord, b: WalkRecord) =>
      a.actual_date.localeCompare(b.actual_date) || a.actual_time.localeCompare(b.actual_time);
    return rows.sort((a, b) => (tab === 'closed' ? -asc(a, b) : asc(a, b)));
  }, [issues, tab]);

  const setStatus = async (r: WalkRecord, status: IssueStatus, issueResponse?: string) => {
    await updateRecord.mutateAsync({
      id: r.id,
      patch: { issue_status: status, ...(issueResponse !== undefined ? { issue_response: issueResponse } : {}) },
    });
    toast(t(`issues.toast_${status}`));
  };

  const openClose = (r: WalkRecord) => {
    setResponse(r.issue_response ?? '');
    setClosing(r);
  };

  const confirmClose = async () => {
    if (!closing) return;
    await setStatus(closing, 'closed', response.trim());
    setClosing(null);
  };

  return (
    <div>
      <PageTitle
        title={t('issues.title')}
        subtitle={owner ? t('issues.ownerLine', { name: managerLabel(owner, lang) }) : t('issues.noOwner')}
      />

      {!canHandle ? (
        <p className="mb-4 flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          {t('issues.readOnly')}
        </p>
      ) : null}

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-md border bg-card p-1" role="tablist">
        {TABS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={cn(
              'press focusable flex h-10 items-center justify-center gap-1.5 rounded-[5px] text-[13px] font-medium',
              tab === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`issues.status_${s}`)}
            <span
              className={cn(
                'num min-w-[20px] rounded-full px-1.5 text-[11px] leading-5',
                tab === s ? 'bg-primary-foreground/20' : s === 'open' && counts.open ? 'bg-bad text-white' : 'bg-muted',
              )}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : list.length ? (
        <div className="space-y-2.5">
          {list.map((r) => {
            const m = managers.find((x) => x.id === r.manager_id);
            const age = diffDays(r.actual_date, today);
            return (
              <article
                key={r.id}
                className={cn(
                  'panel animate-fade-up p-3.5',
                  'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[""]',
                  ISSUE_STRIPE[r.issue_status],
                )}
              >
                <div className="pl-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="flex items-center gap-1 text-[14px] font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      {pathOf(r.actual_area_id)}
                    </span>
                    <IssueStatusBadge status={r.issue_status} />
                    {r.issue_status !== 'closed' ? (
                      <Badge tone={age >= 7 ? 'bad' : 'neutral'}>{t('issues.age', { n: age })}</Badge>
                    ) : null}
                    <span className="num ml-auto text-[11px] text-muted-foreground">
                      {formatDate(r.actual_date, lang)} · {r.actual_time}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">{r.issue_summary || r.observation}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Avatar name={managerLabel(m, lang)} src={m?.avatar_url} seed={m?.id} size={20} />
                      {managerLabel(m, lang)}
                    </span>
                    {r.photo_urls.length ? (
                      <span className="num flex items-center gap-1">
                        <Camera className="h-3.5 w-3.5" />
                        {r.photo_urls.length}
                      </span>
                    ) : null}
                    {r.ci_ticket_no ? (
                      <span className="num flex items-center gap-1 text-accent">
                        <Ticket className="h-3.5 w-3.5" />
                        {r.ci_ticket_no}
                      </span>
                    ) : null}
                  </div>

                  {r.issue_response ? (
                    <div className="mt-2.5 rounded-md border bg-muted/40 px-3 py-2 text-[13px] leading-relaxed">
                      <span className="label-micro mr-1.5">{t('issues.response')}</span>
                      {r.issue_response}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" className="h-10" onClick={() => setDetail(r)}>
                      {t('common.detail')}
                    </Button>
                    {canHandle ? (
                      <div className="ml-auto flex flex-wrap gap-2">
                        {r.issue_status === 'open' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10"
                            disabled={updateRecord.isPending}
                            onClick={() => setStatus(r, 'acknowledged')}
                          >
                            <Eye className="h-4 w-4" />
                            {t('issues.acknowledge')}
                          </Button>
                        ) : null}
                        {r.issue_status !== 'closed' ? (
                          <Button variant="accent" size="sm" className="h-10" onClick={() => openClose(r)}>
                            <CheckCircle2 className="h-4 w-4" />
                            {t('issues.close')}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10"
                            disabled={updateRecord.isPending}
                            onClick={() => setStatus(r, 'open')}
                          >
                            <RotateCcw className="h-4 w-4" />
                            {t('issues.reopen')}
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title={t(`issues.empty_${tab}`)}
          hint={tab === 'open' ? t('issues.emptyHint') : undefined}
        />
      )}

      <WalkDetailDialog record={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} canEdit={false} />

      <Dialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        {closing ? (
          <DialogContent
            title={t('issues.closeTitle')}
            description={`${pathOf(closing.actual_area_id)} · ${formatDate(closing.actual_date, lang)}`}
            footer={
              <>
                <Button variant="outline" className="h-11" onClick={() => setClosing(null)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="accent" className="h-11" onClick={confirmClose} disabled={updateRecord.isPending}>
                  <CheckCircle2 className="h-4 w-4" />
                  {updateRecord.isPending ? t('common.saving') : t('issues.close')}
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-[13px] leading-relaxed">
                {closing.issue_summary || closing.observation}
              </p>
              <Field label={t('issues.response')} hint={`(${t('common.optional')})`}>
                <Textarea
                  autoFocus
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={t('issues.responsePlaceholder')}
                  className="min-h-[96px]"
                />
              </Field>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
