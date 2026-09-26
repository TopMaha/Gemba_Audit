import { describe, expect, it } from 'vitest';
import {
  adherence,
  bandOf,
  dayStatus,
  openIssues,
  overallCompletion,
  pickWalkers,
  rankManagers,
  themeCompletion,
  walkerWeek,
} from '../calc';
import { sortAreas } from '../areaTree';
import { rangeDays } from '../time';
import type { Area, GembaPlan, Manager, WalkRecord } from '../types';

const mgr = (id: string, active = true): Manager => ({
  id,
  manager_code: id,
  full_name: id,
  department: 'Production',
  avatar_url: null,
  is_active: active,
  dashboard_enabled: true,
  can_login: true,
  is_walker: false,
  walk_days: [],
  created_at: '2026-01-01T00:00:00.000Z',
});

const plan = (id: string, manager_id: string, date: string, status: GembaPlan['status']): GembaPlan => ({
  id,
  manager_id,
  plan_date: date,
  plan_time: '09:00',
  area_id: 'ar_1',
  theme_ids: ['th_01'],
  theme_id: 'th_01',
  status,
  created_at: '2026-01-01T00:00:00.000Z',
});

const rec = (id: string, manager_id: string, date: string, theme_ids: string[]): WalkRecord => ({
  id,
  plan_id: null,
  manager_id,
  actual_date: date,
  actual_time: '09:30',
  actual_area_id: 'ar_1',
  theme_ids,
  observation: 'ok',
  has_issue: false,
  photo_urls: [],
  participant_names: [],
  ci_required: false,
  issue_status: 'open',
  issue_response: '',
  completed_at: `${date}T09:30:00.000Z`,
});

describe('Adherence', () => {
  const plans = [
    plan('p1', 'm1', '2026-08-17', 'completed'),
    plan('p2', 'm1', '2026-08-18', 'completed'),
    plan('p3', 'm1', '2026-08-19', 'planned'),
    plan('p4', 'm1', '2026-08-20', 'cancelled'),
    plan('p5', 'm2', '2026-08-18', 'planned'),
  ];

  it('นับเฉพาะแผนในช่วงเวลา และไม่นับแผนที่ยกเลิก', () => {
    const r = adherence(plans, '2026-08-16', '2026-08-22', 'm1', '2026-08-22');
    expect(r.done).toBe(2);
    expect(r.total).toBe(3);
    expect(r.cancelled).toBe(1);
    expect(r.pct).toBe(66);
  });

  it('ไม่นับแผนที่ยังไม่ถึงกำหนด (แยกไว้ใน upcoming)', () => {
    const r = adherence(plans, '2026-08-16', '2026-08-22', 'm1', '2026-08-18');
    expect(r.done).toBe(2);
    expect(r.total).toBe(2);
    expect(r.upcoming).toBe(1);
    expect(r.pct).toBe(100);
  });

  it('กรองรายบุคคลได้', () => {
    expect(adherence(plans, '2026-08-16', '2026-08-22', 'm2', '2026-08-22').total).toBe(1);
  });

  it('ไม่มีแผนในช่วง คืนค่า 0 โดยไม่หารด้วยศูนย์', () => {
    expect(adherence(plans, '2026-01-01', '2026-01-07', undefined, '2026-08-22').pct).toBe(0);
  });
});

describe('Completion รายหัวข้อ', () => {
  const managers = [mgr('m1'), mgr('m2'), mgr('m3')];
  const records = [
    rec('r1', 'm1', '2026-08-17', ['th_01']),
    rec('r2', 'm1', '2026-08-18', ['th_01']), // คนเดิม หัวข้อเดิม -> นับเป็น 1
    rec('r3', 'm2', '2026-08-18', ['th_01', 'th_02']),
  ];

  it('คนเดิมเดินหัวข้อเดิมหลายครั้ง นับเป็น 1 คน', () => {
    const [row] = themeCompletion(['th_01'], records, managers, '2026-08-16', '2026-08-22');
    expect(row.actual).toBe(2);
    expect(row.plan).toBe(3);
    expect(row.pct).toBe(66);
    expect(row.missingManagerIds).toEqual(['m3']);
  });

  it('ไม่นับรายการนอกช่วงเวลา', () => {
    const [row] = themeCompletion(['th_01'], records, managers, '2026-09-01', '2026-09-30');
    expect(row.actual).toBe(0);
    expect(row.missingManagerIds).toHaveLength(3);
  });

  it('ภาพรวมหัวข้อที่เลือก = ผลรวม Actual ÷ ผลรวม Plan (ตัวอย่างในสเปก 17/30 = 56%)', () => {
    const rows = [
      { theme_id: 'a', plan: 15, actual: 9, pct: 60, doneManagerIds: [], missingManagerIds: [] },
      { theme_id: 'b', plan: 15, actual: 8, pct: 53, doneManagerIds: [], missingManagerIds: [] },
    ];
    expect(overallCompletion(rows)).toEqual({ actual: 17, plan: 30, pct: 56 });
  });
});

describe('แถบสี Completion', () => {
  it('เขียว ≥80, ส้ม 50–79, แดง <50', () => {
    expect(bandOf(80)).toBe('ok');
    expect(bandOf(79)).toBe('warn');
    expect(bandOf(50)).toBe('warn');
    expect(bandOf(49)).toBe('bad');
  });
});

describe('อันดับผู้จัดการ', () => {
  it('เรียงตามจำนวนครั้งที่เดิน และให้อันดับเท่ากันเมื่อคะแนนเท่ากัน', () => {
    const managers = [mgr('m1'), mgr('m2'), mgr('m3')];
    const records = [
      rec('r1', 'm1', '2026-08-17', ['th_01']),
      rec('r2', 'm1', '2026-08-18', ['th_01']),
      rec('r3', 'm2', '2026-08-18', ['th_01']),
      rec('r4', 'm3', '2026-08-18', ['th_01']),
    ];
    const rows = rankManagers(managers, [], records, '2026-08-16', '2026-08-22');
    expect(rows[0].manager.id).toBe('m1');
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
    expect(rows[2].rank).toBe(2);
  });
});

describe('ผู้ต้องเดิน Gemba', () => {
  it('นับเฉพาะคนที่ถูกกำหนดให้เดิน และข้ามคนที่ปิดบัญชี', () => {
    const list = [
      { ...mgr('m1'), is_walker: true },
      { ...mgr('m2'), is_walker: true, is_active: false },
      mgr('m3'),
    ];
    const { walkers, configured } = pickWalkers(list);
    expect(configured).toBe(true);
    expect(walkers.map((m) => m.id)).toEqual(['m1']);
  });

  it('ยังไม่กำหนดใคร → ใช้คนที่เข้าระบบได้แทน ไม่ใช่พนักงานทั้งหมด', () => {
    const list = [mgr('m1'), { ...mgr('m2'), can_login: false }, mgr('m3', false)];
    const { walkers, configured } = pickWalkers(list);
    expect(configured).toBe(false);
    expect(walkers.map((m) => m.id)).toEqual(['m1']);
  });

  it('Completion ใช้จำนวนผู้ต้องเดินเป็นตัวหาร', () => {
    const walkers = [mgr('m1'), mgr('m2')];
    const [row] = themeCompletion(['th_01'], [rec('r1', 'm1', '2026-08-18', ['th_01'])], walkers, '2026-08-16', '2026-08-22');
    expect(row.plan).toBe(2);
    expect(row.pct).toBe(50);
  });
});

describe('ตารางเดินรายบุคคล', () => {
  // สัปดาห์ 16–22 ส.ค. 2026 (อาทิตย์–เสาร์) · วันนี้ = พุธ 19
  const week = rangeDays('2026-08-16', '2026-08-22');
  const today = '2026-08-19';

  it('สถานะของแต่ละช่อง', () => {
    expect(dayStatus(true, 1, '2026-08-17', today)).toBe('done');
    expect(dayStatus(true, 0, '2026-08-17', today)).toBe('missed');
    expect(dayStatus(true, 0, today, today)).toBe('due');
    expect(dayStatus(false, 2, '2026-08-18', today)).toBe('extra');
    expect(dayStatus(false, 0, '2026-08-18', today)).toBe('none');
  });

  it('วันประจำ จ./พ./ศ. — เดินวันจันทร์ ขาดไม่มี เป้า 3 ครั้ง', () => {
    const me = { ...mgr('m1'), is_walker: true, walk_days: [1, 3, 5] };
    const res = walkerWeek(me, [rec('r1', 'm1', '2026-08-17', ['th_01'])], week, 1, today);
    expect(res.target).toBe(3);
    expect(res.done).toBe(1);
    expect(res.missed).toBe(0);
    expect(res.days.map((d) => d.status)).toEqual(['none', 'done', 'none', 'due', 'none', 'due', 'none']);
  });

  it('วันประจำที่ผ่านไปแล้วไม่ได้เดิน = ขาด · ไม่กำหนดวันใช้เป้าของระบบ', () => {
    const scheduled = { ...mgr('m1'), walk_days: [1] };
    expect(walkerWeek(scheduled, [], week, 1, today).missed).toBe(1);
    expect(walkerWeek(mgr('m2'), [], week, 2, today).target).toBe(2);
  });
});

describe('จุดรวมปัญหา', () => {
  it('เฉพาะที่พบปัญหาและยังไม่ปิด เรียงจากค้างนานสุด', () => {
    const issue = (id: string, date: string, status: WalkRecord['issue_status']) => ({
      ...rec(id, 'm1', date, ['th_01']),
      has_issue: true,
      issue_status: status,
    });
    const list = openIssues([
      issue('a', '2026-08-18', 'open'),
      issue('b', '2026-08-10', 'acknowledged'),
      issue('c', '2026-08-01', 'closed'),
      rec('d', 'm1', '2026-08-01', ['th_01']),
    ]);
    expect(list.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('ลำดับพื้นที่', () => {
  it('VSM1–4 · QC · OFFICE ตามลำดับโรงงาน พื้นที่อื่นต่อท้าย', () => {
    const area = (id: string, name: string): Area => ({ id, area_name: name, parent_id: null, department: '', is_active: true });
    const sorted = sortAreas([
      area('ar_office', 'OFFICE'),
      area('ar_x', 'ALPHA'),
      area('ar_qc', 'QC'),
      area('ar_vsm2', 'VSM2'),
      area('ar_vsm1', 'VSM1'),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(['ar_vsm1', 'ar_vsm2', 'ar_qc', 'ar_office', 'ar_x']);
  });
});
