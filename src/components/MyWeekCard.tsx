import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Footprints, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { BandBar } from '@/components/ui/misc';
import { useCoreData, useSession, useSettings } from '@/hooks/useData';
import { walkerWeek, type DayStatus } from '@/lib/calc';
import { useI18n, type TKey } from '@/lib/i18n';
import { dowLabels, endOfWeek, rangeDays, startOfWeek, todayISO } from '@/lib/time';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<DayStatus, string> = {
  done: 'border-ok/40 bg-ok/10',
  missed: 'border-bad/50 bg-bad/10',
  due: 'border-dashed border-accent/70',
  extra: 'border-accent/30 bg-accent/[0.06]',
  none: 'border-transparent bg-muted/50',
};

function StatusIcon({ status }: { status: DayStatus }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />;
  if (status === 'missed') return <XCircle className="h-4 w-4 text-bad" aria-hidden />;
  if (status === 'due') return <Circle className="h-4 w-4 text-accent" aria-hidden />;
  if (status === 'extra') return <Plus className="h-4 w-4 text-accent" aria-hidden />;
  return <span className="h-4 w-4" aria-hidden />;
}

/**
 * ตารางเดินของฉันสัปดาห์นี้ — แสดงเฉพาะคนที่ผู้ดูแลกำหนดให้ต้องเดิน Gemba
 * บอกว่าวันไหนเป็นวันประจำ เดินแล้วหรือยัง และยังขาดอีกกี่ครั้งถึงเป้า
 */
export function MyWeekCard() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { managers, records } = useCoreData();
  const { data: settings } = useSettings();

  const me = managers.find((m) => m.id === session?.manager_id);
  if (!me?.is_walker) return null;

  const today = todayISO();
  const days = rangeDays(startOfWeek(today), endOfWeek(today));
  const week = walkerWeek(me, records, days, settings?.weekly_target ?? 1, today);
  const labels = dowLabels(lang);
  const pct = week.target ? Math.min(100, Math.floor((week.done / week.target) * 100)) : 0;
  const todayItem = week.days.find((d) => d.date === today);

  return (
    <Card className="mb-4" accent>
      <CardHeader
        title={t('walkers.myWeek')}
        hint={
          me.walk_days.length
            ? t('walkers.myDays', { days: [...me.walk_days].sort((a, b) => a - b).map((i) => labels[i]).join(' ') })
            : t('walkers.noDays', { n: week.target })
        }
        right={
          <span className="num text-sm font-semibold">
            {week.done}/{week.target}
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">{t('common.times')}</span>
          </span>
        }
      />
      <CardBody className="space-y-3 py-3">
        <ol className="grid grid-cols-7 gap-1.5">
          {week.days.map((d, i) => (
            <li
              key={d.date}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border py-1.5',
                STATUS_STYLE[d.status],
                d.date === today && 'ring-2 ring-accent ring-offset-1 ring-offset-card',
              )}
              aria-label={`${labels[i]} ${Number(d.date.slice(8, 10))} · ${t(`walkers.status_${d.status}` as TKey)}`}
            >
              <span className="text-[10px] text-muted-foreground">{labels[i]}</span>
              <span className="num text-[13px] font-semibold leading-none">{Number(d.date.slice(8, 10))}</span>
              <StatusIcon status={d.status} />
            </li>
          ))}
        </ol>
        <BandBar pct={pct} showLabel />
        {todayItem?.status === 'due' ? (
          <Button variant="accent" className="h-11 w-full" asChild>
            <Link to="/walk/new">
              <Footprints className="h-4 w-4" />
              {t('walkers.walkToday')}
            </Link>
          </Button>
        ) : null}
      </CardBody>
    </Card>
  );
}
