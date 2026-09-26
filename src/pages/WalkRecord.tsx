import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Inbox, Plus, RotateCcw, Ticket, X, Zap } from 'lucide-react';
import { PageTitle } from '@/components/ManagerShell';
import { AreaPicker } from '@/components/AreaPicker';
import { PhotoUploader } from '@/components/PhotoUploader';
import { ThemeBadges } from '@/components/ThemeBadges';
import { ThemePicker } from '@/components/ThemePicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { SwitchRow } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { useCoreData, useCreateRecord, useIssueInbox, useSession, useWeeklyFocus } from '@/hooks/useData';
import { managerLabel, useI18n } from '@/lib/i18n';
import { deletePhoto } from '@/lib/photos';
import { formatDate, nowHHMM, todayISO } from '@/lib/time';

/**
 * ร่างบันทึกที่ยังไม่ได้กดบันทึก — เก็บไว้ในเครื่องทุกครั้งที่พิมพ์/แนบรูป
 *
 * มือถือ Android ที่แรมน้อยมักปิดแท็บเบราว์เซอร์ทิ้งระหว่างเปิดแอปกล้อง
 * พอถ่ายเสร็จกลับมา หน้าโหลดใหม่ ข้อความและรูปที่กรอกไว้หายหมด
 * (ผู้ใช้เห็นว่า "ถ่ายรูปแล้วไม่ขึ้น") ร่างนี้ทำให้กลับมาแล้วทุกอย่างยังอยู่
 * ตัวไฟล์รูปอยู่ใน IndexedDB อยู่แล้ว ร่างจึงเก็บแค่คีย์ของรูป
 */
interface WalkDraft {
  date: string;
  time: string;
  areaId: string | null;
  themeIds: string[];
  observation: string;
  hasIssue: boolean;
  issueSummary: string;
  photos: string[];
  participants: string[];
  ciNo: string;
  ciLink: string;
  savedAt: number;
}

/** ร่างที่ค้างนานเกินหนึ่งวันไม่น่าใช่งานเดียวกันแล้ว ทิ้งไป */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

function readDraft(key: string): WalkDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as WalkDraft;
    if (Date.now() - d.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ที่เก็บในเครื่องใช้ไม่ได้ ก็ไม่มีร่างให้ลบ
  }
}

export default function WalkRecordPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { plans, themes, areas, pathOf } = useCoreData();
  const { data: focus } = useWeeklyFocus();
  const { owner } = useIssueInbox();
  const createRecord = useCreateRecord();

  const plan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const isAdhoc = planId === 'new' || !plan;

  const draftKey = `gemba.walkDraft.${session?.manager_id ?? '-'}.${planId ?? 'new'}`;
  const [restored] = useState(() => readDraft(draftKey));
  const [showRestored, setShowRestored] = useState(!!restored);

  const [date, setDate] = useState(restored?.date ?? todayISO());
  const [time, setTime] = useState(restored?.time ?? nowHHMM());
  const [areaId, setAreaId] = useState<string | null>(restored?.areaId ?? null);
  const [themeIds, setThemeIds] = useState<string[]>(restored?.themeIds ?? []);
  const [observation, setObservation] = useState(restored?.observation ?? '');
  const [hasIssue, setHasIssue] = useState(restored?.hasIssue ?? false);
  const [issueSummary, setIssueSummary] = useState(restored?.issueSummary ?? '');
  const [photos, setPhotos] = useState<string[]>(restored?.photos ?? []);
  const [participants, setParticipants] = useState<string[]>(restored?.participants ?? []);
  const [participantDraft, setParticipantDraft] = useState('');
  const [ciNo, setCiNo] = useState(restored?.ciNo ?? '');
  const [ciLink, setCiLink] = useState(restored?.ciLink ?? '');
  const [error, setError] = useState<string | null>(null);

  // ค่าจากแผนใส่ให้แค่ครั้งแรก — ของเดิมใส่ซ้ำทุกครั้งที่ซิงก์โหลดแผนใหม่
  // ผู้ใช้ที่เปลี่ยนพื้นที่ไปแล้วจะโดนดีดกลับเป็นพื้นที่ตามแผนเองกลางคัน
  const planApplied = useRef(!!restored);
  useEffect(() => {
    if (plan && !planApplied.current) {
      planApplied.current = true;
      setAreaId(plan.area_id);
      setThemeIds(plan.theme_ids);
    }
  }, [plan]);

  // เก็บร่างทุกครั้งที่มีการเปลี่ยนแปลง — เฉพาะเมื่อผู้ใช้กรอกอะไรไปแล้วจริง ๆ
  const dirty = Boolean(observation.trim() || photos.length || participants.length || issueSummary.trim() || ciNo || hasIssue);
  useEffect(() => {
    if (!dirty) return;
    const draft: WalkDraft = {
      date, time, areaId, themeIds, observation, hasIssue, issueSummary, photos, participants, ciNo, ciLink,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ที่เก็บเต็มหรือถูกปิด — ยังใช้งานต่อได้ แค่ไม่มีร่างสำรอง
    }
  }, [dirty, draftKey, date, time, areaId, themeIds, observation, hasIssue, issueSummary, photos, participants, ciNo, ciLink]);

  const discardDraft = () => {
    clearDraft(draftKey);
    photos.forEach((k) => void deletePhoto(k));
    setObservation('');
    setHasIssue(false);
    setIssueSummary('');
    setPhotos([]);
    setParticipants([]);
    setCiNo('');
    setCiLink('');
    setDate(todayISO());
    setTime(nowHHMM());
    if (plan) {
      setAreaId(plan.area_id);
      setThemeIds(plan.theme_ids);
    } else {
      setAreaId(null);
      setThemeIds([]);
    }
    setShowRestored(false);
  };

  const addParticipant = () => {
    const name = participantDraft.trim();
    if (!name) return;
    setParticipants((p) => [...new Set([...p, name])]);
    setParticipantDraft('');
  };

  const submit = async () => {
    if (!session) return;
    if (!observation.trim()) {
      setError(t('walk.needObservation'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!areaId) return setError(t('plan.pickArea'));
    if (!themeIds.length) return setError(t('plan.pickTheme'));

    await createRecord.mutateAsync({
      plan_id: plan?.id ?? null,
      manager_id: session.manager_id,
      actual_date: date,
      actual_time: time,
      actual_area_id: areaId,
      theme_ids: themeIds,
      observation: observation.trim(),
      has_issue: hasIssue,
      issue_summary: hasIssue ? issueSummary.trim() : '',
      photo_urls: photos,
      participant_names: participants,
      ci_required: hasIssue && !!ciNo,
      ci_ticket_no: ciNo,
      ci_ticket_link: ciLink,
    });
    clearDraft(draftKey);
    toast(t('walk.done'));
    // พบปัญหา = ส่งเข้าจุดรวมอัตโนมัติ บอกให้ผู้บันทึกรู้ว่าเรื่องไปถึงใคร
    if (hasIssue) {
      toast(owner ? t('issues.sentTo', { name: managerLabel(owner, lang) }) : t('issues.sentToInbox'), 'info');
    }
    navigate('/history');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Button>

      <PageTitle
        title={t('walk.title')}
        subtitle={isAdhoc ? t('walk.adhoc') : undefined}
        right={isAdhoc ? <Badge tone="steel" size="md"><Zap className="h-3 w-3" />{t('status.adhoc')}</Badge> : null}
      />

      {showRestored ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-md border border-accent/40 bg-accent/[0.07] px-3 py-2.5" role="status">
          <RotateCcw className="h-4 w-4 shrink-0 text-accent" />
          <p className="min-w-0 flex-1 text-[13px]">{t('walk.draftRestored')}</p>
          <Button variant="ghost" size="sm" onClick={discardDraft}>
            {t('walk.draftDiscard')}
          </Button>
        </div>
      ) : null}

      {plan ? (
        <Card className="mb-4" accent>
          <CardHeader
            title={t('walk.planInfo')}
            right={<span className="num text-[11px] text-muted-foreground">{formatDate(plan.plan_date, lang)} · {plan.plan_time}</span>}
          />
          <CardBody className="py-3">
            <p className="text-[13px] font-medium">{pathOf(plan.area_id)}</p>
            <ThemeBadges ids={plan.theme_ids} themes={themes} highlight={focus?.theme_ids ?? []} className="mt-2" />
            {plan.note ? <p className="mt-2 text-[12px] text-muted-foreground">{plan.note}</p> : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-4">
        <Card>
          <CardHeader title={t('walk.actual')} />
          <CardBody className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('common.date')}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label={t('common.time')}>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>
            <Field label={t('common.area')} required>
              <AreaPicker areas={areas} value={areaId} onChange={setAreaId} />
            </Field>
            {isAdhoc ? (
              <Field label={t('plan.pickTheme')} required>
                <ThemePicker themes={themes} value={themeIds} onChange={setThemeIds} recommended={focus?.theme_ids ?? []} />
              </Field>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('walk.observation')} hint={t('walk.observationPlaceholder')} />
          <CardBody className="space-y-3.5">
            <Textarea
              value={observation}
              onChange={(e) => (setObservation(e.target.value), setError(null))}
              placeholder={t('walk.observationPlaceholder')}
              className="min-h-[140px]"
            />
            {error ? <p className="text-[12px] text-bad">{error}</p> : null}

            <div className="rounded-md border p-3">
              <SwitchRow label={t('walk.hasIssue')} checked={hasIssue} onCheckedChange={setHasIssue} />
              {hasIssue ? (
                <div className="mt-3 space-y-3">
                  <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                    <Inbox className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    {owner
                      ? t('issues.willSendTo', { name: managerLabel(owner, lang) })
                      : t('issues.willSendToInbox')}
                  </p>
                  <Textarea
                    value={issueSummary}
                    onChange={(e) => setIssueSummary(e.target.value)}
                    placeholder={t('walk.issuePlaceholder')}
                    className="min-h-[80px]"
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label={<span className="flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5 text-accent" />{t('walk.ciNo')}</span>}>
                      <Input value={ciNo} onChange={(e) => setCiNo(e.target.value)} placeholder="CI-2601" />
                    </Field>
                    <Field label={t('walk.ciLink')}>
                      <Input value={ciLink} onChange={(e) => setCiLink(e.target.value)} placeholder="https://…" />
                    </Field>
                  </div>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('walk.photos')} />
          <CardBody>
            <PhotoUploader value={photos} onChange={setPhotos} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('walk.participants')} />
          <CardBody>
            <div className="flex gap-2">
              <Input
                value={participantDraft}
                onChange={(e) => setParticipantDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
                placeholder={t('walk.participantsPlaceholder')}
              />
              <Button variant="outline" size="icon" onClick={addParticipant} aria-label={t('common.add')}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {participants.length ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {participants.map((p) => (
                  <span key={p} className="flex items-center gap-1 rounded-sm border bg-muted px-2 py-1 text-[12px]">
                    {p}
                    <button
                      onClick={() => setParticipants((list) => list.filter((x) => x !== p))}
                      className="press text-muted-foreground hover:text-bad"
                      aria-label={t('common.delete')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* แถบบันทึกติดล่างจอ */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+56px)] z-20 mt-5 md:bottom-4">
        <Button
          variant="accent"
          size="lg"
          className="w-full shadow-lift"
          onClick={submit}
          disabled={createRecord.isPending}
        >
          <ClipboardCheck className="h-5 w-5" />
          {createRecord.isPending ? t('common.saving') : t('walk.submit')}
        </Button>
      </div>
    </div>
  );
}
