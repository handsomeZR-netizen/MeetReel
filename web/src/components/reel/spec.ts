// 每人 30 秒：一份分镜数据（VideoSpec 的 personal_30s 版），四种风格共用同一套时间轴，风格只是皮肤。
// 片子分五幕：片头 → 筛选（20 条里留下几条）→ 逐条讲（最多 3 条）→ 接下来（和你手上哪件事接上）→ 收尾。
// 所有画面都只由时间 t 和这份数据推导，所以网页里能直接播、能拖动，以后也能原样交给 Remotion 导出 MP4。

import { ME, personById, type Person, type PersonId } from '@/data/model'
import { itemById, meetingById, type Item, type Meeting } from '@/data/meetings'
import { briefFor, quoteSpan } from '@/data/derive'
import { SUGGEST, addDays, md, resolveDue, type Due } from '@/data/schedule'
import { RUN_ID } from '@/data/run'
import { WEEK, weekday as _w } from '@/lib/utils'
import { href } from '@/lib/router'
import { XM_BRIEFS as briefsJson } from '@/data/xm-en'
import { L } from '@/lib/i18n'

export type ReelStyle = 'apple' | 'sketch' | 'pop' | 'iso'

export const REEL_STYLES: { id: ReelStyle; label: string; hint: string }[] = [
  { id: 'apple', label: L('Apple 发布会', 'Keynote'), hint: L('黑底、彩色光环、大字居中，适合高管', 'Black stage, color halo, big centered type — for executives') },
  { id: 'sketch', label: L('手绘便利贴', 'Sticky notes'), hint: L('手账本、钢笔字、荧光笔划重点，适合组长', 'Notebook, pen lettering, highlighter — for team leads') },
  { id: 'pop', label: L('波普漫画', 'Pop comic'), hint: L('网点月亮、旁白框、拟声字，适合成员', 'Halftone moon, captions, sound effects — for members') },
  { id: 'iso', label: L('3D 等距', '3D isometric'), hint: L('暮色浮岛，有关的长成发光柱，适合路演', 'Floating island at dusk, what matters grows into light pillars — for pitches') },
]

/** 某个人的 30 秒 */
export const reelHref = (pid: PersonId) => href('/reel', { as: pid === ME ? undefined : pid })

/** 默认风格按职级给，用户可以切 */
export const defaultStyle = (pid: PersonId): ReelStyle =>
  ({ exec: 'apple', head: 'apple', lead: 'sketch', staff: 'pop', guest: 'apple' } as const)[personById(pid).rank]

export const DURATION = 30

/** 五幕的起止（秒） */
export const ACT = {
  intro: [0, 3.5],
  filter: [3.5, 9.5],
  items: [9.5, 22],
  next: [22, 26.5],
  outro: [26.5, 30],
} as const satisfies Record<string, readonly [number, number]>

export type ActName = keyof typeof ACT

export const ACT_LABEL: Record<ActName, string> = L(
  { intro: '片头', filter: '筛选', items: '逐条', next: '接下来', outro: '收尾' },
  { intro: 'Intro', filter: 'Filter', items: 'Items', next: 'Next up', outro: 'Outro' },
)

export interface KnowEntry {
  item: Item
  tier: 'must' | 'should'
  /** 为什么发给你 */
  why: string
  /** 对你意味着什么 */
  forYou: string
}

const bj = briefsJson as unknown as { briefs: { person: PersonId; meeting: string; entries: { item: string; tier?: 'must' | 'should'; why: string; forYou: string }[] }[] }

/** 发给这个人的条目：主案例用编辑官逐人改写的那一份（发布者自己的收件内容也在里面），其他会议按路由结果拼 */
function personalEntries(m: Meeting, pid: PersonId): KnowEntry[] {
  const curated = m.id === RUN_ID ? bj.briefs.find(b => b.person === pid && b.meeting === m.id) : undefined
  const fallback = m.publisher === pid ? null : briefFor(m.id, pid)
  return m.routes.filter(r => r.person === pid).map(r => {
    const it = m.items.find(i => i.id === r.item)!
    const c = curated?.entries.find(e => e.item === r.item)
    const f = fallback?.entries.find(e => e.item === r.item)
    const why = c?.why || f?.why || r.reasons.map(k => (k === 'R5' ? L(`你订阅了「${it.topic}」`, `You follow “${it.topic}”`) : WHY[k] ?? k)).join(L('；', '; '))
    return { item: it, tier: c?.tier ?? r.tier ?? 'must', why, forYou: c?.forYou ?? f?.forYou ?? it.title }
  })
}

const WHY: Record<string, string> = L(
  { R1: '会上点了你的名', R2: '会上点到了你的角色', R3: '你负责的事被提到了', R4: '你依赖的东西变了', R6: '管理者规则' },
  { R1: 'You were named in the meeting', R2: 'Your role was called on', R3: 'Something you own came up', R4: 'Something you depend on changed', R6: 'Manager rule' },
)

export interface Beat {
  entry: KnowEntry
  speaker: Person
  /** 原话在录像里的时刻 */
  at: number
}

export interface NextUp {
  item: Item
  meeting: Meeting
  due: Due
  /** 日历上标出来的那天（没有确切日期时为 null） */
  date: string | null
  dueLabel: string
  /** 这场会和这件事怎么接上 */
  link: string
}

export interface ReelSpec {
  person: Person
  meeting: Meeting
  total: number
  /** 留给这个人的条目 id（顺序：必读在前） */
  kept: string[]
  beats: Beat[]
  /** 卡片里还有、片子没讲的条数 */
  more: number
  next: NextUp | null
  /** 不用看完整场省下的分钟数 */
  savedMin: number
  /** 这场会一共打扰了几个人 */
  reached: number
}

// 这场直播和每个人手上哪件事接上：影响链，跨会议
const NEXT: Partial<Record<PersonId, { item: string; link: string }>> = {
  jiangwan: { item: 'rt_05', link: L('直播里的安全口径，要用进你 11/5 前交的门店话术卡', 'The livestream’s safety messaging feeds the store talk-track card you deliver by 11/5') },
  weiran: { item: 'sf_04', link: L('丁志举的座椅夹手，正是你 11/7 要补进清单的那一项', 'Ding Zhi’s seat-pinch example is exactly the item you’re adding to the checklist by 11/7') },
  chengcheng: { item: 'ow_05', link: L('90 天打卡换 4000 积分，可以放进你 11/10 的积分方案', '90-day check-in for 4,000 points could go into your 11/10 points plan') },
  songlan: { item: 'sf_02', link: L('一票否决，正好给你 11 月经营会的方案当参照', 'Their safety veto is a ready reference for your Nov ops review proposal') },
  hanzong: { item: 'sf_02', link: L('11 月经营会上，宋岚会提“安全评审变成一道关”', 'At the Nov ops review, Song Lan will propose making the safety review a hard gate') },
  gaoyuan: { item: 'ow_03', link: L('交付当天引导开通评分；对方培训做到了 484 场', 'Switch on the score at delivery; they ran 484 trainings') },
  dengkai: { item: 'rt_02', link: L('对方加送 699 元双表盘，权益对比表要更新', 'They’re adding a ¥699 dual-screen dash — update the perk comparison') },
  xunuo: { item: 'sf_06', link: L('电子安全这场没讲，OTA 复核流程照常下次周会过', 'Electronic safety wasn’t covered; the OTA re-check process still goes to the next weekly') },
  linxia: { item: 'rt_03', link: L('直播里的权益变化，补进你整理的对比素材', 'Add the livestream’s perk changes to the comparison material you’re gathering') },
  tangchuan: { item: 'sf_05', link: L('座椅相关评审记录，11/7 前配合魏然整理', 'Seat-related review records, with Wei Ran, by 11/7') },
}

const dueLabel = (it: Item, due: Due) => {
  if (due.kind === 'date') return `${md(due.date)} ${_w(due.date)}`
  if (due.kind === 'milestone') return due.label
  const s = SUGGEST[it.id]
  return s ? L(`建议 ${md(s.date)}`, `Suggested ${md(s.date)}`) : L('还没定截止', 'No due date yet')
}

export function reelSpec(pid: PersonId, meetingId = RUN_ID): ReelSpec {
  const m = meetingById(meetingId)!
  const entries = personalEntries(m, pid).sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'must' ? -1 : 1))
  const beats = entries.slice(0, 3).map(e => {
    const q = quoteSpan(e.item)
    return { entry: e, speaker: personById(q.seg.speaker), at: q.t0 }
  })
  const n = NEXT[pid]
  let next: NextUp | null = null
  if (n) {
    const it = itemById(n.item)
    const due = resolveDue(it)
    const date = due.kind === 'date' ? due.date : SUGGEST[it.id]?.date ?? null
    next = { item: it, meeting: meetingById(it.meeting)!, due, date, dueLabel: dueLabel(it, due), link: n.link }
  }
  return {
    person: personById(pid),
    meeting: m,
    total: m.items.length,
    kept: entries.map(e => e.item.id),
    beats,
    more: Math.max(0, entries.length - beats.length),
    next,
    savedMin: Math.max(1, Math.round(m.duration / 60 - (entries.length ? 0.5 : 0))),
    reached: new Set(m.routes.map(r => r.person)).size,
  }
}

/** 第 i 条在“逐条”这一幕里的起止 */
export function beatWindow(i: number, n: number): [number, number] {
  const [a, b] = ACT.items
  const len = (b - a) / Math.max(1, n)
  return [a + i * len, a + (i + 1) * len]
}

/** 日历条：截止日前后各 3 天 */
export const stripDays = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(date, i - 3))
export const weekdayShort = (iso: string) => WEEK[new Date(`${iso}T00:00:00Z`).getUTCDay()].replace('周', '')

/** 原话的时间码 */
export const tc = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
