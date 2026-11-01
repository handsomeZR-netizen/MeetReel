// 主案例“小米汽车安全专场直播”的智能分发剧本：8 个智能体在 20 秒里把 9 分 49 秒的直播拆成每人一份简报。
// 所有状态都从演示时钟 t（秒）推导；结果是预置的（简报来自 data/cases/xiaomi-safety/briefs.json），
// 后端接好后由 /meetings/{id}/process 流式返回。

import { MODELS, modelById, personById, type IconKey, type ModelId, type PersonId } from './model'
import { meetingById, type Item } from './meetings'
import { XM_BRIEFS as briefsJson, XM_EN } from './xm-en'
import { L, isEn } from '@/lib/i18n'

export const RUN_ID = 'xm_safety'
export const RUN_MEETING = meetingById(RUN_ID)!

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
  { id: 'orc', name: L('调度官', 'Orchestrator'), duty: L('维护账本，调度其他智能体', 'Keeps the ledger, dispatches the other agents'), color: '#52525B', bright: '#A1A1AA' },
  { id: 'scribe', name: L('场记', 'Scribe'), duty: L('转写、说话人映射', 'Transcription, speaker mapping'), color: '#0D9488', bright: '#2DD4BF' },
  { id: 'topic', name: L('议题官', 'Topic agent'), duty: L('切分议题', 'Splits the topics'), color: '#4F46E5', bright: '#818CF8' },
  { id: 'ext', name: L('抽取官', 'Extractor'), duty: L('抽 6 类条目，附原话', 'Pulls 6 kinds of items, each with a quote'), color: '#9333EA', bright: '#C084FC' },
  { id: 'aud', name: L('审核官', 'Auditor'), duty: L('原话校验、说话人、绝对化表述', 'Checks quotes, speakers, absolute claims'), color: '#D97706', bright: '#F59E0B' },
  { id: 'router', name: L('路由官', 'Router'), duty: L('相关性 × 权限', 'Relevance × permissions'), color: '#2563EB', bright: '#60A5FA' },
  { id: 'editor', name: L('编辑官', 'Editor'), duty: L('按人改写“对你意味着什么”', 'Rewrites “what this means for you” per person'), color: '#059669', bright: '#34D399' },
  { id: 'disp', name: L('投递官', 'Courier'), duty: L('飞书卡片、H5', 'Lark cards, web links'), color: '#E11D48', bright: '#FB7185' },
]

export const agentById = (id: AgentId) => AGENTS.find(a => a.id === id)!

// ---------- 多模型协同：每个智能体按偏好在已选模型里挑一个 ----------

const LLM_AGENTS: AgentId[] = ['topic', 'ext', 'aud', 'router', 'editor']
const ALL = MODELS.map(m => m.id)

/** 偏好顺序：议题切分要中文长文本，抽取要稳和便宜，审核要严，路由要守规则，改写要文笔 */
const PREFS: Record<string, ModelId[]> = {
  topic: ['qwen', 'deepseek', 'glm', 'kimi', 'doubao', 'ernie', 'hunyuan'],
  ext: ['deepseek', 'qwen', 'glm', 'kimi', 'doubao'],
  aud: ['claude', 'gpt', 'gemini', 'deepseek', 'qwen', 'glm'],
  router: ['glm', 'qwen', 'deepseek', 'claude', 'gpt'],
  editor: ['kimi', 'doubao', 'minimax', 'qwen', 'deepseek', 'claude'],
}

export function pickModel(agent: AgentId, models: ModelId[]): ModelId {
  const order = [...(PREFS[agent] ?? []), ...ALL]
  return order.find(id => models.includes(id)) ?? models[0] ?? 'deepseek'
}

export interface ModelBadge { icon: IconKey; label: string }

export function agentModel(agent: AgentId, models: ModelId[]): ModelBadge {
  if (agent === 'orc') return { icon: 'code', label: L('编排代码', 'Orchestration code') }
  if (agent === 'scribe') return { icon: 'modelscope', label: 'FunASR · Paraformer' }
  if (agent === 'disp') return { icon: 'send', label: L('飞书机器人 · H5', 'Lark bot · Web') }
  const id = pickModel(agent, models)
  const rule = agent === 'aud' || agent === 'router' ? L('规则 + ', 'Rules + ') : ''
  return { icon: id, label: `${rule}${modelById(id).label}` }
}

/** 这次编排实际用到的模型（去重，按智能体顺序） */
export const usedModels = (models: ModelId[]) => [...new Set(LLM_AGENTS.map(a => pickModel(a, models)))]

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
/** 投递前停下来，等发布者确认 */
export const GATE_AT = 18.55

export const SPANS: Span[] = [
  { agent: 'orc', start: 0, end: 0.8, kind: 'think', title: L('读取直播录像，加载 8 份关注档案', 'Read the livestream recording, load 8 interest profiles'), tokens: 600 },
  { agent: 'orc', start: 0.8, end: 9.9, kind: 'wait', title: L('等待账本定稿', 'Waiting for the ledger to be final') },
  { agent: 'orc', start: 9.9, end: 10.3, kind: 'think', title: L('账本定稿：20 条，全部有原话', 'Ledger final: 20 items, all quoted'), tokens: 500, note: L('交给路由官：20 条 × 8 人', 'To Router: 20 items × 8 people') },
  { agent: 'orc', start: 10.3, end: 19.25, kind: 'wait', title: L('等待路由、改写、投递', 'Waiting on routing, rewriting, delivery') },
  { agent: 'orc', start: 19.25, end: 19.95, kind: 'think', title: L('汇总：7 份简报，1 人未打扰', 'Wrap-up: 7 briefs, 1 person not pinged'), tokens: 400 },

  { agent: 'scribe', start: 0.95, end: 1.7, kind: 'tool', title: L('切分发言：92 段 · 9 分 49 秒', 'Segment speech: 92 segments · 9 min 49 s'), tokens: 0 },
  { agent: 'scribe', start: 1.75, end: 2.6, kind: 'think', title: L('说话人：雷军 · 侯静雷 · 丁志 · 爽哥；纠错 7 处', 'Speakers: Lei Jun · Hou Jinglei · Ding Zhi · Shuang; 7 fixes'), tokens: 900, note: L('交给调度官：4 位发言人，修正 2 处说错人', 'To Orchestrator: 4 speakers, 2 misattributions fixed') },

  { agent: 'topic', start: 2.85, end: 3.9, kind: 'think', title: L('切分 9 个章节', 'Split into 9 chapters'), tokens: 3600 },
  { agent: 'topic', start: 3.95, end: 4.4, kind: 'tool', title: L('生成议题地图', 'Build the topic map'), tokens: 500, note: L('交给抽取官：目标 / 组织 / 机制 / 全域安全 / 用车安全', 'To Extractor: goal / org / mechanism / full-domain safety / safety in use') },

  { agent: 'ext', start: 4.6, end: 5.4, kind: 'tool', title: L('开场 → xm_01 – xm_04', 'Opening → xm_01 – xm_04'), tokens: 2600 },
  { agent: 'ext', start: 5.45, end: 6.1, kind: 'tool', title: L('目标 · 组织 → xm_05 – xm_08', 'Goal · org → xm_05 – xm_08'), tokens: 2400 },
  { agent: 'ext', start: 6.15, end: 7.0, kind: 'tool', title: L('评审机制 → xm_09 – xm_11', 'Review gate → xm_09 – xm_11'), tokens: 2200 },
  { agent: 'ext', start: 7.05, end: 8.0, kind: 'tool', title: L('全域安全 → xm_12 – xm_15', 'Full-domain safety → xm_12 – xm_15'), tokens: 3000 },
  { agent: 'ext', start: 8.05, end: 8.6, kind: 'retry', title: L('重抽 xm_08：原话逐字对齐，改挂爽哥', 'Re-extract xm_08: quote aligned word for word, reattributed to Shuang'), tokens: 900, note: L('交给审核官：“超过了3500人”是爽哥说的，侯静雷确认', 'To Auditor: “Over 3,500 people” was said by Shuang, confirmed by Hou Jinglei') },
  { agent: 'ext', start: 8.75, end: 9.55, kind: 'tool', title: L('用车安全 → xm_16 – xm_20', 'Safety in use → xm_16 – xm_20'), tokens: 2800 },

  { agent: 'aud', start: 5.4, end: 6.2, kind: 'think', title: L('校验原话 xm_01 – xm_04', 'Check quotes xm_01 – xm_04'), tokens: 900 },
  { agent: 'aud', start: 6.3, end: 7.15, kind: 'think', title: L('校验原话 xm_05 – xm_10', 'Check quotes xm_05 – xm_10'), tokens: 1000 },
  { agent: 'aud', start: 7.2, end: 7.75, kind: 'fail', title: L('xm_08 原话不在转写里', 'xm_08 quote isn’t in the transcript'), note: L('打回抽取官：转写里没有“安全团队有3500人”，这句也不是侯静雷说的', 'Sent back to Extractor: “the safety team has 3,500 people” isn’t in the transcript, and Hou Jinglei didn’t say it') },
  { agent: 'aud', start: 8.65, end: 9.2, kind: 'tool', title: L('标注 xm_18：绝对化表述、待核实', 'Flag xm_18: absolute claim, unverified'), tokens: 700 },
  { agent: 'aud', start: 9.25, end: 9.7, kind: 'tool', title: L('标注 xm_02 · xm_11 本段未覆盖；全部公开', 'Flag xm_02 · xm_11 not in this clip; all public'), tokens: 400, note: L('交给调度官：20 条全部有原话', 'To Orchestrator: all 20 items quoted') },

  { agent: 'router', start: 10.45, end: 11.5, kind: 'tool', title: L('R3 负责的东西被提到：命中 14 条', 'R3 something they own came up: 14 hits') },
  { agent: 'router', start: 11.6, end: 12.9, kind: 'think', title: L('R6 管理者规则：目标、组织、投入 → 韩总', 'R6 manager rule: goal, org, investment → GM Han'), tokens: 2600, note: L('同一句“同档最安全”发给 3 个人，理由各不同', 'The same “safest in class” line goes to 3 people, each for a different reason') },
  { agent: 'router', start: 13.0, end: 13.7, kind: 'tool', title: L('R5 订阅：命中 9 条', 'R5 follows: 9 hits') },
  { agent: 'router', start: 13.75, end: 14.4, kind: 'think', title: L('许诺只关注电子安全，本段没有 → 不推送', 'Xu Nuo only follows electronic safety, not in this clip → no ping'), tokens: 600, note: L('交给编辑官：7 人待改写', 'To Editor: 7 people to rewrite for') },

  { agent: 'editor', start: 14.75, end: 15.3, kind: 'tool', title: L('改写：韩总 · 5 条', 'Rewrite: GM Han · 5 items'), tokens: 1300 },
  { agent: 'editor', start: 15.35, end: 15.85, kind: 'tool', title: L('改写：江晚 · 发布者版', 'Rewrite: Jiang Wan · publisher version'), tokens: 1100 },
  { agent: 'editor', start: 15.9, end: 16.4, kind: 'tool', title: L('改写：宋岚 · 6 条', 'Rewrite: Song Lan · 6 items'), tokens: 1400 },
  { agent: 'editor', start: 16.45, end: 16.95, kind: 'tool', title: L('改写：魏然 · 4 条', 'Rewrite: Wei Ran · 4 items'), tokens: 1000 },
  { agent: 'editor', start: 17.0, end: 17.5, kind: 'tool', title: L('改写：程橙 · 3 条', 'Rewrite: Cheng Cheng · 3 items'), tokens: 800 },
  { agent: 'editor', start: 17.55, end: 18.0, kind: 'tool', title: L('改写：高远 · 4 条', 'Rewrite: Gao Yuan · 4 items'), tokens: 1000 },
  { agent: 'editor', start: 18.05, end: 18.45, kind: 'tool', title: L('改写：邓凯 · 3 条', 'Rewrite: Deng Kai · 3 items'), tokens: 800, note: L('交给投递官：7 份简报', 'To Courier: 7 briefs') },

  { agent: 'disp', start: 18.7, end: 19.1, kind: 'tool', title: L('生成 7 张飞书卡片 · 7 个 H5 链接', 'Generate 7 Lark cards · 7 web links') },
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
  { at: 0.05, agent: 'orc', text: L('收到直播录像：9 分 49 秒，竖屏，8 位收件人', 'Got the livestream recording: 9 min 49 s, vertical, 8 recipients') },
  { at: 1.0, agent: 'scribe', text: L('切分发言 92 段', 'Split speech into 92 segments') },
  { at: 2.0, agent: 'scribe', text: L('说话人映射：雷军、侯静雷、丁志、爽哥；“景雷”纠正为“静雷”', 'Speaker map: Lei Jun, Hou Jinglei, Ding Zhi, Shuang; ASR’s “Jing Lei” corrected to “Jinglei”') },
  { at: 3.2, agent: 'topic', text: L('识别 9 个章节：目标 · 组织 · 机制 · 全域安全 · 安全预防团队…', 'Found 9 chapters: goal · org · mechanism · full-domain safety · safety prevention team…') },
  { at: 4.9, agent: 'ext', text: L('新增信息 xm_01：交付权益加送 699 元智能双表盘', 'New info xm_01: free ¥699 smart dual-screen dash as a delivery perk') },
  { at: 5.6, agent: 'ext', text: L('新增决议 xm_06：安全目标“做同档最安全的车”', 'New decision xm_06: safety goal “build the safest car in its class”') },
  { at: 6.05, agent: 'ext', text: L('新增信息 xm_08：安全相关团队 3500 人', 'New info xm_08: safety-related teams of 3,500 people') },
  { at: 6.6, agent: 'ext', text: L('新增决议 xm_10：安全有一票否决权', 'New decision xm_10: safety has veto power') },
  { at: 7.25, agent: 'aud', text: L('xm_08 原话校验失败（不是逐字原话，说话人也不对），打回抽取官', 'xm_08 failed the quote check (not verbatim, wrong speaker) — sent back to Extractor') },
  { at: 7.6, agent: 'ext', text: L('新增 xm_12 – xm_15：全域安全部、4 大场景 19 个领域、座椅夹手、二次伤害', 'New xm_12 – xm_15: Full-Domain Safety, 4 scenarios / 19 domains, seat pinch, secondary injury') },
  { at: 8.4, agent: 'ext', text: L('重抽 xm_08：原话“超过了3500人”，爽哥说、侯静雷确认', 'Re-extracted xm_08: quote “Over 3,500 people”, said by Shuang, confirmed by Hou Jinglei') },
  { at: 8.95, agent: 'aud', text: L('xm_18 “应该是行业内首个”：绝对化表述，标记待核实', 'xm_18 “should be the first in the industry”: absolute claim, flagged unverified') },
  { at: 9.3, agent: 'ext', text: L('新增 xm_16 – xm_20：交付后安全、484 场培训、90 天打卡、安全分 2.0', 'New xm_16 – xm_20: post-delivery safety, 484 trainings, 90-day check-in, safety score 2.0') },
  { at: 9.5, agent: 'aud', text: L('xm_02 电子安全、xm_11 第三个团队：本段未覆盖', 'xm_02 electronic safety, xm_11 third team: not in this clip') },
  { at: 10.0, agent: 'orc', text: L('账本定稿：20 条，全部带原话，全部公开', 'Ledger final: 20 items, all quoted, all public') },
  { at: 10.7, agent: 'router', text: L('直播里没点任何一个收件人的名，R1 / R2 命中 0 条', 'The stream names none of our recipients — R1 / R2: 0 hits') },
  { at: 11.2, agent: 'router', text: L('R3 负责：座椅、碰撞 → 魏然；安委会、评审 → 宋岚；积分、App → 程橙', 'R3 owns: seats, crash → Wei Ran; committee, reviews → Song Lan; points, app → Cheng Cheng') },
  { at: 12.0, agent: 'router', text: L('R6 管理者规则：竞品目标、组织机制、投入规模 → 韩总', 'R6 manager rule: competitor goals, org & mechanisms, investment → GM Han') },
  { at: 12.5, agent: 'router', text: L('“同档最安全” → 韩总（目标）· 江晚（口径）· 邓凯（门店会被问）', '“Safest in class” → GM Han (goal) · Jiang Wan (messaging) · Deng Kai (stores will be asked)') },
  { at: 13.3, agent: 'router', text: L('R5 订阅：宋岚「竞品安全体系」、高远「车主培训」、邓凯「竞品卖点」…', 'R5 follows: Song Lan “Competitor safety system”, Gao Yuan “Owner training”, Deng Kai “Competitor selling points”…') },
  { at: 14.1, agent: 'router', text: L('许诺：只关注电子安全，本段没有，不打扰', 'Xu Nuo: only follows electronic safety, not in this clip — no ping') },
  { at: 14.8, agent: 'editor', text: L('改写韩总的简报：5 条，约 50 秒', 'Rewrote GM Han’s brief: 5 items, about 50 s') },
  { at: 16.0, agent: 'editor', text: L('改写宋岚的简报：4 条必读 + 2 条建议看', 'Rewrote Song Lan’s brief: 4 must-reads + 2 suggested') },
  { at: 18.1, agent: 'editor', text: L('改写邓凯的简报：699 元表盘进权益对比表', 'Rewrote Deng Kai’s brief: the ¥699 dash goes into the perk comparison') },
  { at: 18.8, agent: 'disp', text: L('已生成 7 张飞书卡片', 'Generated 7 Lark cards') },
  { at: 19.5, agent: 'orc', text: L('完成：8 个收件人，7 份不同的简报，1 人没被打扰', 'Done: 8 recipients, 7 different briefs, 1 person not pinged') },
]

/** 账本条目在编排里的时间：何时被抽出、何时审核通过；xm_08 先被打回再重抽 */
export const ITEM_RUN: Record<string, { appearAt: number; checkAt: number; failAt?: number; fixAt?: number; badQuote?: string }> = {
  xm_01: { appearAt: 4.75, checkAt: 5.95 },
  xm_02: { appearAt: 4.95, checkAt: 9.5 },
  xm_03: { appearAt: 5.1, checkAt: 6.05 },
  xm_04: { appearAt: 5.3, checkAt: 6.15 },
  xm_05: { appearAt: 5.55, checkAt: 6.9 },
  xm_06: { appearAt: 5.7, checkAt: 6.95 },
  xm_07: { appearAt: 5.85, checkAt: 7.0 },
  xm_08: { appearAt: 6.05, failAt: 7.25, fixAt: 8.45, checkAt: 8.95, badQuote: isEn ? XM_EN.badQuote : '安全团队有3500人' },
  xm_09: { appearAt: 6.35, checkAt: 7.05 },
  xm_10: { appearAt: 6.6, checkAt: 7.1 },
  xm_11: { appearAt: 6.85, checkAt: 9.55 },
  xm_12: { appearAt: 7.2, checkAt: 9.2 },
  xm_13: { appearAt: 7.4, checkAt: 9.25 },
  xm_14: { appearAt: 7.6, checkAt: 9.3 },
  xm_15: { appearAt: 7.8, checkAt: 9.35 },
  xm_16: { appearAt: 8.8, checkAt: 9.6 },
  xm_17: { appearAt: 8.85, checkAt: 9.62 },
  xm_18: { appearAt: 8.9, checkAt: 9.15 },
  xm_19: { appearAt: 9.3, checkAt: 9.64 },
  xm_20: { appearAt: 9.45, checkAt: 9.68 },
}

// 编排剧本给每条推送排上出现时刻：R3 → R6 → R5，和路由官的三段一致
{
  const slots: Record<string, [number, number]> = { R3: [10.55, 11.45], R6: [11.7, 12.8], R5: [13.05, 13.65] }
  for (const [k, [a, b]] of Object.entries(slots)) {
    const rs = RUN_MEETING.routes.filter(r => r.reasons[0] === k)
    rs.forEach((r, i) => { r.at = a + ((b - a) * i) / Math.max(1, rs.length - 1) })
  }
}

export const RUN_TOPICS = [
  { name: L('目标', 'Goal'), at: 3.1 },
  { name: L('组织', 'Org'), at: 3.3 },
  { name: L('机制', 'Mechanism'), at: 3.5 },
  { name: L('全域安全', 'Full-domain safety'), at: 3.7 },
  { name: L('用车安全', 'Safety in use'), at: 3.9 },
]

export const QUIET_AT = 14.1
export const SENT_AT = 19.1

// ---------- 个人简报（主案例是编辑官逐人改写的） ----------

export interface BriefEntry {
  item: string
  forYou: string
  why: string
  reasons: string[]
  tier?: 'must' | 'should'
  facts?: { who?: string; what?: string; when?: string }
}

export interface Brief {
  person: PersonId
  meeting: string
  headline: string
  readSeconds: number
  entries: BriefEntry[]
  /** 发布者版：看全部条目和分发情况 */
  host?: boolean
  /** 演示时钟：编辑官写好的时刻 */
  editAt?: number
}

const EDIT_AT: Partial<Record<PersonId, number>> = {
  hanzong: 15.3, jiangwan: 15.85, songlan: 16.4, weiran: 16.95, chengcheng: 17.5, gaoyuan: 18.0, dengkai: 18.45,
}

const bj = briefsJson as unknown as { briefs: Brief[]; quiet: { person: PersonId; meeting: string; headline: string }[]; hostBrief: Brief }

/** 发布者江晚拿到的是发布者版（全部条目 + 谁收到了），她自己的 3 条收件内容也在里面 */
export const RUN_BRIEFS: Brief[] = [
  ...bj.briefs.filter(b => b.person !== bj.hostBrief.person),
  bj.hostBrief,
  ...bj.quiet.map(q => ({ person: q.person, meeting: q.meeting, headline: q.headline, readSeconds: 0, entries: [] })),
].map(b => ({ ...b, editAt: EDIT_AT[b.person] ?? 0 }))

export const runBrief = (pid: PersonId) => RUN_BRIEFS.find(b => b.person === pid)!

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
  { id: 'read', label: L('读取', 'Read'), agent: 'orc', start: 0, end: 0.95 },
  { id: 'scribe', label: L('转写', 'Transcribe'), agent: 'scribe', start: 0.95, end: 2.7 },
  { id: 'topic', label: L('议题', 'Topics'), agent: 'topic', start: 2.7, end: 4.5 },
  { id: 'extract', label: L('抽取 · 审核', 'Extract · audit'), agent: 'ext', start: 4.5, end: 9.9 },
  { id: 'route', label: L('路由', 'Route'), agent: 'router', start: 9.9, end: 14.5 },
  { id: 'edit', label: L('改写', 'Rewrite'), agent: 'editor', start: 14.5, end: 18.55 },
  { id: 'send', label: L('投递', 'Deliver'), agent: 'disp', start: 18.55, end: 20.01 },
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

/** 按每个智能体实际用的模型计价（演示用粗估） */
export function costAt(t: number, models: ModelId[]) {
  return SPANS.reduce((s, g) => {
    if (!LLM_AGENTS.includes(g.agent) || !g.tokens) return s
    const price = modelById(pickModel(g.agent, models)).yuanPerM
    return s + ((g.tokens * clamp01((t - g.start) / (g.end - g.start))) / 1e6) * price
  }, 0)
}

export function costText(t: number, models: ModelId[]) {
  const c = costAt(t, models)
  if (!c) return L('自有算力', 'Self-hosted')
  // 英文界面按美元粗估（7.2 汇率，演示用）
  const v = isEn ? c / 7.2 : c
  return `≈ ${isEn ? '$' : '¥'}${v.toFixed(v < 0.1 ? 3 : 2)}`
}

export const runRoutesAt = (t: number) => RUN_MEETING.routes.filter(r => (r.at ?? 0) <= t)

export const isQuietIn = (pid: PersonId) => {
  const b = runBrief(pid)
  return b.entries.length === 0 && !b.host
}
export const readyAt = (pid: PersonId) => (isQuietIn(pid) ? QUIET_AT : runBrief(pid).editAt ?? 0)

/** 展示顺序：发布者、高管在前，不打扰的人在最后 */
export const RUN_PEOPLE: PersonId[] = ['jiangwan', 'hanzong', 'songlan', 'weiran', 'chengcheng', 'gaoyuan', 'dengkai', 'xunuo']
export const RUN_PEOPLE_SORTED = RUN_PEOPLE.map(personById)

/** 智能体之间的交接 */
export const EDGES: { from: AgentId; to: AgentId; at: number; label: string }[] = [
  { from: 'orc', to: 'scribe', at: 0.8, label: L('派发转写', 'Transcribe') },
  { from: 'scribe', to: 'orc', at: 2.6, label: L('4 位发言人', '4 speakers') },
  { from: 'orc', to: 'topic', at: 2.7, label: L('派发议题', 'Topics') },
  { from: 'topic', to: 'ext', at: 4.4, label: L('9 个章节', '9 chapters') },
  { from: 'ext', to: 'aud', at: 5.4, label: L('送审 xm_01–04', 'Review xm_01–04') },
  { from: 'aud', to: 'ext', at: 7.7, label: L('打回 xm_08', 'Reject xm_08') },
  { from: 'ext', to: 'aud', at: 8.6, label: L('重抽后复核', 'Re-check') },
  { from: 'aud', to: 'orc', at: 9.7, label: L('20 条全部有原话', 'All 20 quoted') },
  { from: 'orc', to: 'router', at: 10.3, label: L('20 条 × 8 人', '20 items × 8 people') },
  { from: 'router', to: 'editor', at: 14.4, label: L('7 人待改写', '7 to rewrite') },
  { from: 'editor', to: 'disp', at: 18.45, label: L('7 份简报', '7 briefs') },
  { from: 'disp', to: 'orc', at: 19.1, label: L('已送达', 'Delivered') },
]
