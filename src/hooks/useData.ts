import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import * as api from '@/lib/api';
import { fullPath as fullPathOf, sortAreas } from '@/lib/areaTree';
import { openIssues, pickWalkers } from '@/lib/calc';
import { useI18n } from '@/lib/i18n';
import { getSession, isAdmin, subscribeSession, syncSession } from '@/lib/session';
import type { GembaPlan, WalkRecord } from '@/lib/types';

/** ── เซสชัน ─────────────────────────────────────────────── */
export function useSession() {
  const session = useSyncExternalStore(subscribeSession, getSession, () => null);
  const admin = useSyncExternalStore(subscribeSession, isAdmin, () => false);
  return { session, admin };
}

/** ── ข้อมูลหลัก ─────────────────────────────────────────── */
export const useManagers = () => useQuery({ queryKey: ['managers'], queryFn: api.getManagers });
export const useAreas = () => useQuery({ queryKey: ['areas'], queryFn: api.getAreas });
export const useThemes = () => useQuery({ queryKey: ['themes'], queryFn: api.getThemes });
export const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: api.getPlans });
export const useRecords = () => useQuery({ queryKey: ['records'], queryFn: api.getRecords });
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
export const useWeeklyFocus = () => useQuery({ queryKey: ['focus'], queryFn: () => api.getActiveFocus() });
export const useFocusList = () => useQuery({ queryKey: ['focusList'], queryFn: api.getWeeklyFocusList });
export const useLoginHistory = () => useQuery({ queryKey: ['loginHistory'], queryFn: api.getLoginHistory });
export const useChangeHistory = (recordId?: string) =>
  useQuery({ queryKey: ['changes', recordId ?? 'all'], queryFn: () => api.getChangeHistory(recordId) });

/** โหลดข้อมูลชุดหลักพร้อมกัน — ใช้ในหน้าที่ต้องใช้หลายตาราง */
export function useCoreData() {
  const managers = useManagers();
  const areas = useAreas();
  const themes = useThemes();
  const plans = usePlans();
  const records = useRecords();
  const { lang } = useI18n();

  const sortedAreas = useMemo(() => sortAreas(areas.data ?? [], lang), [areas.data, lang]);
  const pathOf = useCallback(
    (areaId: string) => fullPathOf(areas.data ?? [], areaId, lang),
    [areas.data, lang],
  );
  const activeManagers = useMemo(() => (managers.data ?? []).filter((m) => m.is_active), [managers.data]);
  const { walkers, configured: walkersConfigured } = useMemo(() => pickWalkers(managers.data ?? []), [managers.data]);

  return {
    managers: managers.data ?? [],
    activeManagers,
    /** คนที่ต้องเดิน Gemba — ฐานของตัวเลขผลงานทุกตัว (ดู pickWalkers) */
    walkers,
    /** ผู้ดูแลกำหนดผู้ต้องเดินแล้วหรือยัง (ยัง = ใช้ทุกคนที่เข้าระบบได้แทน) */
    walkersConfigured,
    /** พื้นที่ทั้งหมด เรียงตามลำดับของโรงงาน (VSM1–4 · QC · OFFICE) */
    areas: sortedAreas,
    themes: themes.data ?? [],
    plans: plans.data ?? [],
    records: records.data ?? [],
    pathOf,
    isLoading: managers.isLoading || areas.isLoading || themes.isLoading || plans.isLoading || records.isLoading,
  };
}

/**
 * จุดรวมปัญหา — บันทึกที่พบปัญหาจะเด้งไปหาผู้รับเรื่องที่ตั้งไว้ในหน้าตั้งค่า
 * ผู้รับเรื่องและผู้ดูแลระบบเปลี่ยนสถานะได้ คนอื่นดูได้อย่างเดียว
 */
export function useIssueInbox() {
  const { session, admin } = useSession();
  const { data: settings } = useSettings();
  const { data: managers } = useManagers();
  const { data: records } = useRecords();

  const ownerId = settings?.issue_owner_id ?? null;
  const owner = useMemo(() => managers?.find((m) => m.id === ownerId), [managers, ownerId]);
  const open = useMemo(() => openIssues(records ?? []), [records]);
  const waiting = useMemo(() => open.filter((r) => r.issue_status === 'open'), [open]);
  const isOwner = Boolean(session && ownerId && session.manager_id === ownerId);

  return {
    owner,
    isOwner,
    /** แก้สถานะได้ไหม — ผู้รับเรื่อง หรือผู้ดูแลระบบ */
    canHandle: isOwner || admin,
    /** ปัญหาที่ยังไม่ปิด (รอดำเนินการ + รับทราบแล้ว) */
    open,
    /** เฉพาะที่ยังไม่มีใครรับทราบ — ใช้เป็นตัวเลขแจ้งเตือน */
    waiting,
  };
}

/** ── การเขียนข้อมูล ─────────────────────────────────────── */
function useActor() {
  const { session } = useSession();
  const { admin } = useSession();
  return admin && !session ? 'ผู้ดูแลระบบ' : session?.full_name ?? 'ผู้ดูแลระบบ';
}

export function useInvalidate() {
  const qc = useQueryClient();
  return useCallback((keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })), [qc]);
}

export function useCreatePlan() {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: api.PlanInput) => api.createPlan(input, actor),
    onSuccess: () => invalidate(['plans', 'changes']),
  });
}

export function useUpdatePlan() {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GembaPlan> }) => api.updatePlan(id, patch, actor),
    onSuccess: () => invalidate(['plans', 'changes']),
  });
}

export function useCreateRecord() {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: api.RecordInput) => api.createRecord(input, actor),
    onSuccess: () => invalidate(['records', 'plans', 'changes']),
  });
}

export function useUpdateRecord() {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<WalkRecord> }) => api.updateRecord(id, patch, actor),
    onSuccess: () => invalidate(['records', 'plans', 'changes']),
  });
}

export function useSaveManager() {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.saveManager>[0]) => api.saveManager(input, actor),
    onSuccess: () => invalidate(['managers', 'changes']),
  });
}

export function useSaveArea() {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.saveArea>[0]) => api.saveArea(input, actor),
    onSuccess: () => invalidate(['areas', 'changes']),
  });
}

export function useSaveTheme() {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.saveTheme>[0]) => api.saveTheme(input, actor),
    onSuccess: () => invalidate(['themes', 'changes']),
  });
}

export function useSaveFocus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.saveWeeklyFocus,
    onSuccess: () => invalidate(['focus', 'focusList']),
  });
}

export function useSaveSettings() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: api.saveSettings, onSuccess: () => invalidate(['settings']) });
}

/**
 * ตรวจกับเซิร์ฟเวอร์ว่าโทเคนผู้ดูแลที่ถืออยู่ยังใช้ได้จริง
 *
 * ค่าใน localStorage ปลอมได้ ถ้าเชื่อค่านั้นอย่างเดียวก็จะเปิดหน้าตั้งค่าให้คนที่
 * ไม่รู้รหัสผู้ดูแล (เขียนอะไรไม่ได้เพราะ Worker ปฏิเสธ แต่ก็ไม่ควรเห็นตั้งแต่แรก)
 * เรียกจากหน้าที่เป็นงานผู้ดูแลเท่านั้น ไม่ต้องยิงทุกหน้า
 */
export function useAdminGuard() {
  const { admin } = useSession();

  useEffect(() => {
    if (!admin) return;
    void api.verifyAdminSession();
  }, [admin]);
}

/**
 * Admin ปิดบัญชี/สิทธิ์แล้วต้องมีผลทันที
 * ตรวจสถานะผู้ใช้ทุกครั้งที่ข้อมูล managers ถูกโหลดใหม่
 */
export function useSessionGuard() {
  const { session } = useSession();
  const { data: managers } = useManagers();

  useEffect(() => {
    if (!session || !managers) return;
    syncSession(managers.find((m) => m.id === session.manager_id));
  }, [session, managers]);
}
