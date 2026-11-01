// 日程：把账本里的待办放到日历上。
// 会上说的截止日期是口语（“11/7”“直播后”“下次周会”“11 月经营会”），这里统一翻成日历能定位的日期；
// 状态和编号也在这里定义：待确认 → 待办 → 进行中 → 已完成，和 Linear 一样一个条目只有一种状态。

import { term, type PersonId } from './model'
import { L, isEn } from '@/lib/i18n'
import { ALL_ITEMS, MEETINGS, type Item, type Meeting } from './meetings'
import { RUN_ID } from './run'

// ---------- 日期工具（全部按 UTC 算，避开时区） ----------

export const TODAY = '2026-10-31'

const parse = (iso: string) => new Date(`${iso}T00:00:00Z`)
const fmt = (d: Date) => d.toISOString().slice(0, 10)

export const addDays = (iso: string, n: number) => { const d = parse(iso); d.setUTCDate(d.getUTCDate() + n); return fmt(d) }
/** 周一开头的那一周 */
export const weekStart = (iso: string) => addDays(iso, -((parse(iso).getUTCDay() + 6) % 7))
export const weekDays = (iso: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(iso), i))
export const monthOf = (iso: string) => iso.slice(0, 7)
export const addMonths = (iso: string, n: number) => { const d = parse(`${monthOf(iso)}-01`); d.setUTCMonth(d.getUTCMonth() + n); return fmt(d) }
/** 月视图：覆盖整月的若干周，周一开头 */
export function monthGrid(iso: string) {
  const first = `${monthOf(iso)}-01`
  const last = addDays(addMonths(first, 1), -1)
  const days: string[] = []
  for (let d = weekStart(first); d <= weekStart(last) || days.length % 7; d = addDays(d, 1)) days.push(d)
  return days
}
export const dayNum = (iso: string) => Number(iso.slice(8))
export const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8))}`

// ---------- 状态 ----------

export type TodoStatus = 'triage' | 'todo' | 'doing' | 'done'

export const STATUS: Record<TodoStatus, { label: string; color: string }> = {
  triage: { label: L('待确认', 'Triage'), color: '#D97706' },
  todo: { label: L('待办', 'To do'), color: '#8A8F98' },
  doing: { label: L('进行中', 'In progress'), color: '#2F64F2' },
  done: { label: L('已完成', 'Done'), color: '#16A34A' },
}

/** 下一个状态：待确认 → 待办 → 进行中 → 已完成 → 回到待办 */
export const NEXT_STATUS: Record<TodoStatus, TodoStatus> = { triage: 'todo', todo: 'doing', doing: 'done', done: 'todo' }

export function statusOf(id: string, s: { confirmed: Record<string, unknown>; done: Record<string, boolean>; doing: Record<string, boolean> }): TodoStatus {
  if (s.done[id]) return 'done'
  if (s.doing[id]) return 'doing'
  return s.confirmed[id] ? 'todo' : 'triage'
}

// ---------- 编号：MR-1、MR-2…，按账本里待办出现的顺序 ----------

const ACTIONS = ALL_ITEMS.filter(i => i.type === 'action')
export const todoKey = (id: string) => `MR-${ACTIONS.findIndex(i => i.id === id) + 1}`

// ---------- 截止日期翻译 ----------

export type Due =
  | { kind: 'date'; date: string; label: string; follows?: string }
  | { kind: 'milestone'; month: string; label: string }
  | { kind: 'none'; label: string }

const meetingOfItem = (it: Item) => MEETINGS.find(m => m.id === it.meeting)!

export function resolveDue(it: Item, override?: string): Due {
  if (override) return { kind: 'date', date: override, label: md(override) }
  const raw = it.due
  if (!raw) return { kind: 'none', label: it.flags?.includes(term('缺截止')) ? term('缺截止') : L('未定', 'TBD') }
  const exact = raw.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (exact) return { kind: 'date', date: `2026-${exact[1].padStart(2, '0')}-${exact[2].padStart(2, '0')}`, label: raw }
  if (raw === term('直播后')) {
    const live = MEETINGS.find(m => m.id === RUN_ID)!
    return { kind: 'date', date: live.date, label: raw, follows: L('跟随竞品直播', 'Follows the competitor livestream') }
  }
  if (raw === term('下次周会')) {
    const m = meetingOfItem(it)
    return { kind: 'date', date: addDays(m.date, 7), label: raw, follows: L(`${m.kind}每周一次`, `${m.kind} meeting, every week`) }
  }
  const month = isEn ? raw.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/) : raw.match(/^(\d{1,2}) 月/)
  if (month) {
    const n = isEn ? 'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(month[1]) / 3 + 1 : Number(month[1])
    return { kind: 'milestone', month: `2026-${String(n).padStart(2, '0')}`, label: raw }
  }
  return { kind: 'none', label: raw }
}

/** AI 给缺截止的待办建议的日期，附依据；接受后写进日历 */
export const SUGGEST: Record<string, { date: string; why: string }> = {
  ow_06: { date: '2026-11-05', why: L('门店话术卡 11/5 前要印到门店，口径得先统一', 'The store talk-track card goes to print by 11/5, so the messaging has to be settled first') },
  ow_03: { date: '2026-11-10', why: L('积分方案 11/10 定稿后，培训课才好接', 'Training can build on the points plan once it’s final on 11/10') },
}

// ---------- 日历上的条目 ----------

export interface TodoEntry { kind: 'todo'; item: Item; meeting: Meeting; owner: PersonId; due: Due }
export interface MeetingEntry { kind: 'meeting'; meeting: Meeting; date: string; role: 'publisher' | 'receiver' }

type Ctx = { owners: Record<string, PersonId>; dispatched: Record<string, boolean>; due: Record<string, string> }

/** 某人的待办：负责人是 TA、所在会议已经分发 */
export function todosOf(pid: PersonId, c: Ctx): TodoEntry[] {
  return MEETINGS.filter(m => c.dispatched[m.id]).flatMap(m =>
    m.items
      .filter(i => i.type === 'action' && (c.owners[i.id] ?? i.owner) === pid)
      .map(i => ({ kind: 'todo' as const, item: i, meeting: m, owner: pid, due: resolveDue(i, c.due[i.id]) })),
  )
}

/** 某人相关的会议：发布的和收到的 */
export function meetingsOf(pid: PersonId): MeetingEntry[] {
  return MEETINGS
    .filter(m => m.publisher === pid || m.related.includes(pid) || m.attendees.includes(pid))
    .map(m => ({ kind: 'meeting' as const, meeting: m, date: m.date, role: m.publisher === pid ? 'publisher' as const : 'receiver' as const }))
}

/** 里程碑：不落在某一天的节点，比如“11 月经营会” */
export function milestonesOf(pid: PersonId) {
  return ALL_ITEMS
    .filter(i => i.due && i.type !== 'action' && resolveDue(i).kind === 'milestone')
    .filter(i => { const m = meetingOfItem(i); return i.owner === pid || m.publisher === pid || m.related.includes(pid) || m.attendees.includes(pid) })
    .map(i => ({ item: i, due: resolveDue(i) as Extract<Due, { kind: 'milestone' }> }))
}
