// 五场会议的 mock：转写（秒级时间）、账本条目（锚定到原话）、议题章节、路由结果。
// 每条条目的 quote 必须是所在发言段 text 的子串，溯源（视频定位、逐字稿高亮）靠它算位置。

import type { ItemType, PersonId, ProjectId, Sensitivity } from './model'

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
  host: PersonId
  attendees: PersonId[]
  related: PersonId[]
  source: '录音' | '飞书妙记' | '会议录像'
  summary: string
  chapters: Chapter[]
  segments: Segment[]
  items: Item[]
  routes: Route[]
  /** 初始状态：ready = 已转写、待分发 */
  status: MeetingStatus
  /** 已经确认过的待办（会前就存在的回流） */
  confirmed: string[]
}

type ItemInput = Omit<Item, 'meeting' | 'sensitivity'> & { sensitivity?: Sensitivity }
const items = (meeting: string, list: ItemInput[]): Item[] => list.map(x => ({ sensitivity: 'internal', ...x, meeting }))

// ---------------- 双 11 活动上线评审（演示主线） ----------------

const D11: Meeting = {
  id: 'd11',
  title: '双 11 活动上线评审',
  project: 'p_promo',
  date: '2026-10-31',
  time: '10:00',
  duration: 58,
  host: 'wangke',
  attendees: ['wangke', 'sunyue', 'chenmo'],
  related: ['wangke', 'linzong', 'chenmo', 'sunyue', 'zhaoyi', 'lilin', 'zhouning', 'wutong'],
  source: '会议录像',
  summary: '券改为满 300 减 30；上线提前到 11/8；订单接口拆字段，客户端要跟着改；扩容走 A 方案，预算待财务签批；周四压测是硬节点。',
  chapters: [
    { name: '券规则', start: 0, end: 12.8 },
    { name: '上线时间', start: 12.8, end: 16.8 },
    { name: '订单接口', start: 16.8, end: 25.8 },
    { name: '扩容', start: 25.8, end: 38.7 },
    { name: '客服', start: 38.7, end: 47.7 },
    { name: '风险与收尾', start: 47.7, end: 58 },
  ],
  segments: [
    { id: 'g01', speaker: 'wangke', start: 0, end: 7.6, text: '双 11 活动快速过一下。第一，法务说“满 300 减 40”有风险，券改成满 300 减 30。孙悦，物料跟着改。' },
    { id: 'g02', speaker: 'sunyue', start: 8.0, end: 12.6, text: '行，物料我 11 月 6 号前改完。上线时间还是 11 号吗？' },
    { id: 'g03', speaker: 'wangke', start: 13.0, end: 16.4, text: '提前到 8 号，留三天预热。' },
    { id: 'g04', speaker: 'chenmo', start: 17.0, end: 25.6, text: '那订单接口的 coupon_amount 要拆成两个字段，客户端也得跟着改。新接口我 11 月 5 号前给。' },
    { id: 'g05', speaker: 'wangke', start: 26.0, end: 28.4, text: '好。第二，扩容。' },
    { id: 'g06', speaker: 'chenmo', start: 29.0, end: 34.4, text: '压测还没做完。我建议走 A 方案，预算大概 30 万。' },
    { id: 'g07', speaker: 'wangke', start: 35.0, end: 38.4, text: 'A 方案先推，预算请财务签批。' },
    { id: 'g08', speaker: 'sunyue', start: 39.0, end: 43.4, text: '券规则变了，客服那边话术要不要更新？' },
    { id: 'g09', speaker: 'wangke', start: 44.0, end: 47.4, text: '要，客服 7 号前把 FAQ 更新好。' },
    { id: 'g10', speaker: 'chenmo', start: 48.0, end: 53.4, text: '还有个风险：周四前压测做不完，8 号上线就悬。' },
    { id: 'g11', speaker: 'wangke', start: 54.0, end: 58.0, text: '那周四压测是硬节点，陈默负责。散会。' },
  ],
  items: items('d11', [
    { id: 'it_01', type: 'change', title: '券改为满 300 减 30', detail: '法务认为“满 300 减 40”有风险', topic: '券规则', owner: null, due: null, seg: 'g01', quote: '券改成满 300 减 30' },
    { id: 'it_02', type: 'action', title: '按新券规则改物料', topic: '券规则', owner: 'sunyue', due: '11/6', seg: 'g02', quote: '物料我 11 月 6 号前改完' },
    { id: 'it_03', type: 'change', title: '上线从 11/11 提前到 11/8', detail: '留三天预热', topic: '上线时间', owner: null, due: '11/8', seg: 'g03', quote: '提前到 8 号，留三天预热' },
    { id: 'it_04', type: 'action', title: '交付拆分后的订单新接口', detail: 'coupon_amount 拆成两个字段', topic: '接口', owner: 'chenmo', due: '11/5', seg: 'g04', quote: '新接口我 11 月 5 号前给' },
    { id: 'it_05', type: 'action', title: '客户端适配拆分后的订单接口', detail: 'coupon_amount 拆成两个字段，客户端需要同步修改', topic: '接口', owner: null, suggestedOwner: 'zhaoyi', due: null, seg: 'g04', quote: '客户端也得跟着改', flags: ['缺负责人', '缺截止'] },
    { id: 'it_06', type: 'decision', title: '扩容先走 A 方案', topic: '扩容', owner: null, due: null, seg: 'g07', quote: 'A 方案先推' },
    { id: 'it_07', type: 'action', title: '扩容预算约 30 万，待财务签批', topic: '扩容', owner: 'zhouning', ownerBasis: '按角色', due: null, seg: 'g06', quote: '预算大概 30 万', sensitivity: 'restricted', visibleTo: ['zhouning', 'linzong', 'wangke', 'chenmo'], redacted: '扩容按 A 方案推进（预算细节受限）' },
    { id: 'it_08', type: 'action', title: '按新券规则更新客服 FAQ', topic: '客服', owner: 'lilin', ownerBasis: '按角色', due: '11/7', seg: 'g09', quote: '客服 7 号前把 FAQ 更新好' },
    { id: 'it_09', type: 'risk', title: '周四前压测做不完，8 号上线有风险', topic: '扩容', owner: null, due: null, seg: 'g10', quote: '周四前压测做不完，8 号上线就悬' },
    { id: 'it_10', type: 'action', title: '周四完成压测（硬节点）', topic: '扩容', owner: 'chenmo', due: '周四', seg: 'g11', quote: '周四压测是硬节点，陈默负责' },
  ]),
  routes: [
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
  ],
  status: 'ready',
  confirmed: [],
}

// ---------------- 客户满意度复盘 ----------------

const CX: Meeting = {
  id: 'cx',
  title: '客户满意度复盘',
  project: 'p_cx',
  date: '2026-10-30',
  time: '10:00',
  duration: 54,
  host: 'yezhou',
  attendees: ['yezhou', 'wutong', 'lilin', 'wangke'],
  related: ['yezhou', 'wutong', 'lilin', 'wangke', 'chenmo', 'linzong', 'zhouning', 'maxiao'],
  source: '飞书妙记',
  summary: 'NPS 掉了 8 分，退款到账慢是主因；王珂和陈默 11/8 前出 24 小时退款方案；客服话术 11/3 前上线；双 11 客服加 5 人。',
  chapters: [
    { name: '数据', start: 0, end: 14.8 },
    { name: '退款', start: 14.8, end: 34.8 },
    { name: '客服', start: 34.8, end: 46.8 },
    { name: '补偿', start: 46.8, end: 54 },
  ],
  segments: [
    { id: 'c01', speaker: 'yezhou', start: 0, end: 7.4, text: '先看数据。这个月 NPS 从 42 掉到 34，掉了 8 分，差评主要集中在退款。' },
    { id: 'c02', speaker: 'wutong', start: 8.0, end: 14.6, text: '我拆了一下，差评里 63% 提到退款到账慢，平均要 3.2 天。' },
    { id: 'c03', speaker: 'lilin', start: 15.2, end: 21.8, text: '客服这边也一样，退款类工单占了四成，话术只能安抚，解决不了问题。' },
    { id: 'c04', speaker: 'yezhou', start: 22.4, end: 28.6, text: '退款时效得从 48 小时压到 24 小时。王珂，这个你和陈默出个方案。' },
    { id: 'c05', speaker: 'wangke', start: 29.2, end: 34.4, text: '可以，我 11 月 8 号前和陈默一起出方案。' },
    { id: 'c06', speaker: 'lilin', start: 35.0, end: 40.4, text: '那话术我先改，11 月 3 号前上线新版。' },
    { id: 'c07', speaker: 'yezhou', start: 41.0, end: 46.4, text: '另外双 11 期间客服加 5 个人，这个定了。' },
    { id: 'c08', speaker: 'wangke', start: 47.0, end: 53.0, text: '差评用户要不要补一张券？这个我还没想好，大家想想。' },
  ],
  items: items('cx', [
    { id: 'cx_01', type: 'info', title: 'NPS 从 42 降到 34', topic: '数据', owner: null, due: null, seg: 'c01', quote: 'NPS 从 42 掉到 34' },
    { id: 'cx_02', type: 'risk', title: '退款到账慢是差评主因（63%）', detail: '平均到账 3.2 天', topic: '退款', owner: null, due: null, seg: 'c02', quote: '差评里 63% 提到退款到账慢' },
    { id: 'cx_03', type: 'action', title: '出退款时效 48h → 24h 方案', detail: '和陈默一起，把退款到账从 48 小时压到 24 小时', topic: '退款', owner: 'wangke', due: '11/8', seg: 'c05', quote: '我 11 月 8 号前和陈默一起出方案' },
    { id: 'cx_04', type: 'action', title: '上线退款类客服新话术', topic: '客服', owner: 'lilin', due: '11/3', seg: 'c06', quote: '话术我先改，11 月 3 号前上线新版' },
    { id: 'cx_05', type: 'decision', title: '双 11 期间客服增加 5 人', topic: '客服', owner: null, due: null, seg: 'c07', quote: '双 11 期间客服加 5 个人' },
    { id: 'cx_06', type: 'question', title: '要不要给差评用户补券', topic: '补偿', owner: null, suggestedOwner: 'wangke', due: null, seg: 'c08', quote: '差评用户要不要补一张券', flags: ['待决策'] },
  ]),
  routes: [
    { item: 'cx_01', person: 'linzong', reasons: ['R6'] },
    { item: 'cx_01', person: 'wutong', reasons: ['R3'] },
    { item: 'cx_02', person: 'linzong', reasons: ['R6'] },
    { item: 'cx_02', person: 'chenmo', reasons: ['R4'] },
    { item: 'cx_02', person: 'wangke', reasons: ['R3'] },
    { item: 'cx_03', person: 'wangke', reasons: ['R1'] },
    { item: 'cx_03', person: 'chenmo', reasons: ['R1'] },
    { item: 'cx_04', person: 'lilin', reasons: ['R1'] },
    { item: 'cx_05', person: 'lilin', reasons: ['R2'] },
    { item: 'cx_05', person: 'zhouning', reasons: ['R2'] },
    { item: 'cx_05', person: 'linzong', reasons: ['R6'] },
    { item: 'cx_06', person: 'wangke', reasons: ['R1'] },
    { item: 'cx_06', person: 'maxiao', reasons: ['R3'] },
    { item: 'cx_06', person: 'linzong', reasons: ['R6'] },
  ],
  status: 'sent',
  confirmed: ['cx_04', 'cx_03'],
}

// ---------------- Q4 OKR 对齐会 ----------------

const Q4: Meeting = {
  id: 'q4',
  title: 'Q4 OKR 对齐会',
  project: 'p_q4',
  date: '2026-10-29',
  time: '15:30',
  duration: 46,
  host: 'linzong',
  attendees: ['linzong', 'sunyue', 'wangke', 'chenmo', 'zhouning'],
  related: ['linzong', 'sunyue', 'wangke', 'chenmo', 'zhouning', 'zhaoyi', 'tangyou'],
  source: '会议录像',
  summary: 'Q4 目标 GMV 1.2 亿；会员小程序 2.0 推到 12 月；王珂 11/4 前交 KR 拆解；扩容可能超预算，周宁下周复核。',
  chapters: [
    { name: '目标', start: 0, end: 13 },
    { name: '排期', start: 13, end: 27 },
    { name: '预算', start: 27, end: 46 },
  ],
  segments: [
    { id: 'q01', speaker: 'linzong', start: 0, end: 6.8, text: 'Q4 就一个 O：双 11 和年货节打穿，GMV 目标 1.2 个亿。' },
    { id: 'q02', speaker: 'sunyue', start: 7.4, end: 12.6, text: '市场这边的 KR 是拉新 50 万，主要压在双 11。' },
    { id: 'q03', speaker: 'wangke', start: 13.2, end: 20.2, text: '会员小程序 2.0 原计划 11 月上，我建议推到 12 月，先保双 11。' },
    { id: 'q04', speaker: 'linzong', start: 20.8, end: 26.6, text: '同意，推到 12 月。王珂 11 月 4 号前把 KR 拆解交上来。' },
    { id: 'q05', speaker: 'chenmo', start: 27.2, end: 33.4, text: '风险是服务器预算，双 11 峰值要扩容，现在的预算可能不够。' },
    { id: 'q06', speaker: 'zhouning', start: 34.0, end: 40.6, text: 'Q4 的 IT 预算还剩 80 万，我下周复核一下扩容的口子。' },
    { id: 'q07', speaker: 'linzong', start: 41.2, end: 45.6, text: '好，周宁复核完直接跟我说。散会。' },
  ],
  items: items('q4', [
    { id: 'q4_01', type: 'decision', title: 'Q4 目标：GMV 1.2 亿', topic: '目标', owner: null, due: null, seg: 'q01', quote: 'GMV 目标 1.2 个亿' },
    { id: 'q4_02', type: 'info', title: '市场 KR：拉新 50 万', topic: '目标', owner: 'sunyue', due: null, seg: 'q02', quote: 'KR 是拉新 50 万' },
    { id: 'q4_03', type: 'change', title: '会员小程序 2.0 推迟到 12 月', topic: '排期', owner: null, due: '12 月', seg: 'q04', quote: '同意，推到 12 月' },
    { id: 'q4_04', type: 'action', title: '提交 Q4 KR 拆解', topic: '目标', owner: 'wangke', due: '11/4', seg: 'q04', quote: '王珂 11 月 4 号前把 KR 拆解交上来' },
    { id: 'q4_05', type: 'risk', title: '双 11 扩容可能超出服务器预算', topic: '预算', owner: null, due: null, seg: 'q05', quote: '现在的预算可能不够' },
    { id: 'q4_06', type: 'action', title: '复核扩容预算口子', detail: 'Q4 IT 预算剩余 80 万，复核双 11 扩容能否覆盖', topic: '预算', owner: 'zhouning', due: '下周', seg: 'q06', quote: '我下周复核一下扩容的口子', sensitivity: 'restricted', visibleTo: ['zhouning', 'linzong', 'chenmo', 'wangke'], redacted: '财务复核扩容预算（金额受限）' },
  ]),
  routes: [
    { item: 'q4_01', person: 'zhaoyi', reasons: ['R5'] },
    { item: 'q4_01', person: 'tangyou', reasons: ['R5'] },
    { item: 'q4_01', person: 'sunyue', reasons: ['R3'] },
    { item: 'q4_01', person: 'wangke', reasons: ['R3'] },
    { item: 'q4_02', person: 'sunyue', reasons: ['R1'] },
    { item: 'q4_03', person: 'wangke', reasons: ['R1'] },
    { item: 'q4_03', person: 'zhaoyi', reasons: ['R4'] },
    { item: 'q4_03', person: 'tangyou', reasons: ['R4'] },
    { item: 'q4_04', person: 'wangke', reasons: ['R1'] },
    { item: 'q4_05', person: 'chenmo', reasons: ['R1'] },
    { item: 'q4_05', person: 'zhouning', reasons: ['R2'] },
    { item: 'q4_06', person: 'zhouning', reasons: ['R1'] },
    { item: 'q4_06', person: 'chenmo', reasons: ['R4'] },
  ],
  status: 'sent',
  confirmed: ['q4_06'],
}

// ---------------- 产品需求评审（会员小程序 2.0） ----------------

const APP: Meeting = {
  id: 'app',
  title: '产品需求评审',
  project: 'p_app',
  date: '2026-10-28',
  time: '14:00',
  duration: 44,
  host: 'wangke',
  attendees: ['wangke', 'tangyou', 'zhaoyi', 'chenmo', 'sunyue'],
  related: ['wangke', 'tangyou', 'zhaoyi', 'chenmo', 'sunyue', 'lilin', 'linzong'],
  source: '录音',
  summary: '会员等级定为 4 档；唐悠 11/1 前出高保真；赵一评估分包；积分接口和支付回调工期紧；积分过期下次再定。',
  chapters: [
    { name: '等级', start: 0, end: 13.1 },
    { name: '技术', start: 13.1, end: 27.5 },
    { name: '积分', start: 27.5, end: 44 },
  ],
  segments: [
    { id: 'a01', speaker: 'wangke', start: 0, end: 7.2, text: '会员小程序 2.0 的需求过一下。等级体系从 6 档简化成 4 档，大家有意见吗？' },
    { id: 'a02', speaker: 'tangyou', start: 7.8, end: 12.8, text: '设计上 4 档更清楚，高保真我 11 月 1 号前出。' },
    { id: 'a03', speaker: 'zhaoyi', start: 13.4, end: 20.4, text: '小程序主包已经快 2M 了，加会员中心得做分包，我先评估一下。' },
    { id: 'a04', speaker: 'chenmo', start: 21.0, end: 27.2, text: '积分接口要改，支付回调也得跟着动，工期有点紧。' },
    { id: 'a05', speaker: 'wangke', start: 27.8, end: 32.4, text: '那 4 档就这么定了。积分要不要设过期？' },
    { id: 'a06', speaker: 'sunyue', start: 33.0, end: 38.6, text: '市场希望一年过期，能促活跃；但客服可能会被投诉。' },
    { id: 'a07', speaker: 'wangke', start: 39.2, end: 43.6, text: '积分过期这个先不定，下次评审再说。' },
  ],
  items: items('app', [
    { id: 'app_01', type: 'decision', title: '会员等级从 6 档简化为 4 档', topic: '等级', owner: null, due: null, seg: 'a05', quote: '4 档就这么定了' },
    { id: 'app_02', type: 'action', title: '交付会员中心高保真设计稿', topic: '等级', owner: 'tangyou', due: '11/1', seg: 'a02', quote: '高保真我 11 月 1 号前出' },
    { id: 'app_03', type: 'action', title: '评估小程序分包方案', detail: '主包接近 2M，加会员中心需要分包', topic: '技术', owner: 'zhaoyi', due: null, seg: 'a03', quote: '我先评估一下', flags: ['缺截止'] },
    { id: 'app_04', type: 'risk', title: '积分接口和支付回调改造，工期紧', topic: '技术', owner: null, due: null, seg: 'a04', quote: '支付回调也得跟着动，工期有点紧' },
    { id: 'app_05', type: 'question', title: '积分要不要设一年过期', detail: '市场希望促活跃，客服担心投诉', topic: '积分', owner: null, due: null, seg: 'a07', quote: '积分过期这个先不定', flags: ['待决策'] },
  ]),
  routes: [
    { item: 'app_01', person: 'tangyou', reasons: ['R3'] },
    { item: 'app_01', person: 'zhaoyi', reasons: ['R3'] },
    { item: 'app_01', person: 'sunyue', reasons: ['R5'] },
    { item: 'app_01', person: 'lilin', reasons: ['R4'] },
    { item: 'app_02', person: 'tangyou', reasons: ['R1'] },
    { item: 'app_03', person: 'zhaoyi', reasons: ['R1'] },
    { item: 'app_04', person: 'chenmo', reasons: ['R1'] },
    { item: 'app_04', person: 'linzong', reasons: ['R6'] },
    { item: 'app_05', person: 'sunyue', reasons: ['R1'] },
    { item: 'app_05', person: 'lilin', reasons: ['R4'] },
  ],
  status: 'sent',
  confirmed: ['app_02'],
}

// ---------------- 618 大促复盘 ----------------

const S618: Meeting = {
  id: 's618',
  title: '618 大促复盘',
  project: 'p_promo',
  date: '2026-10-20',
  time: '16:00',
  duration: 39,
  host: 'sunyue',
  attendees: ['sunyue', 'wutong', 'chenmo', 'maxiao', 'wangke'],
  related: ['sunyue', 'wutong', 'chenmo', 'maxiao', 'wangke', 'linzong', 'lilin'],
  source: '录音',
  summary: 'GMV 达成 96%；峰值下单失败率 2.1%，扩容做晚了；定下双 11 至少提前一周压测；券核销率 38% 要复盘。',
  chapters: [
    { name: '结果', start: 0, end: 6.5 },
    { name: '稳定性', start: 6.5, end: 26.3 },
    { name: '券', start: 26.3, end: 32.3 },
    { name: '后续', start: 32.3, end: 39 },
  ],
  segments: [
    { id: 's01', speaker: 'sunyue', start: 0, end: 6.2, text: '618 整体 GMV 达成 96%，差一点没到目标。' },
    { id: 's02', speaker: 'wutong', start: 6.8, end: 13.4, text: '转化漏斗里，峰值那一个小时下单失败率到了 2.1%，丢了不少单。' },
    { id: 's03', speaker: 'chenmo', start: 14.0, end: 19.6, text: '那会儿库存服务扛不住，扩容做晚了。' },
    { id: 's04', speaker: 'sunyue', start: 20.2, end: 26.0, text: '教训记下来：双 11 一定提前压测，至少提前一周。' },
    { id: 's05', speaker: 'maxiao', start: 26.6, end: 32.0, text: '券的核销率只有 38%，我复盘一下券的设计。' },
    { id: 's06', speaker: 'sunyue', start: 32.6, end: 38.4, text: '吴桐出一份完整的漏斗分析，下周给。' },
  ],
  items: items('s618', [
    { id: 's618_01', type: 'info', title: '618 GMV 达成 96%', topic: '结果', owner: null, due: null, seg: 's01', quote: 'GMV 达成 96%' },
    { id: 's618_02', type: 'risk', title: '峰值时段下单失败率 2.1%', detail: '库存服务扛不住，扩容做晚了', topic: '稳定性', owner: null, due: null, seg: 's02', quote: '下单失败率到了 2.1%' },
    { id: 's618_03', type: 'decision', title: '双 11 至少提前一周压测', topic: '稳定性', owner: null, due: null, seg: 's04', quote: '双 11 一定提前压测，至少提前一周' },
    { id: 's618_04', type: 'action', title: '复盘券的设计（核销率 38%）', topic: '券', owner: 'maxiao', due: null, seg: 's05', quote: '我复盘一下券的设计' },
    { id: 's618_05', type: 'action', title: '输出完整的转化漏斗分析', topic: '后续', owner: 'wutong', due: '下周', seg: 's06', quote: '吴桐出一份完整的漏斗分析，下周给' },
  ]),
  routes: [
    { item: 's618_01', person: 'linzong', reasons: ['R6'] },
    { item: 's618_01', person: 'wangke', reasons: ['R3'] },
    { item: 's618_02', person: 'chenmo', reasons: ['R3'] },
    { item: 's618_02', person: 'linzong', reasons: ['R6'] },
    { item: 's618_03', person: 'chenmo', reasons: ['R3'] },
    { item: 's618_03', person: 'wangke', reasons: ['R3'] },
    { item: 's618_03', person: 'linzong', reasons: ['R6'] },
    { item: 's618_04', person: 'maxiao', reasons: ['R1'] },
    { item: 's618_05', person: 'wutong', reasons: ['R1'] },
    { item: 's618_02', person: 'lilin', reasons: ['R4'] },
  ],
  status: 'sent',
  confirmed: ['s618_04', 's618_05'],
}

export const MEETINGS: Meeting[] = [D11, CX, Q4, APP, S618]

export const meetingById = (id: string) => MEETINGS.find(m => m.id === id)
export const ALL_ITEMS: Item[] = MEETINGS.flatMap(m => m.items)
export const itemById = (id: string) => ALL_ITEMS.find(i => i.id === id)!
