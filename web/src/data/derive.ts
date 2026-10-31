// 从会议数据推导溯源需要的东西：原话在视频里的时刻、逐字时间、权限视图、通用简报。

import { personById, REASONS, type PersonId } from './model'
import { ALL_ITEMS, MEETINGS, meetingById, type Item, type Meeting, type Segment } from './meetings'
import { RUN_ID, runBrief, type Brief, type BriefEntry } from './run'

/** 秒 → 00:17 */
export const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s))
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

export const meetingOf = (it: Item) => meetingById(it.meeting)!
export const segById = (m: Meeting, id: string) => m.segments.find(s => s.id === id)!

/** 逐字时间：字符 i 在视频里的时刻（按段内均匀分布，后端接入后换成 ASR 的字级时间戳） */
export const charTime = (seg: Segment, i: number) => seg.start + (i / Math.max(1, seg.text.length)) * (seg.end - seg.start)
export const charAtTime = (seg: Segment, t: number) =>
  Math.floor(((t - seg.start) / Math.max(0.001, seg.end - seg.start)) * seg.text.length)

/** 原话在视频里的位置 */
export function quoteSpan(it: Item) {
  const m = meetingOf(it)
  const seg = segById(m, it.seg)
  const from = Math.max(0, seg.text.indexOf(it.quote))
  const to = from + it.quote.length
  return { meeting: m, seg, from, to, t0: charTime(seg, from), t1: charTime(seg, to) }
}
export const itemTime = (it: Item) => quoteSpan(it).t0

/** 某时刻正在说的那一段（停顿时返回上一段） */
export function segAt(m: Meeting, t: number): Segment | undefined {
  let cur: Segment | undefined
  for (const s of m.segments) if (t >= s.start - 0.05) cur = s
  return cur
}
export const isSpeaking = (seg: Segment | undefined, t: number) => !!seg && t >= seg.start && t < seg.end
export const chapterAt = (m: Meeting, t: number) => m.chapters.find(c => t >= c.start && t < c.end) ?? m.chapters[m.chapters.length - 1]

/** 某时刻之前已经说出口的条目 */
export const itemsSaidBy = (m: Meeting, t: number) => m.items.filter(i => itemTime(i) <= t)

export const recipientsOf = (m: Meeting, itemId: string) => [...new Set(m.routes.filter(r => r.item === itemId).map(r => r.person))]

// ---------- 权限闸 ----------

export type Visibility = 'full' | 'redacted' | 'none'

export function visibility(it: Item, pid: PersonId): Visibility {
  if (it.sensitivity === 'public' || it.sensitivity === 'internal') return 'full'
  if (it.visibleTo?.includes(pid)) return 'full'
  return it.sensitivity === 'restricted' && it.redacted ? 'redacted' : 'none'
}

// ---------- 简报 ----------

const WHY: Record<string, (it: Item) => string> = {
  R1: () => '会上点了你的名',
  R2: () => '会上点到了你的角色',
  R3: () => '你负责的事被提到了',
  R4: () => '你依赖的东西变了',
  R5: it => `你订阅了「${it.topic}」`,
  R6: () => '管理者规则',
}

/** 主案例用编辑官逐人改写的版本，其他会议按路由结果拼一份；发布者拿到的是发布者版 */
export function briefFor(meetingId: string, pid: PersonId): Brief {
  const m = meetingById(meetingId)!
  if (meetingId === RUN_ID) return runBrief(pid)
  if (m.publisher === pid) {
    const n = new Set(m.routes.map(r => r.person)).size
    return { person: pid, meeting: meetingId, host: true, readSeconds: 40, headline: `发布者版：${m.items.length} 条全部条目已分发给 ${n} 个人。`, entries: [] }
  }
  const rs = m.routes.filter(r => r.person === pid)
  const entries: BriefEntry[] = rs.map(r => {
    const it = m.items.find(i => i.id === r.item)!
    return { item: it.id, forYou: it.detail ? `${it.title}：${it.detail}。` : `${it.title}。`, why: r.reasons.map(k => WHY[k](it)).join('；'), reasons: r.reasons }
  })
  const mine = rs.map(r => m.items.find(i => i.id === r.item)!).filter(i => i.type === 'action' && i.owner === pid)
  const headline = !entries.length
    ? '这场会没有需要你必读的内容。'
    : mine.length
      ? `你有 ${mine.length} 条待办：${mine.map(i => `${i.title}${i.due ? `（${i.due}）` : ''}`).join('；')}。`
      : `${entries.length} 件和你有关的事：${entries.slice(0, 2).map(e => m.items.find(i => i.id === e.item)!.title).join('；')}${entries.length > 2 ? ' 等' : ''}。`
  return { person: pid, meeting: meetingId, headline, readSeconds: Math.max(10, entries.length * 10), entries }
}

/** 这场会不打扰 TA：不是发布者，也没有任何必读条目（只进日报） */
export const isQuiet = (meetingId: string, pid: PersonId) => {
  const b = briefFor(meetingId, pid)
  return !b.host && !b.entries.length
}

/** 某人收到的简报：别人发布、路由给 TA 的（自己发布的不算“收到”） */
export function inboxOf(pid: PersonId, dispatched: (id: string) => boolean) {
  return MEETINGS.filter(m => dispatched(m.id) && m.publisher !== pid && m.routes.some(r => r.person === pid))
    .map(m => ({ meeting: m, brief: briefFor(m.id, pid) }))
}

/** 某人发布的会议（含还没分发的） */
export const outboxOf = (pid: PersonId) => MEETINGS.filter(m => m.publisher === pid)

export const reasonText = (r: string) => REASONS[r] ?? r

// ---------- 搜索 ----------

export interface SegHit { meeting: Meeting; seg: Segment; at: number }

export function searchSegments(q: string): SegHit[] {
  const k = q.trim()
  if (!k) return []
  return MEETINGS.flatMap(m => m.segments.filter(s => s.text.includes(k) || personById(s.speaker).name.includes(k)).map(seg => {
    const i = seg.text.indexOf(k)
    return { meeting: m, seg, at: i >= 0 ? charTime(seg, i) : seg.start }
  }))
}

export const openItemsOf = (pid: PersonId, owners: Record<string, PersonId>) =>
  ALL_ITEMS.filter(i => i.type === 'action' && (owners[i.id] ?? i.owner) === pid)

/** 视频里能“听”到某人说话的总时长 */
export const talkTime = (m: Meeting, pid: PersonId) => m.segments.filter(s => s.speaker === pid).reduce((a, s) => a + s.end - s.start, 0)
