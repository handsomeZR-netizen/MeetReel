// 双 11 评审会的“智能分发”演示剧本：8 个智能体在 20 秒里把账本拆成每人一份简报。
// 所有状态都从演示时钟 t（秒）推导；结果是预置的，后端接好后由 /meetings/{id}/process 流式返回。

import { ENGINES, personById, type EngineId, type IconKey, type PersonId } from './model'
import { meetingById, type Item } from './meetings'

export const RUN_MEETING = meetingById('d11')!

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

// ---------- 智能体 ----------

export type AgentId = 'orc' | 'scribe' | 'topic' | 'ext' | 'aud' | 'router' | 'editor' | 'disp'

export interface Agent {
  id: AgentId
  name: string
  duty: string
  /** 浅色界面用 */
  color: string
  /** 深色时间轴用 */
  bright: string
}

export const AGENTS: Agent[] = [
  { id: 'orc', name: '调度官', duty: '维护账本，调度其他智能体', color: '#52525B', bright: '#A1A1AA' },
  { id: 'scribe', name: '场记', duty: '转写、说话人映射', color: '#0D9488', bright: '#2DD4BF' },
  { id: 'topic', name: '议题官', duty: '切分议题', color: '#4F46E5', bright: '#818CF8' },
  { id: 'ext', name: '抽取官', duty: '抽 6 类条目，附原话', color: '#9333EA', bright: '#C084FC' },
  { id: 'aud', name: '审核官', duty: '原话校验、缺字段、敏感分级', color: '#D97706', bright: '#F59E0B' },
  { id: 'router', name: '路由官', duty: '相关性 × 权限', color: '#2563EB', bright: '#60A5FA' },
  { id: 'editor', name: '编辑官', duty: '按人改写“对你意味着什么”', color: '#059669', bright: '#34D399' },
  { id: 'disp', name: '投递官', duty: '飞书卡片、H5', color: '#E11D48', bright: '#FB7185' },
]

export const agentById = (id: AgentId) => AGENTS.find(a => a.id === id)!

export interface ModelBadge { icon: IconKey; label: string }

export function agentModel(agent: AgentId, engine: EngineId): ModelBadge {
  if (agent === 'orc') return { icon: 'code', label: '编排代码' }
  if (agent === 'scribe') return { icon: 'modelscope', label: 'FunASR · Paraformer' }
  if (agent === 'disp') return { icon: 'send', label: '飞书机器人 · H5' }
  const rule = agent === 'aud' || agent === 'router' ? '规则 + ' : ''
  if (engine === 'deepseek') return { icon: 'deepseek', label: `${rule}DeepSeek V4.1 Flash` }
  if (engine === 'qwen') return { icon: 'qwen', label: `${rule}Qwen · 私有化` }
  const claude = agent === 'router' ? 'Claude Opus 5.5' : agent === 'editor' ? 'Claude Haiku 5.5' : 'Claude Sonnet 5.5'
  return { icon: 'claude', label: `${rule}${claude}` }
}

// ---------- 编排时间轴（秒，演示时钟） ----------

export type SpanKind = 'think' | 'tool' | 'wait' | 'fail' | 'retry'

export interface Span {
  agent: AgentId
  start: number
  end: number
  kind: SpanKind
  title: string
  tokens?: number
  /** 交接给谁、说了什么 */
  note?: string
}

export interface Job { agent: AgentId; dispatch: number; ret: number }

export const T_END = 20
export const AXIS_MAX = 21
/** 投递前停下来，等主持人确认 */
export const GATE_AT = 18.55

export const SPANS: Span[] = [
  { agent: 'orc', start: 0, end: 0.8, kind: 'think', title: '读取会议录像，加载 8 份关注档案', tokens: 600 },
  { agent: 'orc', start: 0.8, end: 9.9, kind: 'wait', title: '等待账本定稿' },
  { agent: 'orc', start: 9.9, end: 10.3, kind: 'think', title: '账本定稿：10 条，1 条受限', tokens: 500, note: '交给路由官：10 条 × 8 人' },
  { agent: 'orc', start: 10.3, end: 19.25, kind: 'wait', title: '等待路由、改写、投递' },
  { agent: 'orc', start: 19.25, end: 19.95, kind: 'think', title: '汇总：7 份简报，1 人未打扰', tokens: 400 },

  { agent: 'scribe', start: 0.95, end: 1.7, kind: 'tool', title: '切分发言：11 段' },
  { agent: 'scribe', start: 1.75, end: 2.6, kind: 'think', title: '说话人映射：王珂 · 孙悦 · 陈默', tokens: 300, note: '交给调度官：3 位发言人，置信 0.88–0.93' },

  { agent: 'topic', start: 2.85, end: 3.9, kind: 'think', title: '切分 5 个议题', tokens: 1400 },
  { agent: 'topic', start: 3.95, end: 4.4, kind: 'tool', title: '生成议题地图', tokens: 300, note: '交给抽取官：券规则 / 上线时间 / 接口 / 扩容 / 客服' },

  { agent: 'ext', start: 4.6, end: 5.4, kind: 'tool', title: '券规则 → it_01 · it_02', tokens: 1800 },
  { agent: 'ext', start: 5.45, end: 6.1, kind: 'tool', title: '上线时间 → it_03', tokens: 1200 },
  { agent: 'ext', start: 6.15, end: 7.0, kind: 'tool', title: '接口 → it_04 · it_05', tokens: 1900 },
  { agent: 'ext', start: 7.05, end: 8.0, kind: 'tool', title: '扩容 → it_06 · it_07 · it_09 · it_10', tokens: 2600 },
  { agent: 'ext', start: 8.05, end: 8.6, kind: 'retry', title: '重抽 it_05：对齐原话', tokens: 900, note: '交给审核官：原话改为“客户端也得跟着改”' },
  { agent: 'ext', start: 8.75, end: 9.55, kind: 'tool', title: '客服 → it_08', tokens: 1100 },

  { agent: 'aud', start: 5.4, end: 6.2, kind: 'think', title: '校验原话 it_01–it_03', tokens: 700 },
  { agent: 'aud', start: 6.3, end: 7.15, kind: 'think', title: '校验原话 it_04 · it_05', tokens: 650 },
  { agent: 'aud', start: 7.2, end: 7.75, kind: 'fail', title: 'it_05 原话不在转写里', note: '打回抽取官：转写里没有“客户端要一起改”' },
  { agent: 'aud', start: 8.65, end: 9.2, kind: 'tool', title: '复核 it_05：缺负责人、缺截止', tokens: 600 },
  { agent: 'aud', start: 9.25, end: 9.7, kind: 'tool', title: '敏感分级：it_07 受限', tokens: 300, note: '交给调度官：10 条全部有原话' },

  { agent: 'router', start: 10.45, end: 11.5, kind: 'tool', title: '规则 R1–R3、R6：命中 13 条' },
  { agent: 'router', start: 11.6, end: 12.9, kind: 'think', title: 'R4 影响链：订单接口 → 赵一；券规则 → 李琳', tokens: 2400, note: 'it_05 → 赵一：你负责客户端，且依赖订单接口' },
  { agent: 'router', start: 13.0, end: 13.7, kind: 'tool', title: '权限闸：it_07 仅 4 人可见' },
  { agent: 'router', start: 13.75, end: 14.4, kind: 'think', title: '吴桐没有必读 → 不推送', tokens: 500, note: '交给编辑官：7 人待改写' },

  { agent: 'editor', start: 14.75, end: 15.3, kind: 'tool', title: '改写：林总 · 5 条', tokens: 1100 },
  { agent: 'editor', start: 15.35, end: 15.85, kind: 'tool', title: '改写：王珂 · 主持人版', tokens: 1000 },
  { agent: 'editor', start: 15.9, end: 16.4, kind: 'tool', title: '改写：陈默 · 4 条', tokens: 900 },
  { agent: 'editor', start: 16.45, end: 16.95, kind: 'tool', title: '改写：孙悦 · 3 条', tokens: 800 },
  { agent: 'editor', start: 17.0, end: 17.5, kind: 'tool', title: '改写：赵一 · 2 条', tokens: 700 },
  { agent: 'editor', start: 17.55, end: 18.0, kind: 'tool', title: '改写：李琳 · 3 条', tokens: 800 },
  { agent: 'editor', start: 18.05, end: 18.45, kind: 'tool', title: '改写：周宁 · 1 条', tokens: 400, note: '交给投递官：7 份简报' },

  { agent: 'disp', start: 18.7, end: 19.1, kind: 'tool', title: '生成 7 张飞书卡片 · 7 个 H5 链接' },
]

export const JOBS: Job[] = [
  { agent: 'scribe', dispatch: 0.8, ret: 2.7 },
  { agent: 'topic', dispatch: 2.7, ret: 4.5 },
  { agent: 'ext', dispatch: 4.45, ret: 9.65 },
  { agent: 'aud', dispatch: 5.25, ret: 9.8 },
  { agent: 'router', dispatch: 10.3, ret: 14.5 },
  { agent: 'editor', dispatch: 14.6, ret: 18.55 },
  { agent: 'disp', dispatch: 18.55, ret: 19.2 },
]

export interface LogEvent { at: number; agent: AgentId; text: string }

export const LOG: LogEvent[] = [
  { at: 0.05, agent: 'orc', text: '收到会议录像：58 秒，11 段发言，8 位相关人' },
  { at: 1.0, agent: 'scribe', text: '切分发言 11 段' },
  { at: 2.0, agent: 'scribe', text: '说话人映射完成：王珂、孙悦、陈默' },
  { at: 3.2, agent: 'topic', text: '识别 5 个议题：券规则 / 上线时间 / 接口 / 扩容 / 客服' },
  { at: 4.9, agent: 'ext', text: '新增变更 it_01：券改为满 300 减 30' },
  { at: 5.2, agent: 'ext', text: '新增待办 it_02：孙悦 11/6 前改物料' },
  { at: 5.8, agent: 'ext', text: '新增变更 it_03：上线提前到 11/8' },
  { at: 6.5, agent: 'ext', text: '新增待办 it_04：陈默 11/5 前给新接口' },
  { at: 6.8, agent: 'ext', text: '新增待办 it_05：客户端适配（没有负责人）' },
  { at: 7.25, agent: 'aud', text: 'it_05 原话校验失败，打回抽取官' },
  { at: 7.6, agent: 'ext', text: '新增 it_06 决议、it_07 预算、it_09 风险、it_10 压测' },
  { at: 8.4, agent: 'ext', text: '重抽 it_05：原话已对齐转写' },
  { at: 8.9, agent: 'aud', text: 'it_05 标记：缺负责人、缺截止时间' },
  { at: 9.3, agent: 'ext', text: '新增待办 it_08：客服 7 号前更新 FAQ' },
  { at: 9.5, agent: 'aud', text: 'it_07 敏感度：受限（含预算金额）' },
  { at: 10.0, agent: 'orc', text: '账本定稿：10 条，全部带原话' },
  { at: 10.7, agent: 'router', text: 'R1 被点名：it_02 → 孙悦；it_04、it_10 → 陈默' },
  { at: 11.3, agent: 'router', text: 'R6 管理者规则：决议和风险 → 林总' },
  { at: 12.0, agent: 'router', text: 'R4 影响链：it_05 → 赵一（你负责客户端，且依赖订单接口）' },
  { at: 12.5, agent: 'router', text: 'R4 影响链：it_01 → 李琳（客服话术依赖券规则）' },
  { at: 13.2, agent: 'router', text: '权限闸：it_07 只给财务、林总、王珂、陈默' },
  { at: 14.1, agent: 'router', text: '吴桐：没有必读条目，不打扰' },
  { at: 14.8, agent: 'editor', text: '改写林总的简报：5 条，约 60 秒' },
  { at: 17.05, agent: 'editor', text: '改写赵一的简报：2 条，约 20 秒' },
  { at: 18.1, agent: 'editor', text: '改写周宁的简报：只有 1 条' },
  { at: 18.8, agent: 'disp', text: '已生成 7 张飞书卡片' },
  { at: 19.5, agent: 'orc', text: '完成：8 个相关人，7 份不同的简报，1 人没被打扰' },
]

/** 账本条目在编排里的时间：何时被抽出、何时审核通过；it_05 先被打回再重抽 */
export const ITEM_RUN: Record<string, { appearAt: number; checkAt: number; failAt?: number; fixAt?: number; badQuote?: string }> = {
  it_01: { appearAt: 4.9, checkAt: 6.0 },
  it_02: { appearAt: 5.2, checkAt: 6.05 },
  it_03: { appearAt: 5.8, checkAt: 6.1 },
  it_04: { appearAt: 6.5, checkAt: 7.0 },
  it_05: { appearAt: 6.8, failAt: 7.25, fixAt: 8.45, checkAt: 8.95, badQuote: '客户端要一起改' },
  it_06: { appearAt: 7.45, checkAt: 9.3 },
  it_07: { appearAt: 7.6, checkAt: 9.5 },
  it_08: { appearAt: 9.3, checkAt: 9.6 },
  it_09: { appearAt: 7.75, checkAt: 9.35 },
  it_10: { appearAt: 7.9, checkAt: 9.4 },
}

export const RUN_TOPICS = [
  { name: '券规则', at: 3.1 },
  { name: '上线时间', at: 3.3 },
  { name: '接口', at: 3.5 },
  { name: '扩容', at: 3.7 },
  { name: '客服', at: 3.9 },
]

export const QUIET_AT = 14.1
export const SENT_AT = 19.1

// ---------- 个人简报（双 11 这场是编辑官逐人改写的） ----------

export interface BriefEntry {
  item: string
  forYou: string
  why: string
  reasons: string[]
  facts?: { who?: string; what?: string; when?: string }
}

export interface Brief {
  person: PersonId
  meeting: string
  headline: string
  readSeconds: number
  entries: BriefEntry[]
  /** 主持人版：看全部条目和分发情况 */
  host?: boolean
  /** 演示时钟：编辑官写好的时刻 */
  editAt?: number
}

export const D11_BRIEFS: Brief[] = [
  {
    person: 'linzong', meeting: 'd11', editAt: 15.3, readSeconds: 60,
    headline: '3 条决议和变更、1 条风险、1 笔预算待你签批：上线提前到 11/8，扩容走 A 方案。',
    entries: [
      { item: 'it_07', forYou: 'A 方案扩容预算约 30 万，需要你和财务签批。', why: '管理者规则：预算待签批', reasons: ['R6'], facts: { what: '扩容预算', who: '周宁（财务）', when: '待签批' } },
      { item: 'it_03', forYou: '上线从 11/11 提前到 11/8，留三天预热。', why: '管理者规则：所有变更', reasons: ['R6'] },
      { item: 'it_06', forYou: '扩容先按 A 方案推进。', why: '管理者规则：所有决议', reasons: ['R6'] },
      { item: 'it_09', forYou: '周四前压测可能做不完，8 号上线有风险；已定周四压测为硬节点，陈默负责。', why: '管理者规则：所有风险', reasons: ['R6'] },
      { item: 'it_01', forYou: '券从满 300 减 40 改为满 300 减 30，原因是法务风险。', why: '管理者规则：所有变更', reasons: ['R6'] },
    ],
  },
  {
    person: 'wangke', meeting: 'd11', editAt: 15.85, readSeconds: 45, host: true,
    headline: '主持人版：10 条全部条目已分发给 6 个人；1 条待办没有负责人，建议给赵一。',
    entries: [],
  },
  {
    person: 'chenmo', meeting: 'd11', editAt: 16.4, readSeconds: 20,
    headline: '你有 2 条待办：11/5 前交新接口；周四完成压测（硬节点）。',
    entries: [
      { item: 'it_04', forYou: '新接口 11/5 前交付，客户端会在之后适配。', why: '会上点了你的名', reasons: ['R1'], facts: { what: '订单新接口', who: '你', when: '11/5 前' } },
      { item: 'it_10', forYou: '周四压测是硬节点，由你负责。', why: '会上点了你的名', reasons: ['R1'], facts: { what: '压测', who: '你', when: '周四' } },
      { item: 'it_06', forYou: '扩容按你建议的 A 方案先推。', why: '你负责扩容', reasons: ['R3'] },
      { item: 'it_09', forYou: '你提的压测风险已记录，林总会看到。', why: '你负责压测', reasons: ['R3'] },
    ],
  },
  {
    person: 'sunyue', meeting: 'd11', editAt: 16.95, readSeconds: 20,
    headline: '你有 1 条待办：11/6 前按新券规则改完物料；上线提前到 11/8。',
    entries: [
      { item: 'it_02', forYou: '物料要在 11/6 前改完。', why: '会上点了你的名', reasons: ['R1'], facts: { what: '活动物料', who: '你', when: '11/6 前' } },
      { item: 'it_01', forYou: '券改为满 300 减 30，物料按新面额改。', why: '你负责的物料依赖券规则', reasons: ['R3'] },
      { item: 'it_03', forYou: '上线提前到 11/8，留三天预热。', why: '你订阅了「上线时间」', reasons: ['R5'] },
    ],
  },
  {
    person: 'zhaoyi', meeting: 'd11', editAt: 17.5, readSeconds: 20,
    headline: '这场会和你有关的 2 件事：订单接口字段要拆（客户端适配，负责人待你确认）；活动提前到 11/8 上线。',
    entries: [
      { item: 'it_05', forYou: '后端 11/5 前给新接口，之后客户端需要适配。会上没定负责人，建议是你。', why: '你负责客户端，且依赖「订单接口」', reasons: ['R2', 'R4'], facts: { what: 'coupon_amount 拆成两个字段', who: '待你确认', when: '11/5 之后' } },
      { item: 'it_03', forYou: '上线提前到 11/8，客户端发版要跟着排。', why: '你依赖「活动页」的上线时间', reasons: ['R4'] },
    ],
  },
  {
    person: 'lilin', meeting: 'd11', editAt: 18.0, readSeconds: 20,
    headline: '你有 1 条待办：11/7 前按新券规则更新客服 FAQ；上线提前到 11/8。',
    entries: [
      { item: 'it_08', forYou: '客服 FAQ 要在 11/7 前更新好。', why: '会上点到了「客服」', reasons: ['R2'], facts: { what: '客服 FAQ 和话术', who: '你（按角色）', when: '11/7 前' } },
      { item: 'it_01', forYou: '券改为满 300 减 30，FAQ 和话术按新规则写。', why: '客服话术依赖券规则', reasons: ['R4'] },
      { item: 'it_03', forYou: '上线提前到 11/8。', why: '你订阅了「上线时间」', reasons: ['R5'] },
    ],
  },
  {
    person: 'zhouning', meeting: 'd11', editAt: 18.45, readSeconds: 10,
    headline: '只有 1 件事：A 方案扩容预算约 30 万，待你签批。',
    entries: [
      { item: 'it_07', forYou: '扩容预算约 30 万，需要财务签批。', why: '会上点到了「财务」', reasons: ['R2'], facts: { what: 'A 方案扩容预算', who: '你（按角色）', when: '待签批' } },
    ],
  },
  {
    person: 'wutong', meeting: 'd11', editAt: 0, readSeconds: 0,
    headline: '这场会没有需要你必读的内容，上线日期的变化已放进日报。',
    entries: [],
  },
]

export const d11Brief = (pid: PersonId) => D11_BRIEFS.find(b => b.person === pid)!

// ---------- 从时钟 t 推导状态 ----------

export type AgentState = 'idle' | 'busy' | 'wait' | 'fail' | 'done'

export function agentSpan(id: AgentId, t: number): Span | undefined {
  return SPANS.find(s => s.agent === id && s.kind !== 'wait' && t >= s.start && t < s.end)
}

export function agentState(id: AgentId, t: number): AgentState {
  const span = agentSpan(id, t)
  if (span) return span.kind === 'fail' ? 'fail' : 'busy'
  if (id === 'orc') return t >= 19.95 ? 'done' : t > 0 ? 'wait' : 'idle'
  const job = JOBS.find(j => j.agent === id)!
  if (t < job.dispatch) return 'idle'
  if (t >= job.ret) return 'done'
  return 'wait'
}

export function agentLine(id: AgentId, t: number) {
  const now = agentSpan(id, t)
  if (now) return now.title
  const past = SPANS.filter(s => s.agent === id && s.kind !== 'wait' && s.end <= t)
  return past.length ? past[past.length - 1].title : agentById(id).duty
}

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

export type ItemState = 'hidden' | 'new' | 'fail' | 'ok'

export function itemState(it: Item, t: number): ItemState {
  const r = ITEM_RUN[it.id]
  if (!r || t < r.appearAt) return 'hidden'
  if (r.failAt != null && t >= r.failAt && t < (r.fixAt ?? Infinity)) return 'fail'
  if (t >= r.checkAt) return 'ok'
  return 'new'
}

export const quoteAt = (it: Item, t: number) => {
  const r = ITEM_RUN[it.id]
  return r?.badQuote && t < (r.fixAt ?? 0) ? r.badQuote : it.quote
}

export const runItemsAt = (t: number) =>
  RUN_MEETING.items.filter(i => t >= ITEM_RUN[i.id].appearAt).sort((a, b) => ITEM_RUN[a.id].appearAt - ITEM_RUN[b.id].appearAt)

export const logAt = (t: number) => LOG.filter(l => t >= l.at)

export function tokensAt(t: number) {
  return Math.round(SPANS.reduce((s, g) => s + (g.tokens ?? 0) * clamp01((t - g.start) / (g.end - g.start)), 0))
}
export const TOTAL_TOKENS = tokensAt(99)

export function costText(tokens: number, engine: EngineId) {
  const e = ENGINES.find(x => x.id === engine)!
  if (!e.yuanPerM) return '自有算力'
  const c = (tokens / 1e6) * e.yuanPerM
  return `≈ ¥${c.toFixed(c < 0.1 ? 3 : 2)}`
}

export const runRoutesAt = (t: number) => RUN_MEETING.routes.filter(r => (r.at ?? 0) <= t)

export const isQuietIn = (pid: PersonId) => {
  const b = d11Brief(pid)
  return b.entries.length === 0 && !b.host
}
export const readyAt = (pid: PersonId) => (isQuietIn(pid) ? QUIET_AT : d11Brief(pid).editAt ?? 0)

/** 展示顺序：主持人、管理者在前，不打扰的人在最后 */
export const RUN_PEOPLE: PersonId[] = ['wangke', 'linzong', 'chenmo', 'sunyue', 'zhaoyi', 'lilin', 'zhouning', 'wutong']
export const RUN_PEOPLE_SORTED = RUN_PEOPLE.map(personById)

/** 智能体之间的交接 */
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
