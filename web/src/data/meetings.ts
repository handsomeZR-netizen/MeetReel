// 会议数据：主案例“小米汽车安全专场直播”（真实录像 + 转写，数据在 data/cases/xiaomi-safety/），
// 加上同一家虚构车企本周的三场内部会议。内部会议和直播互相印证，知识库、路由理由都会跨会议引用。
// 每条条目的 quote 必须是所在发言段 text 的子串，溯源（视频定位、逐字稿高亮）靠它算位置。

import type { ItemType, PersonId, ProjectId, Sensitivity } from './model'
import xmJson from '../../../data/cases/xiaomi-safety/meeting.json'
import xmVideo from '../../../data/video/196d80ece5e9f2c22fd9f93f35b988c2.mp4?url'
import xmPoster from '../../../data/cases/xiaomi-safety/poster.jpg'

export interface Segment {
  id: string
  speaker: PersonId
  start: number
  end: number
  text: string
}

export interface Item {
  id: string
  meeting: string
  type: ItemType
  title: string
  detail?: string
  topic: string
  owner: PersonId | null
  ownerBasis?: string
  suggestedOwner?: PersonId
  due: string | null
  /** 原话所在的发言段 */
  seg: string
  quote: string
  sensitivity: Sensitivity
  visibleTo?: PersonId[]
  redacted?: string
  flags?: string[]
}

export interface Route {
  item: string
  person: PersonId
  reasons: string[]
  /** must = 必读，should = 建议看 */
  tier?: 'must' | 'should'
  /** 编排演示里这条推送出现的时刻（秒） */
  at?: number
}

export interface Chapter { name: string; start: number; end: number }

export type MeetingStatus = 'ready' | 'sent'

export interface Meeting {
  id: string
  title: string
  project: ProjectId
  date: string
  time: string
  duration: number
  /** 会上的主持人（直播里是雷军） */
  host: PersonId
  /** 发布者：上传、确认分发的人；收件人看到“谁发来的” */
  publisher: PersonId
  attendees: PersonId[]
  /** 收到者候选：路由官在这些人里判断要不要打扰 */
  related: PersonId[]
  source: '录音' | '飞书妙记' | '会议录像' | '直播录像'
  kind: string
  /** 外部会议（发布会、直播）：发言人不是公司员工 */
  external?: boolean
  summary: string
  chapters: Chapter[]
  segments: Segment[]
  items: Item[]
  routes: Route[]
  /** 真实录像（竖屏直播） */
  video?: { src: string; poster: string; width: number; height: number }
  /** 初始状态：ready = 已转写、待分发 */
  status: MeetingStatus
  /** 已经确认过的待办（会前就存在的回流） */
  confirmed: string[]
}

type ItemInput = Omit<Item, 'meeting' | 'sensitivity'> & { sensitivity?: Sensitivity }
const items = (meeting: string, list: ItemInput[]): Item[] => list.map(x => ({ sensitivity: 'internal', ...x, meeting }))

// ---------------- 小米汽车安全专场直播（主案例） ----------------

const raw = xmJson as unknown as Omit<Meeting, 'publisher' | 'kind' | 'video'> & { dispatcher: PersonId; video: { width: number; height: number } }

export const XM: Meeting = {
  ...raw,
  publisher: raw.dispatcher,
  source: '直播录像',
  kind: '竞品直播',
  external: true,
  video: { src: xmVideo, poster: xmPoster, width: raw.video.width, height: raw.video.height },
  status: 'ready',
  confirmed: [],
}

// ---------------- 安全周会（内部，虚构） ----------------

const SF: Meeting = {
  id: 'sf_weekly',
  title: '安全周会 · 安委会评审机制',
  project: 'p_safety',
  date: '2026-10-28',
  time: '14:00',
  duration: 66,
  host: 'songlan',
  publisher: 'songlan',
  attendees: ['songlan', 'weiran', 'xunuo', 'tangchuan'],
  related: ['songlan', 'hanzong', 'weiran', 'xunuo', 'tangchuan', 'jiangwan', 'gaoyuan'],
  source: '会议录像',
  kind: '周会',
  summary: '安委会现在只做事后通报、评审里没有否决权；宋岚下月经营会提方案，让安全评审变成一道关。座椅回位夹手的投诉要补进开发阶段清单（魏然 11/7）；OTA 大版本做功能安全全量复核（许诺）。安委会改常设需要追加编制和预算（受限）。竞品安全专场直播由江晚跟进、按人分发。',
  chapters: [
    { name: '安委会评审', start: 0, end: 15.6 },
    { name: '座椅夹手投诉', start: 15.6, end: 29.6 },
    { name: 'OTA 功能安全', start: 29.6, end: 41.6 },
    { name: '组织与编制', start: 41.6, end: 50.6 },
    { name: '竞品直播', start: 50.6, end: 66 },
  ],
  segments: [
    { id: 's01', speaker: 'songlan', start: 0, end: 7.4, text: '今天主要对一下安委会评审的事。现在我们的安委会只做事后通报，评审里没有否决权，项目能带着安全问题往下走。' },
    { id: 's02', speaker: 'songlan', start: 7.8, end: 15.2, text: '我想在下个月的经营会上提一个方案，让安全评审变成一道关，过不了就不能进下一个阶段。' },
    { id: 's03', speaker: 'weiran', start: 15.6, end: 22.4, text: '座椅这块上周又有一个投诉，电动座椅回位的时候夹到了小孩的手，开发阶段没有这个工况。' },
    { id: 's04', speaker: 'songlan', start: 22.8, end: 29.2, text: '这个要补进开发阶段的安全检查清单，魏然你牵头，11 月 7 号前给我一版，唐川配合整理评审记录。' },
    { id: 's05', speaker: 'xunuo', start: 29.6, end: 36.6, text: '电子电气这边，OTA 升级之后的功能安全复核现在还是抽查，我建议每次大版本都全量过一遍。' },
    { id: 's06', speaker: 'songlan', start: 37.0, end: 41.2, text: '可以，许诺你先出一个复核流程，下次周会过。' },
    { id: 's07', speaker: 'songlan', start: 41.6, end: 50.2, text: '另外组织上，安委会要改成常设机构，需要追加 2 个编制、预算大概 80 万，这个我单独和韩总汇报。' },
    { id: 's08', speaker: 'weiran', start: 50.6, end: 56.4, text: '还有一个，竞品那边这周要做安全专场直播，我们要不要盯一下？' },
    { id: 's09', speaker: 'songlan', start: 56.8, end: 66, text: '江晚那边在跟，直播完让她按人发一下，我们组重点看组织和机制。' },
  ],
  items: items('sf_weekly', [
    { id: 'sf_01', type: 'risk', title: '安委会评审没有否决权，项目能带着安全问题往下走', topic: '评审机制', owner: null, due: null, seg: 's01', quote: '评审里没有否决权' },
    { id: 'sf_02', type: 'decision', title: '下月经营会提方案：安全评审变成一道关', detail: '过不了就不能进下一个阶段', topic: '评审机制', owner: 'songlan', due: '11 月经营会', seg: 's02', quote: '让安全评审变成一道关' },
    { id: 'sf_03', type: 'risk', title: '电动座椅回位夹手投诉，开发阶段缺这个工况', topic: '座椅安全', owner: null, due: null, seg: 's03', quote: '电动座椅回位的时候夹到了小孩的手' },
    { id: 'sf_04', type: 'action', title: '座椅夹手补进开发阶段安全检查清单', topic: '座椅安全', owner: 'weiran', due: '11/7', seg: 's04', quote: '魏然你牵头，11 月 7 号前给我一版' },
    { id: 'sf_05', type: 'action', title: '整理座椅相关的评审记录', topic: '座椅安全', owner: 'tangchuan', due: '11/7', seg: 's04', quote: '唐川配合整理评审记录' },
    { id: 'sf_06', type: 'action', title: '出 OTA 大版本功能安全全量复核流程', topic: 'OTA 功能安全', owner: 'xunuo', due: '下次周会', seg: 's06', quote: '许诺你先出一个复核流程' },
    { id: 'sf_07', type: 'decision', title: '安委会改常设：追加 2 个编制、预算约 80 万', topic: '安全组织', owner: 'songlan', due: null, seg: 's07', quote: '需要追加 2 个编制、预算大概 80 万', sensitivity: 'restricted', visibleTo: ['songlan', 'hanzong', 'jiangwan'], redacted: '安委会改为常设机构（编制和预算仅限名单内）' },
    { id: 'sf_08', type: 'action', title: '跟进竞品安全专场直播，直播完按人分发', topic: '竞品安全体系', owner: 'jiangwan', due: '直播后', seg: 's09', quote: '直播完让她按人发一下' },
  ]),
  routes: [
    { item: 'sf_04', person: 'weiran', reasons: ['R1'] },
    { item: 'sf_05', person: 'tangchuan', reasons: ['R1'] },
    { item: 'sf_06', person: 'xunuo', reasons: ['R1'] },
    { item: 'sf_08', person: 'jiangwan', reasons: ['R1'] },
    { item: 'sf_01', person: 'hanzong', reasons: ['R6'] },
    { item: 'sf_02', person: 'hanzong', reasons: ['R6'] },
    { item: 'sf_07', person: 'hanzong', reasons: ['R6'] },
    { item: 'sf_02', person: 'tangchuan', reasons: ['R4'] },
    { item: 'sf_03', person: 'gaoyuan', reasons: ['R5'] },
    { item: 'sf_01', person: 'jiangwan', reasons: ['R5'] },
  ],
  status: 'sent',
  confirmed: ['sf_04', 'sf_06', 'sf_08'],
}

// ---------------- 车主运营月会（内部，虚构） ----------------

const OW: Meeting = {
  id: 'own_monthly',
  title: '车主运营月会',
  project: 'p_owner',
  date: '2026-10-29',
  time: '10:30',
  duration: 62,
  host: 'chengcheng',
  publisher: 'chengcheng',
  attendees: ['chengcheng', 'gaoyuan', 'dengkai'],
  related: ['chengcheng', 'gaoyuan', 'dengkai', 'jiangwan', 'hanzong', 'songlan'],
  source: '飞书妙记',
  kind: '月会',
  summary: '驾驶行为评分打开率只有 6%，决定把评分和积分挂钩、先在新车主试点；交付当天引导开通（高远）。线下驾驶培训今年 60 多场，场地是瓶颈。积分方案 11/10 前给韩总。门店安全口径不统一，由江晚出统一版本、放进竞品说法。',
  chapters: [
    { name: 'App 数据', start: 0, end: 14.2 },
    { name: '交付与培训', start: 14.2, end: 30.8 },
    { name: '积分方案', start: 30.8, end: 38.6 },
    { name: '门店口径', start: 38.6, end: 62 },
  ],
  segments: [
    { id: 'o01', speaker: 'chengcheng', start: 0, end: 6.8, text: '这个月车主 App 的日活涨了一点，但驾驶行为评分这个功能，打开率只有 6%。' },
    { id: 'o02', speaker: 'chengcheng', start: 7.2, end: 13.8, text: '我想把评分和积分挂钩，连续安全驾驶有积分奖励，先在新车主里试。' },
    { id: 'o03', speaker: 'gaoyuan', start: 14.2, end: 19.6, text: '交付这边可以配合，交付当天就引导开通，培训课里也讲。' },
    { id: 'o04', speaker: 'gaoyuan', start: 20.0, end: 30.4, text: '线下驾驶培训今年办了 60 多场，报名的人不少，但场地是瓶颈，一个城市一个月排不了几场。' },
    { id: 'o05', speaker: 'chengcheng', start: 30.8, end: 38.2, text: '积分的预算我来算，11 月 10 号前出方案给韩总。' },
    { id: 'o06', speaker: 'dengkai', start: 38.6, end: 47.8, text: '门店这边客户问得最多的是安全，尤其是碰撞和电池，销售口径不统一。' },
    { id: 'o07', speaker: 'chengcheng', start: 48.2, end: 62, text: '口径这个让江晚那边统一出一版，竞品怎么说的也放进去。' },
  ],
  items: items('own_monthly', [
    { id: 'ow_01', type: 'info', title: '驾驶行为评分打开率只有 6%', topic: '车主 App', owner: null, due: null, seg: 'o01', quote: '打开率只有 6%' },
    { id: 'ow_02', type: 'decision', title: '评分和积分挂钩，先在新车主里试点', topic: '车主激励', owner: 'chengcheng', due: null, seg: 'o02', quote: '我想把评分和积分挂钩' },
    { id: 'ow_03', type: 'action', title: '交付当天引导开通评分，培训课里讲', topic: '交付体验', owner: 'gaoyuan', due: null, seg: 'o03', quote: '交付当天就引导开通' },
    { id: 'ow_04', type: 'risk', title: '线下驾驶培训今年 60 多场，场地是瓶颈', topic: '车主培训', owner: null, due: null, seg: 'o04', quote: '但场地是瓶颈' },
    { id: 'ow_05', type: 'action', title: '积分方案 11/10 前给韩总', topic: '车主激励', owner: 'chengcheng', due: '11/10', seg: 'o05', quote: '11 月 10 号前出方案给韩总' },
    { id: 'ow_06', type: 'action', title: '统一门店安全口径，放进竞品说法', topic: '门店安全话术', owner: 'jiangwan', due: null, seg: 'o07', quote: '让江晚那边统一出一版', flags: ['缺截止'] },
  ]),
  routes: [
    { item: 'ow_03', person: 'gaoyuan', reasons: ['R1'] },
    { item: 'ow_06', person: 'jiangwan', reasons: ['R1'] },
    { item: 'ow_05', person: 'hanzong', reasons: ['R1', 'R6'] },
    { item: 'ow_02', person: 'hanzong', reasons: ['R6'] },
    { item: 'ow_04', person: 'hanzong', reasons: ['R6'] },
    { item: 'ow_02', person: 'gaoyuan', reasons: ['R4'] },
    { item: 'ow_06', person: 'dengkai', reasons: ['R4'] },
    { item: 'ow_04', person: 'songlan', reasons: ['R5'] },
  ],
  status: 'sent',
  confirmed: ['ow_03', 'ow_05'],
}

// ---------------- 门店销售周会（内部，虚构） ----------------

const RT: Meeting = {
  id: 'retail_weekly',
  title: '门店销售周会',
  project: 'p_retail',
  date: '2026-10-30',
  time: '16:00',
  duration: 54,
  host: 'dengkai',
  publisher: 'dengkai',
  attendees: ['dengkai', 'gaoyuan', 'linxia'],
  related: ['dengkai', 'gaoyuan', 'linxia', 'jiangwan', 'chengcheng', 'hanzong'],
  source: '录音',
  kind: '周会',
  summary: '进店客户三成主动问安全；竞品交付权益在加码，权益对比表要更新（林夏整理素材）。交付环节讲安全太散，做一页门店安全话术卡：江晚出内容，11/5 前印到门店。试驾加主动安全体验环节（高远排场地）。',
  chapters: [
    { name: '进店数据', start: 0, end: 5.6 },
    { name: '竞品权益', start: 5.6, end: 20.4 },
    { name: '安全话术', start: 20.4, end: 39.2 },
    { name: '试驾体验', start: 39.2, end: 54 },
  ],
  segments: [
    { id: 'r01', speaker: 'dengkai', start: 0, end: 5.2, text: '这周进店客户里，有三成会主动问安全，比上个月多。' },
    { id: 'r02', speaker: 'dengkai', start: 5.6, end: 13.4, text: '竞品那边交付权益在加码，听说要送表盘之类的配件，我们的权益对比表要更新。' },
    { id: 'r03', speaker: 'linxia', start: 13.8, end: 20.0, text: '对比表的素材我来整理，竞品直播一结束就补进去。' },
    { id: 'r04', speaker: 'gaoyuan', start: 20.4, end: 25.6, text: '交付环节我们也在讲安全，但讲法比较散，客户记不住。' },
    { id: 'r05', speaker: 'dengkai', start: 26.0, end: 38.8, text: '我建议做一页门店安全话术卡，江晚那边出内容，我们 11 月 5 号前印到门店。' },
    { id: 'r06', speaker: 'gaoyuan', start: 39.2, end: 54, text: '试驾的时候可以加一个主动安全的体验环节，我来排一下哪些门店有场地。' },
  ],
  items: items('retail_weekly', [
    { id: 'rt_01', type: 'info', title: '三成进店客户主动问安全', topic: '竞品卖点', owner: null, due: null, seg: 'r01', quote: '有三成会主动问安全' },
    { id: 'rt_02', type: 'change', title: '竞品交付权益加码，权益对比表要更新', topic: '购车权益', owner: 'dengkai', due: null, seg: 'r02', quote: '我们的权益对比表要更新' },
    { id: 'rt_03', type: 'action', title: '整理权益对比素材，竞品直播后补进去', topic: '购车权益', owner: 'linxia', due: '直播后', seg: 'r03', quote: '对比表的素材我来整理' },
    { id: 'rt_04', type: 'risk', title: '交付环节安全讲法散，客户记不住', topic: '交付体验', owner: null, due: null, seg: 'r04', quote: '讲法比较散，客户记不住' },
    { id: 'rt_05', type: 'action', title: '门店安全话术卡：江晚出内容，11/5 前印到门店', topic: '门店安全话术', owner: 'jiangwan', due: '11/5', seg: 'r05', quote: '江晚那边出内容' },
    { id: 'rt_06', type: 'action', title: '试驾加主动安全体验环节，排门店场地', topic: '试驾', owner: 'gaoyuan', due: null, seg: 'r06', quote: '我来排一下哪些门店有场地', flags: ['缺截止'] },
  ]),
  routes: [
    { item: 'rt_03', person: 'linxia', reasons: ['R1'] },
    { item: 'rt_05', person: 'jiangwan', reasons: ['R1'] },
    { item: 'rt_06', person: 'gaoyuan', reasons: ['R1'] },
    { item: 'rt_02', person: 'jiangwan', reasons: ['R5'] },
    { item: 'rt_01', person: 'jiangwan', reasons: ['R5'] },
    { item: 'rt_05', person: 'gaoyuan', reasons: ['R4'] },
    { item: 'rt_04', person: 'chengcheng', reasons: ['R5'] },
    { item: 'rt_01', person: 'hanzong', reasons: ['R6'] },
  ],
  status: 'sent',
  confirmed: ['rt_03', 'rt_05'],
}

export const MEETINGS: Meeting[] = [XM, RT, OW, SF]

export const meetingById = (id: string) => MEETINGS.find(m => m.id === id)
export const ALL_ITEMS: Item[] = MEETINGS.flatMap(m => m.items)
export const itemById = (id: string) => ALL_ITEMS.find(i => i.id === id)!

/** 某人收到简报的会议里，TA 是发布者的那些 */
export const publishedBy = (pid: PersonId) => MEETINGS.filter(m => m.publisher === pid)
