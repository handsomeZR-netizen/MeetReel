// 从演示时钟 t 推导每个风格都要用到的状态：智能体忙闲、账本条目状态、路由、简报。
// 数据本身来自 web/src/data/demo.ts，这里只做“某一时刻看起来是什么样”的计算。

import {
  AGENTS, BRIEFS, ITEMS, JOBS, LOG, QUIET_AT, ROUTES, SEGS, TOPICS,
  briefOf, clamp01, personById,
  type AgentId, type Item, type PersonId, type Seg,
} from '@web/data/demo'

export * from '@web/data/demo'

// ---------- 智能体 ----------

export type AgentState = 'idle' | 'busy' | 'wait' | 'fail' | 'done'

/** 某个智能体此刻正在做的那一段（不含“等待”） */
export function agentSeg(id: AgentId, t: number): Seg | undefined {
  return SEGS.find(s => s.agent === id && s.kind !== 'wait' && t >= s.start && t < s.end)
}

export function agentState(id: AgentId, t: number): AgentState {
  const seg = agentSeg(id, t)
  if (seg) return seg.kind === 'fail' ? 'fail' : 'busy'
  if (id === 'orc') return t >= 19.95 ? 'done' : t > 0 ? 'wait' : 'idle'
  const job = JOBS.find(j => j.agent === id)!
  if (t < job.dispatch) return 'idle'
  if (t >= job.ret) return 'done'
  return 'wait'
}

/** 智能体任务进度 0–1（调度官按全程算） */
export function agentProgress(id: AgentId, t: number) {
  if (id === 'orc') return clamp01(t / 19.95)
  const job = JOBS.find(j => j.agent === id)!
  return clamp01((t - job.dispatch) / (job.ret - job.dispatch))
}

/** 智能体最近一次完成或正在做的事，用于卡片上的一行状态 */
export function agentLine(id: AgentId, t: number) {
  const now = agentSeg(id, t)
  if (now) return now.title
  const past = SEGS.filter(s => s.agent === id && s.kind !== 'wait' && s.end <= t)
  return past.length ? past[past.length - 1].title : AGENTS.find(a => a.id === id)!.duty
}

/** 智能体之间的交接（画光束、连线用），持续 0.7 秒 */
export const EDGES: { from: AgentId; to: AgentId; at: number; label: string }[] = [
  { from: 'orc', to: 'scribe', at: 0.8, label: '派发转写' },
  { from: 'scribe', to: 'orc', at: 2.6, label: '3 位发言人' },
  { from: 'orc', to: 'topic', at: 2.7, label: '派发议题' },
  { from: 'topic', to: 'ext', at: 4.4, label: '5 个议题' },
  { from: 'ext', to: 'aud', at: 5.4, label: '送审 it_01–03' },
  { from: 'aud', to: 'ext', at: 7.7, label: '打回 it_05' },
  { from: 'ext', to: 'aud', at: 8.6, label: '重抽后复核' },
  { from: 'aud', to: 'orc', at: 9.7, label: '10 条全部有原话' },
  { from: 'orc', to: 'router', at: 10.3, label: '10 条 × 8 人' },
  { from: 'router', to: 'editor', at: 14.4, label: '7 人待改写' },
  { from: 'editor', to: 'disp', at: 18.45, label: '7 份简报' },
  { from: 'disp', to: 'orc', at: 19.1, label: '已送达' },
]
export const EDGE_LEN = 0.7
export const edgesAt = (t: number) => EDGES.filter(e => t >= e.at && t < e.at + EDGE_LEN)

/** 带“交接说明”的段落：段落结束后显示 1.6 秒 */
export const NOTES = SEGS.filter(s => s.note).map(s => ({ agent: s.agent, at: s.end, text: s.note! }))
export const notesAt = (t: number) => NOTES.filter(n => t >= n.at - 0.3 && t < n.at + 1.6)

// ---------- 阶段 ----------

export const PHASES: { id: string; label: string; agent: AgentId; start: number; end: number }[] = [
  { id: 'read', label: '读取', agent: 'orc', start: 0, end: 0.95 },
  { id: 'scribe', label: '转写', agent: 'scribe', start: 0.95, end: 2.7 },
  { id: 'topic', label: '议题', agent: 'topic', start: 2.7, end: 4.5 },
  { id: 'extract', label: '抽取 · 审核', agent: 'ext', start: 4.5, end: 9.9 },
  { id: 'route', label: '路由', agent: 'router', start: 9.9, end: 14.5 },
  { id: 'edit', label: '改写', agent: 'editor', start: 14.5, end: 18.55 },
  { id: 'send', label: '投递', agent: 'disp', start: 18.55, end: 20.01 },
]
export const phaseIndex = (t: number) => Math.max(0, PHASES.findIndex(p => t >= p.start && t < p.end))

// ---------- 账本 ----------

export type ItemState = 'hidden' | 'new' | 'fail' | 'ok'

export function itemState(it: Item, t: number): ItemState {
  if (t < it.appearAt) return 'hidden'
  if (it.failAt != null && t >= it.failAt && t < (it.fixAt ?? Infinity)) return 'fail'
  if (t >= it.checkAt) return 'ok'
  return 'new'
}

/** it_05 在重抽前显示的是不在转写里的“错误原话” */
export const quoteAt = (it: Item, t: number) => (it.badQuote && t < (it.fixAt ?? 0) ? it.badQuote : it.quote)

export const itemsAt = (t: number) => ITEMS.filter(i => t >= i.appearAt).sort((a, b) => a.appearAt - b.appearAt)
export const topicsAt = (t: number) => TOPICS.filter(x => t >= x.at)
export const logAt = (t: number) => LOG.filter(l => t >= l.at)

/** 已消耗 token（进行中的段按比例算） */
export function tokensAt(t: number) {
  return Math.round(SEGS.reduce((s, g) => s + (g.tokens ?? 0) * clamp01((t - g.start) / (g.end - g.start)), 0))
}
export const TOTAL_TOKENS = tokensAt(99)

// ---------- 路由与简报 ----------

export const routesAt = (t: number) => ROUTES.filter(r => t >= r.at)
export const routesFor = (pid: PersonId, t = 99) => ROUTES.filter(r => r.person === pid && t >= r.at)
export const recipientsOf = (itemId: string) => [...new Set(ROUTES.filter(r => r.item === itemId).map(r => r.person))]

/** 没有必读内容、不被打扰的人 */
export const isQuiet = (pid: PersonId) => briefOf(pid).entries.length === 0 && !personById(pid).host

/** 某人的简报何时写好（不打扰的人在路由判定时就确定了） */
export const readyAt = (pid: PersonId) => (isQuiet(pid) ? QUIET_AT : briefOf(pid).editAt)

/** 每个人收到的条目数（主持人看全部 10 条） */
export const countOf = (pid: PersonId) => (personById(pid).host ? ITEMS.length : briefOf(pid).entries.length)

/** 一个人被推送的理由（去重） */
export const reasonsOf = (pid: PersonId) => [...new Set(ROUTES.filter(r => r.person === pid).flatMap(r => r.reasons))]

/** 展示顺序：主持人、管理者在前，不打扰的人在最后 */
export const PEOPLE_ORDER: PersonId[] = ['wangke', 'linzong', 'chenmo', 'sunyue', 'zhaoyi', 'lilin', 'zhouning', 'wutong']
export const PEOPLE_SORTED = PEOPLE_ORDER.map(personById)

export const BRIEF_COUNT = BRIEFS.filter(b => !isQuiet(b.person)).length

/** 秒 → 00:12 */
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
