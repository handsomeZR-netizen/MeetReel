// 会映的基础数据：人（职级、部门、汇报线）、项目（Leader）、条目类型、推送理由、可选模型。
// 主案例是“小米汽车安全专场直播”：直播里的 4 位发言人是真人，只引用原话；收件人全部是一家虚构车企的员工。
// 字段沿用需求文档第 8 节的数据契约；现在全部是 mock，后端接好后由接口返回同样的结构。

import type { KoboyoName } from '@/components/sketch/koboyoData'

export type PersonId =
  // 直播发言人（真人，外部）
  | 'leijun' | 'houjinglei' | 'dingzhi' | 'shuangge'
  // 收件人（虚构车企）
  | 'hanzong' | 'songlan' | 'weiran' | 'xunuo' | 'chengcheng' | 'gaoyuan' | 'jiangwan' | 'dengkai' | 'linxia' | 'tangchuan'

export type Sensitivity = 'public' | 'internal' | 'restricted' | 'confidential'

/** 职级：决定简报写成什么样（高管看决议和投入，成员看自己的待办） */
export type Rank = 'exec' | 'head' | 'lead' | 'staff' | 'guest'

export const RANKS: Record<Rank, { level: string; label: string; color: string; soft: string; brief: string }> = {
  exec: { level: 'L1', label: '高管', color: '#17171A', soft: '#EDEDED', brief: '决议、风险、投入规模，约 60 秒' },
  head: { level: 'L2', label: '部门负责人', color: '#4338CA', soft: '#EEF0FF', brief: '本部门相关的决议和变化' },
  lead: { level: 'L3', label: '组长', color: '#1D4ED8', soft: '#EAF2FF', brief: '负责的事 + 组员的待办' },
  staff: { level: 'L4', label: '成员', color: '#475569', soft: '#F1F5F9', brief: '只有自己的待办，约 10 秒' },
  guest: { level: '外部', label: '外部发言人', color: '#C2410C', soft: '#FFF1E6', brief: '不推送，只引用原话' },
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
const p = (x: PersonInput): Person => ({
  ...x,
  profile: { aliases: [], owns: [], dependsOn: [], interests: [], channels: ['飞书'], ...x.profile },
})

export const PEOPLE: Person[] = [
  // ---- 收件人（虚构车企）----
  p({ id: 'jiangwan', name: '江晚', short: '晚', role: '竞品研究组组长', team: '市场部', group: '竞品研究组', rank: 'lead', reportsTo: 'hanzong', bg: '#FFE4E6', fg: '#9F1239',
    profile: { aliases: ['市场', '品牌', '竞品'], owns: ['品牌定位', '竞品研究', '对外宣传口径', '门店安全话术'], interests: ['安全理念', '宣传口径', '竞品卖点'], clearance: 'restricted', channels: ['飞书', 'H5'] } }),
  p({ id: 'hanzong', name: '韩总', short: '韩', role: '总经理', team: '管理层', rank: 'exec', bg: '#FEF3C7', fg: '#92400E',
    profile: { aliases: ['老板', '管理层'], owns: ['公司经营', '安全战略'], interests: ['竞品目标', '组织机制', '投入规模'], clearance: 'confidential', channels: ['飞书', '90 秒视频'] } }),
  p({ id: 'songlan', name: '宋岚', short: '岚', role: '安全部负责人', team: '安全部', rank: 'head', reportsTo: 'hanzong', bg: '#E0E7FF', fg: '#3730A3',
    profile: { aliases: ['安全部', '安委会'], owns: ['安全体系建设', '安全委员会', '安全评审流程'], interests: ['竞品安全体系', '安全组织'], clearance: 'restricted', channels: ['飞书', 'H5'] } }),
  p({ id: 'chengcheng', name: '程橙', short: '橙', role: '车主运营负责人', team: '用户运营部', rank: 'head', reportsTo: 'hanzong', bg: '#FCE7F3', fg: '#9D174D',
    profile: { aliases: ['车主运营', '新车主运营'], owns: ['车主积分体系', '车主 App', '车主社区'], dependsOn: ['用户授权'], interests: ['用车安全'], clearance: 'internal' } }),
  p({ id: 'gaoyuan', name: '高远', short: '远', role: '交付与车主培训负责人', team: '交付中心', rank: 'head', reportsTo: 'hanzong', bg: '#DCFCE7', fg: '#166534',
    profile: { aliases: ['交付', '培训'], owns: ['交付体验', '车主驾驶培训', '试驾'], dependsOn: ['车主积分体系', '门店安全话术'], interests: ['车主培训', '车主激励'], clearance: 'internal' } }),
  p({ id: 'dengkai', name: '邓凯', short: '凯', role: '销售渠道负责人', team: '销售部', rank: 'head', reportsTo: 'hanzong', bg: '#FEF9C3', fg: '#854D0E',
    profile: { aliases: ['门店', '销售'], owns: ['门店销售', '购车权益对比'], dependsOn: ['门店安全话术'], interests: ['竞品卖点'], clearance: 'internal' } }),
  p({ id: 'weiran', name: '魏然', short: '然', role: '整车安全开发组长', team: '安全部', group: '整车安全开发组', rank: 'lead', reportsTo: 'songlan', bg: '#CCFBF1', fg: '#115E59',
    profile: { aliases: ['整车安全', '产品安全'], owns: ['整车安全开发', '座椅安全', '碰撞安全', '电池安全'], interests: ['主被动安全'], clearance: 'internal', channels: ['飞书', 'MCP'] } }),
  p({ id: 'xunuo', name: '许诺', short: '诺', role: '电子电气安全组长', team: '安全部', group: '智驾与电子电气安全组', rank: 'lead', reportsTo: 'songlan', bg: '#EDE9FE', fg: '#5B21B6',
    profile: { aliases: ['智驾', '电子电气'], owns: ['智能驾驶', '电子电气架构', '网络安全', 'OTA 功能安全'], interests: ['电子安全'], clearance: 'internal', channels: ['飞书', '日报'] } }),
  p({ id: 'linxia', name: '林夏', short: '夏', role: '竞品研究专员', team: '市场部', group: '竞品研究组', rank: 'staff', reportsTo: 'jiangwan', bg: '#E0F2FE', fg: '#075985',
    profile: { aliases: ['竞品专员'], owns: ['竞品资料库', '权益对比素材'], interests: ['竞品卖点', '购车权益'], clearance: 'internal' } }),
  p({ id: 'tangchuan', name: '唐川', short: '川', role: '安全评审工程师', team: '安全部', group: '安全评审', rank: 'staff', reportsTo: 'songlan', bg: '#F1F5F9', fg: '#334155',
    profile: { aliases: ['评审'], owns: ['安全检查清单', '评审记录'], dependsOn: ['安全评审流程'], interests: ['安全组织'], clearance: 'internal' } }),

  // ---- 直播发言人（真人，外部）：只记录直播中自己说出或被介绍的身份 ----
  p({ id: 'leijun', name: '雷军', short: '雷', role: '直播主持 · 小米', team: '小米', rank: 'guest', external: true, bg: '#FFEDD5', fg: '#9A3412', profile: { aliases: ['雷总'], clearance: 'public', channels: [] } }),
  p({ id: 'houjinglei', name: '侯静雷', short: '静', role: '小米汽车副总裁兼安全部总经理', team: '小米汽车', rank: 'guest', external: true, bg: '#DBEAFE', fg: '#1E40AF', profile: { aliases: ['静雷', '景雷'], clearance: 'public', channels: [] } }),
  p({ id: 'dingzhi', name: '丁志', short: '志', role: '小米汽车全域安全部负责人', team: '小米汽车', rank: 'guest', external: true, bg: '#D1FAE5', fg: '#065F46', profile: { aliases: ['丁老师', '丁志老师'], clearance: 'public', channels: [] } }),
  p({ id: 'shuangge', name: '爽哥', short: '爽', role: '直播嘉宾 · 提问', team: '直播', rank: 'guest', external: true, bg: '#F1F5F9', fg: '#475569', profile: { clearance: 'public', channels: [] } }),
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
  { id: 'p_intel', name: '竞品情报', color: '#0891B2', soft: '#E6F7FB', icon: 'newspaper', desc: '竞品发布会、直播的按人分发', leader: 'jiangwan', members: ['jiangwan', 'linxia', 'hanzong', 'songlan', 'weiran', 'xunuo', 'chengcheng', 'gaoyuan', 'dengkai'] },
  { id: 'p_safety', name: '安全体系建设', color: '#4F46E5', soft: '#EEF0FF', icon: 'stamp', desc: '安委会、评审机制、开发安全清单', leader: 'songlan', members: ['songlan', 'weiran', 'xunuo', 'tangchuan', 'hanzong', 'jiangwan'] },
  { id: 'p_owner', name: '车主运营', color: '#DB2777', soft: '#FDF0F6', icon: 'handshake', desc: '积分、App 安全分、车主培训', leader: 'chengcheng', members: ['chengcheng', 'gaoyuan', 'dengkai', 'jiangwan', 'hanzong'] },
  { id: 'p_retail', name: '门店与交付', color: '#D97706', soft: '#FEF5E7', icon: 'rocket', desc: '门店话术、权益对比、交付体验', leader: 'dengkai', members: ['dengkai', 'gaoyuan', 'jiangwan', 'linxia', 'chengcheng'] },
]

export const projectById = (id: ProjectId) => PROJECTS.find(x => x.id === id) ?? PROJECTS[0]

// ---------- 账本条目 ----------

export type ItemType = 'decision' | 'action' | 'change' | 'risk' | 'question' | 'info'

export const ITEM_TYPES: Record<ItemType, { label: string; color: string; soft: string }> = {
  decision: { label: '决议', color: '#4F46E5', soft: '#EEF0FF' },
  action: { label: '待办', color: '#2563EB', soft: '#EAF2FF' },
  change: { label: '变更', color: '#D97706', soft: '#FEF5E7' },
  risk: { label: '风险', color: '#E11D48', soft: '#FFEDF1' },
  question: { label: '问题', color: '#0891B2', soft: '#E6F7FB' },
  info: { label: '信息', color: '#64748B', soft: '#F1F5F9' },
}

export const SENSITIVITY: Record<Sensitivity, { label: string; desc: string }> = {
  public: { label: '公开', desc: '可以转发给任何人' },
  internal: { label: '内部', desc: '团队内相关人可见' },
  restricted: { label: '受限', desc: '只给名单内的人看原文，其他人看脱敏版' },
  confidential: { label: '机密', desc: '只给名单内的人，其他人完全看不到' },
}

// ---------- 推送理由 ----------

export const REASONS: Record<string, string> = {
  R1: '被点名',
  R2: '被角色点到',
  R3: '负责的东西被提到',
  R4: '依赖的东西变了',
  R5: '订阅的话题',
  R6: '管理者规则',
}

export const REASON_SHORT: Record<string, string> = {
  R1: '点名', R2: '角色', R3: '负责', R4: '依赖变了', R5: '订阅', R6: '规则',
}

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
  { id: 'deepseek', label: 'DeepSeek', vendor: '深度求索', region: 'cn', open: true, yuanPerM: 2.2 },
  { id: 'qwen', label: '通义千问', vendor: '阿里云', region: 'cn', open: true, yuanPerM: 2.4 },
  { id: 'kimi', label: 'Kimi', vendor: '月之暗面', region: 'cn', open: true, yuanPerM: 6 },
  { id: 'glm', label: '智谱 GLM', vendor: '智谱 AI', region: 'cn', open: true, yuanPerM: 3 },
  { id: 'doubao', label: '豆包', vendor: '字节跳动', region: 'cn', yuanPerM: 1.6 },
  { id: 'ernie', label: '文心', vendor: '百度', region: 'cn', yuanPerM: 4 },
  { id: 'hunyuan', label: '混元', vendor: '腾讯', region: 'cn', yuanPerM: 3 },
  { id: 'minimax', label: 'MiniMax', vendor: '稀宇科技', region: 'cn', open: true, yuanPerM: 3.5 },
  { id: 'spark', label: '讯飞星火', vendor: '科大讯飞', region: 'cn', yuanPerM: 4 },
  { id: 'stepfun', label: '阶跃星辰', vendor: '阶跃星辰', region: 'cn', open: true, yuanPerM: 4 },
  { id: 'baichuan', label: '百川', vendor: '百川智能', region: 'cn', open: true, yuanPerM: 3 },
  { id: 'yi', label: '零一万物', vendor: '零一万物', region: 'cn', open: true, yuanPerM: 3 },
  { id: 'sensenova', label: '日日新', vendor: '商汤', region: 'cn', yuanPerM: 4 },
  { id: 'internlm', label: '书生', vendor: '上海 AI 实验室', region: 'cn', open: true, yuanPerM: 0 },
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
