// 会映的基础数据：人（职级、部门、汇报线）、项目（Leader）、条目类型、推送理由、可选模型。
// 主案例是“小米汽车安全专场直播”：直播里的 4 位发言人是真人，只引用原话；收件人全部是一家虚构车企的员工。
// 字段沿用需求文档第 8 节的数据契约；现在全部是 mock，后端接好后由接口返回同样的结构。

import type { KoboyoName } from '@/components/sketch/koboyoData'
import { L } from '@/lib/i18n'

// ---------- 术语对照 ----------
// 话题、负责范围、订阅词、标记、渠道：同一个词在关注档案、条目、知识库、路由理由里必须一模一样
// （路由和依赖关系靠字符串相等来匹配），所以英文统一在这里对照，数据里照旧写中文，过一遍 term()。
const TERMS_EN: Record<string, string> = {
  // 话题
  评审机制: 'Review gate', 座椅安全: 'Seat safety', 'OTA 功能安全': 'OTA functional safety', 安全组织: 'Safety org',
  竞品安全体系: 'Competitor safety system', '车主 App': 'Owner app', 车主激励: 'Owner incentives', 交付体验: 'Delivery experience',
  车主培训: 'Owner training', 门店安全话术: 'Store safety talk track', 竞品卖点: 'Competitor selling points', 购车权益: 'Purchase perks',
  试驾: 'Test drives', 电子安全: 'Electronic safety', 安全理念: 'Safety philosophy', 安全体系: 'Safety system', 安全目标: 'Safety goal',
  事故预防: 'Accident prevention', 全域安全: 'Full-domain safety', 用车安全: 'Safety in use', 'App 安全分': 'App safety score',
  // 负责 / 依赖 / 订阅
  品牌定位: 'Brand positioning', 竞品研究: 'Competitive research', 对外宣传口径: 'External messaging', 宣传口径: 'Messaging',
  公司经营: 'Company operations', 安全战略: 'Safety strategy', 竞品目标: 'Competitor goals', 组织机制: 'Org & mechanisms', 投入规模: 'Investment scale',
  安全体系建设: 'Safety system build-out', 安全委员会: 'Safety Committee', 安全评审流程: 'Safety review process',
  车主积分体系: 'Owner points program', 车主社区: 'Owner community', 用户授权: 'User consent',
  车主驾驶培训: 'Owner driver training', 门店销售: 'Store sales', 购车权益对比: 'Perk comparison',
  整车安全开发: 'Vehicle safety engineering', 碰撞安全: 'Crash safety', 电池安全: 'Battery safety', 主被动安全: 'Active & passive safety',
  智能驾驶: 'Assisted driving', 电子电气架构: 'E/E architecture', 网络安全: 'Cybersecurity',
  竞品资料库: 'Competitor library', 权益对比素材: 'Perk comparison data', 安全检查清单: 'Safety checklist', 评审记录: 'Review records',
  // 别名
  市场: 'Marketing', 品牌: 'Brand', 竞品: 'Competitors', 老板: 'the boss', 管理层: 'Management', 安全部: 'Safety', 安委会: 'the committee',
  车主运营: 'Owner ops', 新车主运营: 'New-owner ops', 交付: 'Delivery', 培训: 'Training', 门店: 'Stores', 销售: 'Sales',
  整车安全: 'Vehicle safety', 产品安全: 'Product safety', 智驾: 'ADAS', 电子电气: 'E/E', 竞品专员: 'Competitor analyst', 评审: 'Reviews',
  雷总: 'Lei', 静雷: 'Jinglei', 景雷: 'Jing Lei', 丁老师: 'Ding', 丁志老师: 'Ding Zhi',
  // 渠道
  飞书: 'Lark', H5: 'Web', '90 秒视频': '90-sec video', 日报: 'Daily digest',
  // 条目标记
  缺截止: 'No due date', 缺负责人: 'No owner', 本段未覆盖: 'Not in this clip', 旧闻重申: 'Restated', 绝对化表述: 'Absolute claim', 待核实: 'Unverified',
  // 口语截止
  '11 月经营会': 'Nov ops review', 直播后: 'After the livestream', 下次周会: 'Next weekly',
  // 会议类型与来源
  竞品直播: 'Competitor livestream', 周会: 'Weekly', 月会: 'Monthly',
  录音: 'Audio', 飞书妙记: 'Lark Minutes', 会议录像: 'Meeting recording', 直播录像: 'Livestream recording',
}
export const term = (zh: string) => L(zh, TERMS_EN[zh] ?? zh)

export type PersonId =
  // 直播发言人（真人，外部）
  | 'leijun' | 'houjinglei' | 'dingzhi' | 'shuangge'
  // 收件人（虚构车企）
  | 'hanzong' | 'songlan' | 'weiran' | 'xunuo' | 'chengcheng' | 'gaoyuan' | 'jiangwan' | 'dengkai' | 'linxia' | 'tangchuan'

export type Sensitivity = 'public' | 'internal' | 'restricted' | 'confidential'

/** 职级：决定简报写成什么样（高管看决议和投入，成员看自己的待办） */
export type Rank = 'exec' | 'head' | 'lead' | 'staff' | 'guest'

export const RANKS: Record<Rank, { level: string; label: string; color: string; soft: string; brief: string }> = {
  exec: { level: 'L1', label: L('高管', 'Executive'), color: '#17171A', soft: '#EDEDED', brief: L('决议、风险、投入规模，约 60 秒', 'Decisions, risks, investment — about 60 s') },
  head: { level: 'L2', label: L('部门负责人', 'Dept head'), color: '#4338CA', soft: '#EEF0FF', brief: L('本部门相关的决议和变化', 'Decisions and changes that touch the department') },
  lead: { level: 'L3', label: L('组长', 'Team lead'), color: '#1D4ED8', soft: '#EAF2FF', brief: L('负责的事 + 组员的待办', 'What they own + the team’s to-dos') },
  staff: { level: 'L4', label: L('成员', 'Member'), color: '#475569', soft: '#F1F5F9', brief: L('只有自己的待办，约 10 秒', 'Only their own to-dos — about 10 s') },
  guest: { level: L('外部', 'Ext'), label: L('外部发言人', 'External speaker'), color: '#C2410C', soft: '#FFF1E6', brief: L('不推送，只引用原话', 'Never notified, only quoted') },
}

export interface Person {
  id: PersonId
  name: string
  short: string
  role: string
  /** 部门 */
  team: string
  /** 小组（可选） */
  group?: string
  rank: Rank
  reportsTo?: PersonId
  bg: string
  fg: string
  /** 直播里的真人发言人：不生成简报、不派任务 */
  external?: boolean
  /** 关注档案（Profile）：路由官据此判断“和谁有关” */
  profile: {
    aliases: string[]
    owns: string[]
    dependsOn: string[]
    interests: string[]
    clearance: Sensitivity
    channels: string[]
  }
}

type PersonInput = Omit<Person, 'profile'> & { profile: Partial<Person['profile']> & { clearance: Sensitivity } }
const p = (x: PersonInput): Person => {
  const f = { aliases: [], owns: [], dependsOn: [], interests: [], channels: ['飞书'], ...x.profile }
  return {
    ...x,
    profile: { ...f, aliases: f.aliases.map(term), owns: f.owns.map(term), dependsOn: f.dependsOn.map(term), interests: f.interests.map(term), channels: f.channels.map(term) },
  }
}

export const PEOPLE: Person[] = [
  // ---- 收件人（虚构车企）----
  p({ id: 'jiangwan', name: L('江晚', 'Jiang Wan'), short: L('晚', 'W'), role: L('竞品研究组组长', 'Competitive Research Lead'), team: L('市场部', 'Marketing'), group: L('竞品研究组', 'Competitive Research'), rank: 'lead', reportsTo: 'hanzong', bg: '#FFE4E6', fg: '#9F1239',
    profile: { aliases: ['市场', '品牌', '竞品'], owns: ['品牌定位', '竞品研究', '对外宣传口径', '门店安全话术'], interests: ['安全理念', '宣传口径', '竞品卖点'], clearance: 'restricted', channels: ['飞书', 'H5'] } }),
  p({ id: 'hanzong', name: L('韩总', 'GM Han'), short: L('韩', 'H'), role: L('总经理', 'General Manager'), team: L('管理层', 'Leadership'), rank: 'exec', bg: '#FEF3C7', fg: '#92400E',
    profile: { aliases: ['老板', '管理层'], owns: ['公司经营', '安全战略'], interests: ['竞品目标', '组织机制', '投入规模'], clearance: 'confidential', channels: ['飞书', '90 秒视频'] } }),
  p({ id: 'songlan', name: L('宋岚', 'Song Lan'), short: L('岚', 'L'), role: L('安全部负责人', 'Head of Safety'), team: L('安全部', 'Safety'), rank: 'head', reportsTo: 'hanzong', bg: '#E0E7FF', fg: '#3730A3',
    profile: { aliases: ['安全部', '安委会'], owns: ['安全体系建设', '安全委员会', '安全评审流程'], interests: ['竞品安全体系', '安全组织'], clearance: 'restricted', channels: ['飞书', 'H5'] } }),
  p({ id: 'chengcheng', name: L('程橙', 'Cheng Cheng'), short: L('橙', 'C'), role: L('车主运营负责人', 'Head of Owner Ops'), team: L('用户运营部', 'User Operations'), rank: 'head', reportsTo: 'hanzong', bg: '#FCE7F3', fg: '#9D174D',
    profile: { aliases: ['车主运营', '新车主运营'], owns: ['车主积分体系', '车主 App', '车主社区'], dependsOn: ['用户授权'], interests: ['用车安全'], clearance: 'internal' } }),
  p({ id: 'gaoyuan', name: L('高远', 'Gao Yuan'), short: L('远', 'Y'), role: L('交付与车主培训负责人', 'Head of Delivery & Owner Training'), team: L('交付中心', 'Delivery Center'), rank: 'head', reportsTo: 'hanzong', bg: '#DCFCE7', fg: '#166534',
    profile: { aliases: ['交付', '培训'], owns: ['交付体验', '车主驾驶培训', '试驾'], dependsOn: ['车主积分体系', '门店安全话术'], interests: ['车主培训', '车主激励'], clearance: 'internal' } }),
  p({ id: 'dengkai', name: L('邓凯', 'Deng Kai'), short: L('凯', 'K'), role: L('销售渠道负责人', 'Head of Sales Channels'), team: L('销售部', 'Sales'), rank: 'head', reportsTo: 'hanzong', bg: '#FEF9C3', fg: '#854D0E',
    profile: { aliases: ['门店', '销售'], owns: ['门店销售', '购车权益对比'], dependsOn: ['门店安全话术'], interests: ['竞品卖点'], clearance: 'internal' } }),
  p({ id: 'weiran', name: L('魏然', 'Wei Ran'), short: L('然', 'R'), role: L('整车安全开发组长', 'Vehicle Safety Eng. Lead'), team: L('安全部', 'Safety'), group: L('整车安全开发组', 'Vehicle Safety Engineering'), rank: 'lead', reportsTo: 'songlan', bg: '#CCFBF1', fg: '#115E59',
    profile: { aliases: ['整车安全', '产品安全'], owns: ['整车安全开发', '座椅安全', '碰撞安全', '电池安全'], interests: ['主被动安全'], clearance: 'internal', channels: ['飞书', 'MCP'] } }),
  p({ id: 'xunuo', name: L('许诺', 'Xu Nuo'), short: L('诺', 'N'), role: L('电子电气安全组长', 'E/E Safety Lead'), team: L('安全部', 'Safety'), group: L('智驾与电子电气安全组', 'ADAS & E/E Safety'), rank: 'lead', reportsTo: 'songlan', bg: '#EDE9FE', fg: '#5B21B6',
    profile: { aliases: ['智驾', '电子电气'], owns: ['智能驾驶', '电子电气架构', '网络安全', 'OTA 功能安全'], interests: ['电子安全'], clearance: 'internal', channels: ['飞书', '日报'] } }),
  p({ id: 'linxia', name: L('林夏', 'Lin Xia'), short: L('夏', 'X'), role: L('竞品研究专员', 'Competitive Research Analyst'), team: L('市场部', 'Marketing'), group: L('竞品研究组', 'Competitive Research'), rank: 'staff', reportsTo: 'jiangwan', bg: '#E0F2FE', fg: '#075985',
    profile: { aliases: ['竞品专员'], owns: ['竞品资料库', '权益对比素材'], interests: ['竞品卖点', '购车权益'], clearance: 'internal' } }),
  p({ id: 'tangchuan', name: L('唐川', 'Tang Chuan'), short: L('川', 'T'), role: L('安全评审工程师', 'Safety Review Engineer'), team: L('安全部', 'Safety'), group: L('安全评审', 'Safety Review'), rank: 'staff', reportsTo: 'songlan', bg: '#F1F5F9', fg: '#334155',
    profile: { aliases: ['评审'], owns: ['安全检查清单', '评审记录'], dependsOn: ['安全评审流程'], interests: ['安全组织'], clearance: 'internal' } }),

  // ---- 直播发言人（真人，外部）：只记录直播中自己说出或被介绍的身份 ----
  p({ id: 'leijun', name: L('雷军', 'Lei Jun'), short: L('雷', 'L'), role: L('直播主持 · 小米', 'Host · Xiaomi'), team: L('小米', 'Xiaomi'), rank: 'guest', external: true, bg: '#FFEDD5', fg: '#9A3412', profile: { aliases: ['雷总'], clearance: 'public', channels: [] } }),
  p({ id: 'houjinglei', name: L('侯静雷', 'Hou Jinglei'), short: L('静', 'J'), role: L('小米汽车副总裁兼安全部总经理', 'VP, Xiaomi Auto & GM of Safety'), team: L('小米汽车', 'Xiaomi Auto'), rank: 'guest', external: true, bg: '#DBEAFE', fg: '#1E40AF', profile: { aliases: ['静雷', '景雷'], clearance: 'public', channels: [] } }),
  p({ id: 'dingzhi', name: L('丁志', 'Ding Zhi'), short: L('志', 'D'), role: L('小米汽车全域安全部负责人', 'Head of Full-Domain Safety, Xiaomi Auto'), team: L('小米汽车', 'Xiaomi Auto'), rank: 'guest', external: true, bg: '#D1FAE5', fg: '#065F46', profile: { aliases: ['丁老师', '丁志老师'], clearance: 'public', channels: [] } }),
  p({ id: 'shuangge', name: L('爽哥', 'Shuang'), short: L('爽', 'S'), role: L('直播嘉宾 · 提问', 'Guest · asks questions'), team: L('直播', 'Livestream'), rank: 'guest', external: true, bg: '#F1F5F9', fg: '#475569', profile: { clearance: 'public', channels: [] } }),
]

export const personById = (id: PersonId) => PEOPLE.find(x => x.id === id)!
export const STAFF = PEOPLE.filter(x => !x.external)

/** 当前登录的人：竞品研究组组长江晚，主案例的发布者（上传直播、确认分发） */
export const ME: PersonId = 'jiangwan'

export const rankOf = (id: PersonId) => RANKS[personById(id).rank]

// ---------- 项目 ----------

export type ProjectId = string

export interface Project {
  id: ProjectId
  name: string
  color: string
  soft: string
  icon: KoboyoName
  desc: string
  /** 项目组 Leader：会议默认的发布者 */
  leader: PersonId
  members: PersonId[]
}

export const PROJECTS: Project[] = [
  { id: 'p_intel', name: L('竞品情报', 'Competitive Intel'), color: '#0891B2', soft: '#E6F7FB', icon: 'newspaper', desc: L('竞品发布会、直播的按人分发', 'Competitor launches and livestreams, split per person'), leader: 'jiangwan', members: ['jiangwan', 'linxia', 'hanzong', 'songlan', 'weiran', 'xunuo', 'chengcheng', 'gaoyuan', 'dengkai'] },
  { id: 'p_safety', name: L('安全体系建设', 'Safety System'), color: '#4F46E5', soft: '#EEF0FF', icon: 'stamp', desc: L('安委会、评审机制、开发安全清单', 'Safety Committee, review gate, dev safety checklist'), leader: 'songlan', members: ['songlan', 'weiran', 'xunuo', 'tangchuan', 'hanzong', 'jiangwan'] },
  { id: 'p_owner', name: L('车主运营', 'Owner Ops'), color: '#DB2777', soft: '#FDF0F6', icon: 'handshake', desc: L('积分、App 安全分、车主培训', 'Points, app safety score, owner training'), leader: 'chengcheng', members: ['chengcheng', 'gaoyuan', 'dengkai', 'jiangwan', 'hanzong'] },
  { id: 'p_retail', name: L('门店与交付', 'Retail & Delivery'), color: '#D97706', soft: '#FEF5E7', icon: 'rocket', desc: L('门店话术、权益对比、交付体验', 'Store talk tracks, perk comparison, delivery experience'), leader: 'dengkai', members: ['dengkai', 'gaoyuan', 'jiangwan', 'linxia', 'chengcheng'] },
]

export const projectById = (id: ProjectId) => PROJECTS.find(x => x.id === id) ?? PROJECTS[0]

// ---------- 账本条目 ----------

export type ItemType = 'decision' | 'action' | 'change' | 'risk' | 'question' | 'info'

export const ITEM_TYPES: Record<ItemType, { label: string; color: string; soft: string }> = {
  decision: { label: L('决议', 'Decision'), color: '#4F46E5', soft: '#EEF0FF' },
  action: { label: L('待办', 'To-do'), color: '#2563EB', soft: '#EAF2FF' },
  change: { label: L('变更', 'Change'), color: '#D97706', soft: '#FEF5E7' },
  risk: { label: L('风险', 'Risk'), color: '#E11D48', soft: '#FFEDF1' },
  question: { label: L('问题', 'Question'), color: '#0891B2', soft: '#E6F7FB' },
  info: { label: L('信息', 'Info'), color: '#64748B', soft: '#F1F5F9' },
}

export const SENSITIVITY: Record<Sensitivity, { label: string; desc: string }> = {
  public: { label: L('公开', 'Public'), desc: L('可以转发给任何人', 'Can be forwarded to anyone') },
  internal: { label: L('内部', 'Internal'), desc: L('团队内相关人可见', 'Visible to relevant people on the team') },
  restricted: { label: L('受限', 'Restricted'), desc: L('只给名单内的人看原文，其他人看脱敏版', 'Full text for the allow-list only; others see a redacted version') },
  confidential: { label: L('机密', 'Confidential'), desc: L('只给名单内的人，其他人完全看不到', 'Allow-list only; hidden from everyone else') },
}

// ---------- 推送理由 ----------

export const REASONS: Record<string, string> = L({
  R1: '被点名',
  R2: '被角色点到',
  R3: '负责的东西被提到',
  R4: '依赖的东西变了',
  R5: '订阅的话题',
  R6: '管理者规则',
}, {
  R1: 'Named in the meeting',
  R2: 'Their role was called on',
  R3: 'Something they own came up',
  R4: 'Something they depend on changed',
  R5: 'A topic they follow',
  R6: 'Manager rule',
})

export const REASON_SHORT: Record<string, string> = L({
  R1: '点名', R2: '角色', R3: '负责', R4: '依赖变了', R5: '订阅', R6: '规则',
}, {
  R1: 'Named', R2: 'Role', R3: 'Owns', R4: 'Dependency', R5: 'Follows', R6: 'Rule',
})

// ---------- 模型（可替换，默认多模型协同） ----------

export type ModelId =
  | 'deepseek' | 'qwen' | 'kimi' | 'glm' | 'doubao' | 'ernie' | 'hunyuan' | 'minimax' | 'spark' | 'stepfun'
  | 'baichuan' | 'yi' | 'sensenova' | 'internlm' | 'claude' | 'gpt' | 'gemini' | 'grok' | 'llama' | 'mistral'
export type IconKey = ModelId | 'modelscope' | 'code' | 'send'

export interface ModelInfo {
  id: ModelId
  label: string
  vendor: string
  region: 'cn' | 'global'
  /** 可以私有化部署（数据不出企业） */
  open?: boolean
  /** 每百万 token 的粗估混合单价（元），只用于演示里的成本估算 */
  yuanPerM: number
}

export const MODELS: ModelInfo[] = [
  { id: 'deepseek', label: 'DeepSeek', vendor: L('深度求索', 'DeepSeek'), region: 'cn', open: true, yuanPerM: 2.2 },
  { id: 'qwen', label: L('通义千问', 'Qwen'), vendor: L('阿里云', 'Alibaba Cloud'), region: 'cn', open: true, yuanPerM: 2.4 },
  { id: 'kimi', label: 'Kimi', vendor: L('月之暗面', 'Moonshot AI'), region: 'cn', open: true, yuanPerM: 6 },
  { id: 'glm', label: L('智谱 GLM', 'GLM'), vendor: L('智谱 AI', 'Zhipu AI'), region: 'cn', open: true, yuanPerM: 3 },
  { id: 'doubao', label: L('豆包', 'Doubao'), vendor: L('字节跳动', 'ByteDance'), region: 'cn', yuanPerM: 1.6 },
  { id: 'ernie', label: L('文心', 'ERNIE'), vendor: L('百度', 'Baidu'), region: 'cn', yuanPerM: 4 },
  { id: 'hunyuan', label: L('混元', 'Hunyuan'), vendor: L('腾讯', 'Tencent'), region: 'cn', yuanPerM: 3 },
  { id: 'minimax', label: 'MiniMax', vendor: L('稀宇科技', 'MiniMax'), region: 'cn', open: true, yuanPerM: 3.5 },
  { id: 'spark', label: L('讯飞星火', 'iFlytek Spark'), vendor: L('科大讯飞', 'iFlytek'), region: 'cn', yuanPerM: 4 },
  { id: 'stepfun', label: L('阶跃星辰', 'StepFun'), vendor: L('阶跃星辰', 'StepFun'), region: 'cn', open: true, yuanPerM: 4 },
  { id: 'baichuan', label: L('百川', 'Baichuan'), vendor: L('百川智能', 'Baichuan AI'), region: 'cn', open: true, yuanPerM: 3 },
  { id: 'yi', label: L('零一万物', 'Yi'), vendor: L('零一万物', '01.AI'), region: 'cn', open: true, yuanPerM: 3 },
  { id: 'sensenova', label: L('日日新', 'SenseNova'), vendor: L('商汤', 'SenseTime'), region: 'cn', yuanPerM: 4 },
  { id: 'internlm', label: L('书生', 'InternLM'), vendor: L('上海 AI 实验室', 'Shanghai AI Lab'), region: 'cn', open: true, yuanPerM: 0 },
  { id: 'claude', label: 'Claude', vendor: 'Anthropic', region: 'global', yuanPerM: 45 },
  { id: 'gpt', label: 'GPT', vendor: 'OpenAI', region: 'global', yuanPerM: 40 },
  { id: 'gemini', label: 'Gemini', vendor: 'Google', region: 'global', yuanPerM: 25 },
  { id: 'grok', label: 'Grok', vendor: 'xAI', region: 'global', yuanPerM: 30 },
  { id: 'llama', label: 'Llama', vendor: 'Meta', region: 'global', open: true, yuanPerM: 0 },
  { id: 'mistral', label: 'Mistral', vendor: 'Mistral AI', region: 'global', open: true, yuanPerM: 8 },
]

export const modelById = (id: ModelId) => MODELS.find(x => x.id === id)!

/** 默认的多模型组合：每个智能体用最擅长它那一步的模型 */
export const DEFAULT_MODELS: ModelId[] = ['deepseek', 'qwen', 'kimi', 'glm', 'claude']
