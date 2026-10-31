// 演示数据：双 11 活动上线评审会（需求文档 14.2 剧本）。
// 字段沿用需求文档第 8 节的数据契约；这里的结果是预置的，后端接好后由 /meetings/{id}/process 返回。

export type PersonId =
  | 'linzong' | 'wangke' | 'chenmo' | 'sunyue'
  | 'zhaoyi' | 'lilin' | 'zhouning' | 'wutong'

export interface Person {
  id: PersonId
  name: string
  short: string
  role: string
  present: boolean
  host?: boolean
  bg: string
  fg: string
}

export const PEOPLE: Person[] = [
  { id: 'linzong', name: '林总', short: '林', role: '业务负责人', present: false, bg: '#FEF3C7', fg: '#92400E' },
  { id: 'wangke', name: '王珂', short: '珂', role: '产品 · 主持', present: true, host: true, bg: '#E0E7FF', fg: '#3730A3' },
  { id: 'chenmo', name: '陈默', short: '默', role: '后端负责人', present: true, bg: '#DBEAFE', fg: '#1E40AF' },
  { id: 'sunyue', name: '孙悦', short: '悦', role: '市场', present: true, bg: '#FCE7F3', fg: '#9D174D' },
  { id: 'zhaoyi', name: '赵一', short: '一', role: '客户端负责人', present: false, bg: '#D1FAE5', fg: '#065F46' },
  { id: 'lilin', name: '李琳', short: '琳', role: '客服主管', present: false, bg: '#EDE9FE', fg: '#5B21B6' },
  { id: 'zhouning', name: '周宁', short: '宁', role: '财务', present: false, bg: '#FFE4E6', fg: '#9F1239' },
  { id: 'wutong', name: '吴桐', short: '桐', role: '数据分析', present: false, bg: '#F1F5F9', fg: '#475569' },
]

export const personById = (id: PersonId) => PEOPLE.find(p => p.id === id)!

export const DEFAULT_TITLE = '双 11 活动上线评审'

export const DEFAULT_TEXT = `王珂：双 11 活动快速过一下。第一，法务说“满 300 减 40”有风险，券改成满 300 减 30。孙悦，物料跟着改。
孙悦：行，物料我 11 月 6 号前改完。上线时间还是 11 号吗？
王珂：提前到 8 号，留三天预热。
陈默：那订单接口的 coupon_amount 要拆成两个字段，客户端也得跟着改。新接口我 11 月 5 号前给。
王珂：好。第二，扩容。
陈默：压测还没做完。我建议走 A 方案，预算大概 30 万。
王珂：A 方案先推，预算请财务签批。
孙悦：券规则变了，客服那边话术要不要更新？
王珂：要，客服 7 号前把 FAQ 更新好。
陈默：还有个风险：周四前压测做不完，8 号上线就悬。
王珂：那周四压测是硬节点，陈默负责。散会。`

/** 示例会议每段发言在会议录音里的时间点 */
export const DEMO_SEG_TIMES = ['00:00', '00:08', '00:13', '00:17', '00:26', '00:29', '00:35', '00:39', '00:44', '00:48', '00:54']

// ---------- 智能体 ----------

export type AgentId = 'orc' | 'scribe' | 'topic' | 'ext' | 'aud' | 'router' | 'editor' | 'disp'

export interface Agent {
  id: AgentId
  name: string
  duty: string
  color: string
}

export const AGENTS: Agent[] = [
  { id: 'orc', name: '调度官', duty: '维护账本，调度其他智能体', color: '#3F3F46' },
  { id: 'scribe', name: '场记', duty: '转写、说话人映射', color: '#0D9488' },
  { id: 'topic', name: '议题官', duty: '切分议题', color: '#4F46E5' },
  { id: 'ext', name: '抽取官', duty: '抽 6 类条目，附原话', color: '#9333EA' },
  { id: 'aud', name: '审核官', duty: '原话校验、缺字段、敏感分级', color: '#D97706' },
  { id: 'router', name: '路由官', duty: '相关性 × 权限', color: '#2563EB' },
  { id: 'editor', name: '编辑官', duty: '按人改写“对你意味着什么”', color: '#059669' },
  { id: 'disp', name: '投递官', duty: '飞书卡片、H5', color: '#E11D48' },
]

export const agentById = (id: AgentId) => AGENTS.find(a => a.id === id)!

// ---------- 模型（可替换） ----------

export type EngineId = 'deepseek' | 'claude' | 'qwen'
export type IconKey = 'deepseek' | 'claude' | 'qwen' | 'modelscope' | 'code' | 'send'

export interface Engine {
  id: EngineId
  label: string
  sub: string
  icon: IconKey
  /** 每百万 token 的粗估混合单价（元），只用于演示里的成本估算 */
  yuanPerM: number
}

export const ENGINES: Engine[] = [
  { id: 'deepseek', label: 'DeepSeek', sub: '现场运行', icon: 'deepseek', yuanPerM: 2.2 },
  { id: 'claude', label: 'Claude', sub: '评测基线', icon: 'claude', yuanPerM: 45 },
  { id: 'qwen', label: 'Qwen', sub: '私有化部署', icon: 'qwen', yuanPerM: 0 },
]

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

export type SegKind = 'think' | 'tool' | 'wait' | 'fail' | 'retry'

export interface Seg {
  agent: AgentId
  start: number
  end: number
  kind: SegKind
  title: string
  tokens?: number
  /** 交接给谁、说了什么 */
  note?: string
}

export interface Job { agent: AgentId; dispatch: number; ret: number }

export const T_END = 20
export const AXIS_MAX = 21

export const SEGS: Seg[] = [
  { agent: 'orc', start: 0, end: 0.8, kind: 'think', title: '读取会议文本，加载 8 份关注档案', tokens: 600 },
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
  { at: 0.05, agent: 'orc', text: '收到会议文本：11 段发言，8 位相关人' },
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

// ---------- 会议账本 ----------

export type ItemType = 'decision' | 'action' | 'change' | 'risk' | 'question' | 'info'

export const ITEM_TYPES: Record<ItemType, { label: string; color: string; soft: string }> = {
  decision: { label: '决议', color: '#4F46E5', soft: '#EEF0FF' },
  action: { label: '待办', color: '#2563EB', soft: '#EAF2FF' },
  change: { label: '变更', color: '#D97706', soft: '#FEF5E7' },
  risk: { label: '风险', color: '#E11D48', soft: '#FFEDF1' },
  question: { label: '问题', color: '#0891B2', soft: '#E6F7FB' },
  info: { label: '信息', color: '#64748B', soft: '#F1F5F9' },
}

export type Sensitivity = 'public' | 'internal' | 'restricted' | 'confidential'

export interface Item {
  id: string
  type: ItemType
  title: string
  topic: string
  owner: PersonId | null
  ownerBasis?: string
  due: string | null
  speaker: PersonId
  at: string
  quote: string
  sensitivity: Sensitivity
  redacted?: string
  flags?: string[]
  /** 演示时钟：何时被抽出、何时审核通过 */
  appearAt: number
  checkAt: number
  failAt?: number
  fixAt?: number
  badQuote?: string
}

export const ITEMS: Item[] = [
  { id: 'it_01', type: 'change', title: '券改为满 300 减 30', topic: '券规则', owner: null, due: null, speaker: 'wangke', at: '00:00', quote: '券改成满 300 减 30', sensitivity: 'internal', appearAt: 4.9, checkAt: 6.0 },
  { id: 'it_02', type: 'action', title: '按新券规则改物料', topic: '券规则', owner: 'sunyue', due: '11/6', speaker: 'sunyue', at: '00:08', quote: '物料我 11 月 6 号前改完', sensitivity: 'internal', appearAt: 5.2, checkAt: 6.05 },
  { id: 'it_03', type: 'change', title: '上线从 11/11 提前到 11/8', topic: '上线时间', owner: null, due: '11/8', speaker: 'wangke', at: '00:13', quote: '提前到 8 号，留三天预热', sensitivity: 'internal', appearAt: 5.8, checkAt: 6.1 },
  { id: 'it_04', type: 'action', title: '交付拆分后的订单新接口', topic: '接口', owner: 'chenmo', due: '11/5', speaker: 'chenmo', at: '00:17', quote: '新接口我 11 月 5 号前给', sensitivity: 'internal', appearAt: 6.5, checkAt: 7.0 },
  { id: 'it_05', type: 'action', title: '客户端适配拆分后的订单接口', topic: '接口', owner: null, due: null, speaker: 'chenmo', at: '00:17', quote: '客户端也得跟着改', badQuote: '客户端要一起改', sensitivity: 'internal', flags: ['缺负责人', '缺截止'], appearAt: 6.8, failAt: 7.25, fixAt: 8.45, checkAt: 8.95 },
  { id: 'it_06', type: 'decision', title: '扩容先走 A 方案', topic: '扩容', owner: null, due: null, speaker: 'wangke', at: '00:35', quote: 'A 方案先推', sensitivity: 'internal', appearAt: 7.45, checkAt: 9.3 },
  { id: 'it_07', type: 'action', title: '扩容预算约 30 万，待财务签批', topic: '扩容', owner: 'zhouning', ownerBasis: '按角色', due: null, speaker: 'chenmo', at: '00:29', quote: '预算大概 30 万', sensitivity: 'restricted', redacted: '扩容按 A 方案推进（预算细节受限）', appearAt: 7.6, checkAt: 9.5 },
  { id: 'it_08', type: 'action', title: '按新券规则更新客服 FAQ', topic: '客服', owner: 'lilin', ownerBasis: '按角色', due: '11/7', speaker: 'wangke', at: '00:44', quote: '客服 7 号前把 FAQ 更新好', sensitivity: 'internal', appearAt: 9.3, checkAt: 9.6 },
  { id: 'it_09', type: 'risk', title: '周四前压测做不完，8 号上线有风险', topic: '扩容', owner: null, due: null, speaker: 'chenmo', at: '00:48', quote: '周四前压测做不完，8 号上线就悬', sensitivity: 'internal', appearAt: 7.75, checkAt: 9.35 },
  { id: 'it_10', type: 'action', title: '周四完成压测（硬节点）', topic: '扩容', owner: 'chenmo', due: '周四', speaker: 'wangke', at: '00:54', quote: '周四压测是硬节点，陈默负责', sensitivity: 'internal', appearAt: 7.9, checkAt: 9.4 },
]

export const TOPICS = [
  { name: '券规则', at: 3.1 },
  { name: '上线时间', at: 3.3 },
  { name: '接口', at: 3.5 },
  { name: '扩容', at: 3.7 },
  { name: '客服', at: 3.9 },
]

// ---------- 路由 ----------

export const REASONS: Record<string, string> = {
  R1: '被点名',
  R2: '被角色点到',
  R3: '负责的东西被提到',
  R4: '依赖的东西变了',
  R5: '订阅的话题',
  R6: '角色规则',
}

/** 收件人卡片上放不下全称时用的短标签 */
export const REASON_SHORT: Record<string, string> = {
  R1: '点名',
  R2: '角色',
  R3: '负责',
  R4: '依赖变了',
  R5: '订阅',
  R6: '规则',
}

export interface Route {
  item: string
  person: PersonId
  reasons: string[]
  at: number
}

export const ROUTES: Route[] = [
  { item: 'it_02', person: 'sunyue', reasons: ['R1'], at: 10.55 },
  { item: 'it_04', person: 'chenmo', reasons: ['R1'], at: 10.65 },
  { item: 'it_10', person: 'chenmo', reasons: ['R1'], at: 10.75 },
  { item: 'it_08', person: 'lilin', reasons: ['R2'], at: 10.85 },
  { item: 'it_06', person: 'chenmo', reasons: ['R3'], at: 10.95 },
  { item: 'it_09', person: 'chenmo', reasons: ['R3'], at: 11.05 },
  { item: 'it_01', person: 'sunyue', reasons: ['R3'], at: 11.15 },
  { item: 'it_01', person: 'linzong', reasons: ['R6'], at: 11.25 },
  { item: 'it_03', person: 'linzong', reasons: ['R6'], at: 11.32 },
  { item: 'it_06', person: 'linzong', reasons: ['R6'], at: 11.39 },
  { item: 'it_09', person: 'linzong', reasons: ['R6'], at: 11.46 },
  { item: 'it_05', person: 'zhaoyi', reasons: ['R2', 'R4'], at: 12.0 },
  { item: 'it_03', person: 'zhaoyi', reasons: ['R4'], at: 12.2 },
  { item: 'it_01', person: 'lilin', reasons: ['R4'], at: 12.5 },
  { item: 'it_03', person: 'lilin', reasons: ['R5'], at: 12.62 },
  { item: 'it_03', person: 'sunyue', reasons: ['R5'], at: 12.74 },
  { item: 'it_07', person: 'zhouning', reasons: ['R2'], at: 13.15 },
  { item: 'it_07', person: 'linzong', reasons: ['R6'], at: 13.3 },
]

export const QUIET_AT = 14.1
export const SENT_AT = 19.1

// ---------- 个人简报 ----------

export interface BriefEntry {
  item: string
  forYou: string
  why: string
  reasons: string[]
  facts?: { who?: string; what?: string; when?: string }
}

export interface Brief {
  person: PersonId
  headline: string
  readSeconds: number
  entries: BriefEntry[]
  editAt: number
}

export const BRIEFS: Brief[] = [
  {
    person: 'linzong', editAt: 15.3, readSeconds: 60,
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
    person: 'wangke', editAt: 15.85, readSeconds: 45,
    headline: '主持人版：10 条全部条目已分发给 6 个人；1 条待办没有负责人，建议给赵一。',
    entries: [],
  },
  {
    person: 'chenmo', editAt: 16.4, readSeconds: 20,
    headline: '你有 2 条待办：11/5 前交新接口；周四完成压测（硬节点）。',
    entries: [
      { item: 'it_04', forYou: '新接口 11/5 前交付，客户端会在之后适配。', why: '会上点了你的名', reasons: ['R1'], facts: { what: '订单新接口', who: '你', when: '11/5 前' } },
      { item: 'it_10', forYou: '周四压测是硬节点，由你负责。', why: '会上点了你的名', reasons: ['R1'], facts: { what: '压测', who: '你', when: '周四' } },
      { item: 'it_06', forYou: '扩容按你建议的 A 方案先推。', why: '你负责扩容', reasons: ['R3'] },
      { item: 'it_09', forYou: '你提的压测风险已记录，林总会看到。', why: '你负责压测', reasons: ['R3'] },
    ],
  },
  {
    person: 'sunyue', editAt: 16.95, readSeconds: 20,
    headline: '你有 1 条待办：11/6 前按新券规则改完物料；上线提前到 11/8。',
    entries: [
      { item: 'it_02', forYou: '物料要在 11/6 前改完。', why: '会上点了你的名', reasons: ['R1'], facts: { what: '活动物料', who: '你', when: '11/6 前' } },
      { item: 'it_01', forYou: '券改为满 300 减 30，物料按新面额改。', why: '你负责的物料依赖券规则', reasons: ['R3'] },
      { item: 'it_03', forYou: '上线提前到 11/8，留三天预热。', why: '你订阅了「上线时间」', reasons: ['R5'] },
    ],
  },
  {
    person: 'zhaoyi', editAt: 17.5, readSeconds: 20,
    headline: '这场会和你有关的 2 件事：订单接口字段要拆（客户端适配，负责人待你确认）；活动提前到 11/8 上线。',
    entries: [
      { item: 'it_05', forYou: '后端 11/5 前给新接口，之后客户端需要适配。会上没定负责人，建议是你。', why: '你负责客户端，且依赖「订单接口」', reasons: ['R2', 'R4'], facts: { what: 'coupon_amount 拆成两个字段', who: '待你确认', when: '11/5 之后' } },
      { item: 'it_03', forYou: '上线提前到 11/8，客户端发版要跟着排。', why: '你依赖「活动页」的上线时间', reasons: ['R4'] },
    ],
  },
  {
    person: 'lilin', editAt: 18.0, readSeconds: 20,
    headline: '你有 1 条待办：11/7 前按新券规则更新客服 FAQ；上线提前到 11/8。',
    entries: [
      { item: 'it_08', forYou: '客服 FAQ 要在 11/7 前更新好。', why: '会上点到了「客服」', reasons: ['R2'], facts: { what: '客服 FAQ 和话术', who: '你（按角色）', when: '11/7 前' } },
      { item: 'it_01', forYou: '券改为满 300 减 30，FAQ 和话术按新规则写。', why: '客服话术依赖券规则', reasons: ['R4'] },
      { item: 'it_03', forYou: '上线提前到 11/8。', why: '你订阅了「上线时间」', reasons: ['R5'] },
    ],
  },
  {
    person: 'zhouning', editAt: 18.45, readSeconds: 10,
    headline: '只有 1 件事：A 方案扩容预算约 30 万，待你签批。',
    entries: [
      { item: 'it_07', forYou: '扩容预算约 30 万，需要财务签批。', why: '会上点到了「财务」', reasons: ['R2'], facts: { what: 'A 方案扩容预算', who: '你（按角色）', when: '待签批' } },
    ],
  },
  {
    person: 'wutong', editAt: 0, readSeconds: 0,
    headline: '这场会没有需要你必读的内容，上线日期的变化已放进日报。',
    entries: [],
  },
]

export const briefOf = (id: PersonId) => BRIEFS.find(b => b.person === id)!
export const itemById = (id: string) => ITEMS.find(i => i.id === id)!

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
