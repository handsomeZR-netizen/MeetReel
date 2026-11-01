// 会议数据：主案例“小米汽车安全专场直播”（真实录像 + 转写，数据在 data/cases/xiaomi-safety/），
// 加上同一家虚构车企本周的三场内部会议。内部会议和直播互相印证，知识库、路由理由都会跨会议引用。
// 每条条目的 quote 必须是所在发言段 text 的子串，溯源（视频定位、逐字稿高亮）靠它算位置。

import { term, type ItemType, type PersonId, type ProjectId, type Sensitivity } from './model'
import { L, isEn } from '@/lib/i18n'
import { XM_EN } from './xm-en'
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
  /** 录音 / 飞书妙记 / 会议录像 / 直播录像（已过 term()） */
  source: string
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
// 话题、标记、口语截止过一遍 term()，和关注档案里的词对得上
const items = (meeting: string, list: ItemInput[]): Item[] => list.map(x => ({
  sensitivity: 'internal', ...x, meeting,
  topic: term(x.topic), flags: x.flags?.map(term), due: x.due && term(x.due),
}))

// ---------------- 小米汽车安全专场直播（主案例） ----------------

const raw = xmJson as unknown as Omit<Meeting, 'publisher' | 'kind' | 'video'> & { dispatcher: PersonId; video: { width: number; height: number } }

// 英文界面：按 id 叠上英文转写、条目、章节（见 xm-en.ts）
const xm = isEn ? {
  ...raw,
  title: XM_EN.title,
  summary: XM_EN.summary,
  chapters: raw.chapters.map((c, i) => ({ ...c, name: XM_EN.chapters[i] ?? c.name })),
  segments: raw.segments.map(s => ({ ...s, text: XM_EN.segments[s.id] ?? s.text })),
  items: raw.items.map(it => ({ ...it, ...XM_EN.items[it.id] })),
} : raw

export const XM: Meeting = {
  ...xm,
  items: items(raw.id, xm.items),
  publisher: raw.dispatcher,
  source: term('直播录像'),
  kind: term('竞品直播'),
  external: true,
  video: { src: xmVideo, poster: xmPoster, width: raw.video.width, height: raw.video.height },
  status: 'ready',
  confirmed: [],
}

// ---------------- 安全周会（内部，虚构） ----------------

const SF: Meeting = {
  id: 'sf_weekly',
  title: L('安全周会 · 安委会评审机制', 'Safety weekly · Committee review gate'),
  project: 'p_safety',
  date: '2026-10-28',
  time: '14:00',
  duration: 66,
  host: 'songlan',
  publisher: 'songlan',
  attendees: ['songlan', 'weiran', 'xunuo', 'tangchuan'],
  related: ['songlan', 'hanzong', 'weiran', 'xunuo', 'tangchuan', 'jiangwan', 'gaoyuan'],
  source: term('会议录像'),
  kind: term('周会'),
  summary: L('安委会现在只做事后通报、评审里没有否决权；宋岚下月经营会提方案，让安全评审变成一道关。座椅回位夹手的投诉要补进开发阶段清单（魏然 11/7）；OTA 大版本做功能安全全量复核（许诺）。安委会改常设需要追加编制和预算（受限）。竞品安全专场直播由江晚跟进、按人分发。', 'The Safety Committee only sends after-the-fact notices and has no veto in reviews; Song Lan will propose at next month’s ops review that the safety review become a hard gate. The power-seat pinch complaint goes into the dev-stage checklist (Wei Ran, 11/7); major OTA releases get a full functional-safety re-check (Xu Nuo). Making the committee permanent needs extra headcount and budget (restricted). Jiang Wan is tracking the competitor safety livestream and will split it per person.'),
  chapters: [
    { name: L('安委会评审', 'Committee reviews'), start: 0, end: 15.6 },
    { name: L('座椅夹手投诉', 'Seat pinch complaint'), start: 15.6, end: 29.6 },
    { name: L('OTA 功能安全', 'OTA functional safety'), start: 29.6, end: 41.6 },
    { name: L('组织与编制', 'Org & headcount'), start: 41.6, end: 50.6 },
    { name: L('竞品直播', 'Competitor livestream'), start: 50.6, end: 66 },
  ],
  segments: [
    { id: 's01', speaker: 'songlan', start: 0, end: 7.4, text: L('今天主要对一下安委会评审的事。现在我们的安委会只做事后通报，评审里没有否决权，项目能带着安全问题往下走。', 'Today’s main item is the Safety Committee review. Right now our committee only sends notices after the fact, has no veto in reviews, and projects can move ahead carrying safety issues.') },
    { id: 's02', speaker: 'songlan', start: 7.8, end: 15.2, text: L('我想在下个月的经营会上提一个方案，让安全评审变成一道关，过不了就不能进下一个阶段。', 'At next month’s ops review I want to propose making the safety review a hard gate — if you don’t pass, you can’t go on to the next phase.') },
    { id: 's03', speaker: 'weiran', start: 15.6, end: 22.4, text: L('座椅这块上周又有一个投诉，电动座椅回位的时候夹到了小孩的手，开发阶段没有这个工况。', 'On seats, we got another complaint last week: a power seat pinched a child’s hand while returning to position, and development never covered that case.') },
    { id: 's04', speaker: 'songlan', start: 22.8, end: 29.2, text: L('这个要补进开发阶段的安全检查清单，魏然你牵头，11 月 7 号前给我一版，唐川配合整理评审记录。', 'That has to go into the dev-stage safety checklist. Wei Ran, you lead it — get me a version by November 7. Tang Chuan, help pull together the review records.') },
    { id: 's05', speaker: 'xunuo', start: 29.6, end: 36.6, text: L('电子电气这边，OTA 升级之后的功能安全复核现在还是抽查，我建议每次大版本都全量过一遍。', 'On the E/E side, functional-safety re-checks after OTA updates are still spot checks. I suggest a full pass on every major release.') },
    { id: 's06', speaker: 'songlan', start: 37.0, end: 41.2, text: L('可以，许诺你先出一个复核流程，下次周会过。', 'OK. Xu Nuo, draft a re-check process first, and we’ll go over it at the next weekly.') },
    { id: 's07', speaker: 'songlan', start: 41.6, end: 50.2, text: L('另外组织上，安委会要改成常设机构，需要追加 2 个编制、预算大概 80 万，这个我单独和韩总汇报。', 'Also, on the org side: making the committee a standing body needs 2 more headcount and roughly ¥800K in budget — I’ll brief GM Han on that separately.') },
    { id: 's08', speaker: 'weiran', start: 50.6, end: 56.4, text: L('还有一个，竞品那边这周要做安全专场直播，我们要不要盯一下？', 'One more thing — the competitor is doing a safety livestream this week. Should we keep an eye on it?') },
    { id: 's09', speaker: 'songlan', start: 56.8, end: 66, text: L('江晚那边在跟，直播完让她按人发一下，我们组重点看组织和机制。', 'Jiang Wan is on it. After the stream, have her send it out per person; our team should focus on org and mechanisms.') },
  ],
  items: items('sf_weekly', [
    { id: 'sf_01', type: 'risk', title: L('安委会评审没有否决权，项目能带着安全问题往下走', 'The committee has no veto in reviews; projects can move ahead with open safety issues'), topic: '评审机制', owner: null, due: null, seg: 's01', quote: L('评审里没有否决权', 'has no veto in reviews') },
    { id: 'sf_02', type: 'decision', title: L('下月经营会提方案：安全评审变成一道关', 'Propose at next month’s ops review: make the safety review a hard gate'), detail: L('过不了就不能进下一个阶段', 'fail it and you can’t enter the next phase'), topic: '评审机制', owner: 'songlan', due: '11 月经营会', seg: 's02', quote: L('让安全评审变成一道关', 'making the safety review a hard gate') },
    { id: 'sf_03', type: 'risk', title: L('电动座椅回位夹手投诉，开发阶段缺这个工况', 'Power seat pinched a hand while returning; development never covered the case'), topic: '座椅安全', owner: null, due: null, seg: 's03', quote: L('电动座椅回位的时候夹到了小孩的手', 'a power seat pinched a child’s hand while returning to position') },
    { id: 'sf_04', type: 'action', title: L('座椅夹手补进开发阶段安全检查清单', 'Add seat pinch to the dev-stage safety checklist'), topic: '座椅安全', owner: 'weiran', due: '11/7', seg: 's04', quote: L('魏然你牵头，11 月 7 号前给我一版', 'Wei Ran, you lead it — get me a version by November 7') },
    { id: 'sf_05', type: 'action', title: L('整理座椅相关的评审记录', 'Compile seat-related review records'), topic: '座椅安全', owner: 'tangchuan', due: '11/7', seg: 's04', quote: L('唐川配合整理评审记录', 'Tang Chuan, help pull together the review records') },
    { id: 'sf_06', type: 'action', title: L('出 OTA 大版本功能安全全量复核流程', 'Draft a full functional-safety re-check process for major OTA releases'), topic: 'OTA 功能安全', owner: 'xunuo', due: '下次周会', seg: 's06', quote: L('许诺你先出一个复核流程', 'Xu Nuo, draft a re-check process first') },
    { id: 'sf_07', type: 'decision', title: L('安委会改常设：追加 2 个编制、预算约 80 万', 'Make the committee permanent: +2 headcount, ~¥800K budget'), topic: '安全组织', owner: 'songlan', due: null, seg: 's07', quote: L('需要追加 2 个编制、预算大概 80 万', 'needs 2 more headcount and roughly ¥800K in budget'), sensitivity: 'restricted', visibleTo: ['songlan', 'hanzong', 'jiangwan'], redacted: L('安委会改为常设机构（编制和预算仅限名单内）', 'The committee becomes a standing body (headcount and budget: allow-list only)') },
    { id: 'sf_08', type: 'action', title: L('跟进竞品安全专场直播，直播完按人分发', 'Track the competitor safety livestream and split it per person afterwards'), topic: '竞品安全体系', owner: 'jiangwan', due: '直播后', seg: 's09', quote: L('直播完让她按人发一下', 'After the stream, have her send it out per person') },
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
  title: L('车主运营月会', 'Owner ops monthly'),
  project: 'p_owner',
  date: '2026-10-29',
  time: '10:30',
  duration: 62,
  host: 'chengcheng',
  publisher: 'chengcheng',
  attendees: ['chengcheng', 'gaoyuan', 'dengkai'],
  related: ['chengcheng', 'gaoyuan', 'dengkai', 'jiangwan', 'hanzong', 'songlan'],
  source: term('飞书妙记'),
  kind: term('月会'),
  summary: L('驾驶行为评分打开率只有 6%，决定把评分和积分挂钩、先在新车主试点；交付当天引导开通（高远）。线下驾驶培训今年 60 多场，场地是瓶颈。积分方案 11/10 前给韩总。门店安全口径不统一，由江晚出统一版本、放进竞品说法。', 'Only 6% of users open the driving-behavior score, so the score will be tied to points and piloted with new owners, with a prompt to switch it on at delivery (Gao Yuan). 60+ offline driving trainings this year, with venues as the bottleneck. The points plan goes to GM Han by 11/10. Store safety messaging is inconsistent — Jiang Wan will put out one version that includes what competitors claim.'),
  chapters: [
    { name: L('App 数据', 'App data'), start: 0, end: 14.2 },
    { name: L('交付与培训', 'Delivery & training'), start: 14.2, end: 30.8 },
    { name: L('积分方案', 'Points plan'), start: 30.8, end: 38.6 },
    { name: L('门店口径', 'Store messaging'), start: 38.6, end: 62 },
  ],
  segments: [
    { id: 'o01', speaker: 'chengcheng', start: 0, end: 6.8, text: L('这个月车主 App 的日活涨了一点，但驾驶行为评分这个功能，打开率只有 6%。', 'Owner app DAU went up a bit this month, but the driving-behavior score only has a 6% open rate.') },
    { id: 'o02', speaker: 'chengcheng', start: 7.2, end: 13.8, text: L('我想把评分和积分挂钩，连续安全驾驶有积分奖励，先在新车主里试。', 'I want to tie the score to points — reward streaks of safe driving with points — and try it with new owners first.') },
    { id: 'o03', speaker: 'gaoyuan', start: 14.2, end: 19.6, text: L('交付这边可以配合，交付当天就引导开通，培训课里也讲。', 'Delivery can help: we’ll get owners to switch it on the day of delivery, and cover it in training too.') },
    { id: 'o04', speaker: 'gaoyuan', start: 20.0, end: 30.4, text: L('线下驾驶培训今年办了 60 多场，报名的人不少，但场地是瓶颈，一个城市一个月排不了几场。', 'We ran 60-plus offline driving trainings this year and sign-ups are strong, but venues are the bottleneck — each city only fits a few a month.') },
    { id: 'o05', speaker: 'chengcheng', start: 30.8, end: 38.2, text: L('积分的预算我来算，11 月 10 号前出方案给韩总。', 'I’ll work out the points budget and get the plan to GM Han by November 10.') },
    { id: 'o06', speaker: 'dengkai', start: 38.6, end: 47.8, text: L('门店这边客户问得最多的是安全，尤其是碰撞和电池，销售口径不统一。', 'In stores, safety is what customers ask about most — especially crashes and batteries — and the sales messaging isn’t consistent.') },
    { id: 'o07', speaker: 'chengcheng', start: 48.2, end: 62, text: L('口径这个让江晚那边统一出一版，竞品怎么说的也放进去。', 'Have Jiang Wan’s team put out one unified version of the messaging, and include what the competitors say.') },
  ],
  items: items('own_monthly', [
    { id: 'ow_01', type: 'info', title: L('驾驶行为评分打开率只有 6%', 'Driving-behavior score open rate is only 6%'), topic: '车主 App', owner: null, due: null, seg: 'o01', quote: L('打开率只有 6%', 'only has a 6% open rate') },
    { id: 'ow_02', type: 'decision', title: L('评分和积分挂钩，先在新车主里试点', 'Tie the score to points; pilot with new owners first'), topic: '车主激励', owner: 'chengcheng', due: null, seg: 'o02', quote: L('我想把评分和积分挂钩', 'I want to tie the score to points') },
    { id: 'ow_03', type: 'action', title: L('交付当天引导开通评分，培训课里讲', 'Prompt owners to switch on the score at delivery; cover it in training'), topic: '交付体验', owner: 'gaoyuan', due: null, seg: 'o03', quote: L('交付当天就引导开通', 'get owners to switch it on the day of delivery') },
    { id: 'ow_04', type: 'risk', title: L('线下驾驶培训今年 60 多场，场地是瓶颈', '60+ offline driving trainings this year; venues are the bottleneck'), topic: '车主培训', owner: null, due: null, seg: 'o04', quote: L('但场地是瓶颈', 'but venues are the bottleneck') },
    { id: 'ow_05', type: 'action', title: L('积分方案 11/10 前给韩总', 'Points plan to GM Han by 11/10'), topic: '车主激励', owner: 'chengcheng', due: '11/10', seg: 'o05', quote: L('11 月 10 号前出方案给韩总', 'get the plan to GM Han by November 10') },
    { id: 'ow_06', type: 'action', title: L('统一门店安全口径，放进竞品说法', 'Unify store safety messaging, including competitor claims'), topic: '门店安全话术', owner: 'jiangwan', due: null, seg: 'o07', quote: L('让江晚那边统一出一版', 'Have Jiang Wan’s team put out one unified version'), flags: ['缺截止'] },
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
  title: L('门店销售周会', 'Store sales weekly'),
  project: 'p_retail',
  date: '2026-10-30',
  time: '16:00',
  duration: 54,
  host: 'dengkai',
  publisher: 'dengkai',
  attendees: ['dengkai', 'gaoyuan', 'linxia'],
  related: ['dengkai', 'gaoyuan', 'linxia', 'jiangwan', 'chengcheng', 'hanzong'],
  source: term('录音'),
  kind: term('周会'),
  summary: L('进店客户三成主动问安全；竞品交付权益在加码，权益对比表要更新（林夏整理素材）。交付环节讲安全太散，做一页门店安全话术卡：江晚出内容，11/5 前印到门店。试驾加主动安全体验环节（高远排场地）。', '30% of walk-ins ask about safety unprompted; competitors are stepping up delivery perks, so the perk comparison sheet needs an update (Lin Xia gathers material). Safety talk at delivery is scattered — make a one-page store safety talk-track card: Jiang Wan writes it, printed to stores by 11/5. Add an active-safety segment to test drives (Gao Yuan finds venues).'),
  chapters: [
    { name: L('进店数据', 'Walk-in data'), start: 0, end: 5.6 },
    { name: L('竞品权益', 'Competitor perks'), start: 5.6, end: 20.4 },
    { name: L('安全话术', 'Safety talk track'), start: 20.4, end: 39.2 },
    { name: L('试驾体验', 'Test drives'), start: 39.2, end: 54 },
  ],
  segments: [
    { id: 'r01', speaker: 'dengkai', start: 0, end: 5.2, text: L('这周进店客户里，有三成会主动问安全，比上个月多。', 'This week, 30% of walk-in customers asked about safety on their own — more than last month.') },
    { id: 'r02', speaker: 'dengkai', start: 5.6, end: 13.4, text: L('竞品那边交付权益在加码，听说要送表盘之类的配件，我们的权益对比表要更新。', 'Competitors are stepping up delivery perks — I hear they’re throwing in accessories like a dash display — so our perk comparison sheet needs an update.') },
    { id: 'r03', speaker: 'linxia', start: 13.8, end: 20.0, text: L('对比表的素材我来整理，竞品直播一结束就补进去。', 'I’ll put together the material for the comparison sheet and add it as soon as the competitor livestream ends.') },
    { id: 'r04', speaker: 'gaoyuan', start: 20.4, end: 25.6, text: L('交付环节我们也在讲安全，但讲法比较散，客户记不住。', 'We do talk about safety at delivery too, but it’s scattered and customers don’t remember it.') },
    { id: 'r05', speaker: 'dengkai', start: 26.0, end: 38.8, text: L('我建议做一页门店安全话术卡，江晚那边出内容，我们 11 月 5 号前印到门店。', 'I suggest a one-page store safety talk-track card. Jiang Wan’s team writes the content, and we get it printed to stores by November 5.') },
    { id: 'r06', speaker: 'gaoyuan', start: 39.2, end: 54, text: L('试驾的时候可以加一个主动安全的体验环节，我来排一下哪些门店有场地。', 'We could add an active-safety experience to test drives. I’ll check which stores have the space.') },
  ],
  items: items('retail_weekly', [
    { id: 'rt_01', type: 'info', title: L('三成进店客户主动问安全', '30% of walk-ins ask about safety unprompted'), topic: '竞品卖点', owner: null, due: null, seg: 'r01', quote: L('有三成会主动问安全', '30% of walk-in customers asked about safety on their own') },
    { id: 'rt_02', type: 'change', title: L('竞品交付权益加码，权益对比表要更新', 'Competitors are adding delivery perks; update the perk comparison sheet'), topic: '购车权益', owner: 'dengkai', due: null, seg: 'r02', quote: L('我们的权益对比表要更新', 'our perk comparison sheet needs an update') },
    { id: 'rt_03', type: 'action', title: L('整理权益对比素材，竞品直播后补进去', 'Gather perk comparison material; add it after the competitor livestream'), topic: '购车权益', owner: 'linxia', due: '直播后', seg: 'r03', quote: L('对比表的素材我来整理', 'I’ll put together the material for the comparison sheet') },
    { id: 'rt_04', type: 'risk', title: L('交付环节安全讲法散，客户记不住', 'Safety talk at delivery is scattered; customers don’t remember it'), topic: '交付体验', owner: null, due: null, seg: 'r04', quote: L('讲法比较散，客户记不住', 'it’s scattered and customers don’t remember it') },
    { id: 'rt_05', type: 'action', title: L('门店安全话术卡：江晚出内容，11/5 前印到门店', 'Store safety talk-track card: Jiang Wan writes it, printed to stores by 11/5'), topic: '门店安全话术', owner: 'jiangwan', due: '11/5', seg: 'r05', quote: L('江晚那边出内容', 'Jiang Wan’s team writes the content') },
    { id: 'rt_06', type: 'action', title: L('试驾加主动安全体验环节，排门店场地', 'Add an active-safety segment to test drives; line up store venues'), topic: '试驾', owner: 'gaoyuan', due: null, seg: 'r06', quote: L('我来排一下哪些门店有场地', 'I’ll check which stores have the space'), flags: ['缺截止'] },
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
