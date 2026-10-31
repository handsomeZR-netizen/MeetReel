// 会映的基础数据：人、项目、条目类型、推送理由。
// 字段沿用需求文档第 8 节的数据契约；现在全部是 mock，后端接好后由接口返回同样的结构。

import type { KoboyoName } from '@/components/sketch/koboyoData'

export type PersonId =
  | 'linzong' | 'wangke' | 'chenmo' | 'sunyue' | 'zhaoyi' | 'lilin'
  | 'zhouning' | 'wutong' | 'yezhou' | 'tangyou' | 'maxiao'

export type Sensitivity = 'public' | 'internal' | 'restricted' | 'confidential'

export interface Person {
  id: PersonId
  name: string
  short: string
  role: string
  team: string
  bg: string
  fg: string
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

const p = (
  id: PersonId, name: string, short: string, role: string, team: string, bg: string, fg: string,
  profile: Partial<Person['profile']> & { clearance: Sensitivity },
): Person => ({
  id, name, short, role, team, bg, fg,
  profile: { aliases: [], owns: [], dependsOn: [], interests: [], channels: ['飞书'], ...profile },
})

export const PEOPLE: Person[] = [
  p('wangke', '王珂', '珂', '产品经理', '产品组', '#E0E7FF', '#3730A3', { aliases: ['珂珂', '产品'], owns: ['活动产品方案', '会员小程序 2.0'], interests: ['上线时间', '需求变更'], clearance: 'restricted', channels: ['飞书', 'H5'] }),
  p('linzong', '林总', '林', '业务负责人', '管理层', '#FEF3C7', '#92400E', { aliases: ['老林', '业务'], owns: ['双 11 大促', 'Q4 经营目标'], interests: ['决议', '风险', '预算'], clearance: 'confidential', channels: ['飞书', '90 秒视频'] }),
  p('chenmo', '陈默', '默', '后端负责人', '研发组', '#DBEAFE', '#1E40AF', { aliases: ['后端', '默哥'], owns: ['订单接口', '压测', '扩容'], dependsOn: ['服务器预算'], interests: ['接口变更'], clearance: 'restricted', channels: ['飞书', 'MCP'] }),
  p('sunyue', '孙悦', '悦', '市场负责人', '市场组', '#FCE7F3', '#9D174D', { aliases: ['市场'], owns: ['活动物料', '拉新'], dependsOn: ['券规则'], interests: ['上线时间'], clearance: 'internal' }),
  p('zhaoyi', '赵一', '一', '客户端负责人', '研发组', '#D1FAE5', '#065F46', { aliases: ['客户端', 'App 端', '小赵'], owns: ['App 客户端', '小程序'], dependsOn: ['订单接口', '活动页'], interests: ['上线时间', '接口变更'], clearance: 'internal', channels: ['飞书', 'MCP'] }),
  p('lilin', '李琳', '琳', '客服主管', '客服组', '#EDE9FE', '#5B21B6', { aliases: ['客服'], owns: ['客服 FAQ', '客服话术'], dependsOn: ['券规则', '退款流程'], interests: ['上线时间'], clearance: 'internal' }),
  p('zhouning', '周宁', '宁', '财务', '财务组', '#FFE4E6', '#9F1239', { aliases: ['财务'], owns: ['预算审批'], interests: ['预算'], clearance: 'restricted' }),
  p('wutong', '吴桐', '桐', '数据分析', '数据组', '#F1F5F9', '#475569', { aliases: ['数据'], owns: ['数据看板', '转化漏斗'], interests: ['日报'], clearance: 'internal', channels: ['日报'] }),
  p('yezhou', '叶舟', '舟', '客户成功负责人', '客户成功部', '#CCFBF1', '#115E59', { aliases: ['客户成功'], owns: ['NPS', '客户满意度'], interests: ['退款', '客服'], clearance: 'internal' }),
  p('tangyou', '唐悠', '悠', '设计师', '设计组', '#FAE8FF', '#86198F', { aliases: ['设计'], owns: ['会员中心设计'], interests: ['需求变更'], clearance: 'internal' }),
  p('maxiao', '马骁', '骁', '运营', '运营组', '#FFEDD5', '#9A3412', { aliases: ['运营'], owns: ['券核销', '活动运营'], dependsOn: ['券规则'], interests: ['大促'], clearance: 'internal' }),
]

export const personById = (id: PersonId) => PEOPLE.find(x => x.id === id)!

/** 当前登录的人（主持人视角） */
export const ME: PersonId = 'wangke'

// ---------- 项目 ----------

export type ProjectId = 'p_promo' | 'p_cx' | 'p_q4' | 'p_app'

export interface Project {
  id: ProjectId
  name: string
  color: string
  soft: string
  icon: KoboyoName
  desc: string
  owner: PersonId
  members: PersonId[]
}

export const PROJECTS: Project[] = [
  { id: 'p_promo', name: '大促活动', color: '#D97706', soft: '#FEF5E7', icon: 'rocket', desc: '双 11、618 的筹备与复盘', owner: 'wangke', members: ['wangke', 'sunyue', 'chenmo', 'zhaoyi', 'lilin', 'zhouning', 'wutong', 'linzong', 'maxiao'] },
  { id: 'p_cx', name: '客户体验', color: '#0D9488', soft: '#E6F6F4', icon: 'handshake', desc: 'NPS、退款时效与客服体验', owner: 'yezhou', members: ['yezhou', 'lilin', 'wangke', 'wutong', 'chenmo', 'sunyue', 'linzong'] },
  { id: 'p_q4', name: 'Q4 经营规划', color: '#4F46E5', soft: '#EEF0FF', icon: 'target', desc: '目标、预算与排期对齐', owner: 'linzong', members: ['linzong', 'wangke', 'chenmo', 'sunyue', 'zhouning', 'zhaoyi', 'tangyou'] },
  { id: 'p_app', name: '会员小程序 2.0', color: '#2563EB', soft: '#EAF2FF', icon: 'lightbulb', desc: '会员等级、积分与会员中心', owner: 'wangke', members: ['wangke', 'tangyou', 'zhaoyi', 'chenmo', 'sunyue', 'lilin', 'linzong'] },
]

export const projectById = (id: ProjectId) => PROJECTS.find(x => x.id === id)!

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

// ---------- 模型（可替换） ----------

export type EngineId = 'deepseek' | 'claude' | 'qwen'
export type IconKey = 'deepseek' | 'claude' | 'qwen' | 'modelscope' | 'code' | 'send'

export interface Engine {
  id: EngineId
  label: string
  full: string
  sub: string
  /** 每百万 token 的粗估混合单价（元），只用于演示里的成本估算 */
  yuanPerM: number
}

export const ENGINES: Engine[] = [
  { id: 'deepseek', label: 'DeepSeek', full: 'DeepSeek V4.1 Flash', sub: '现场运行', yuanPerM: 2.2 },
  { id: 'claude', label: 'Claude', full: 'Claude Sonnet 5.5', sub: '评测基线', yuanPerM: 45 },
  { id: 'qwen', label: 'Qwen', full: 'Qwen 私有化', sub: '数据不出企业', yuanPerM: 0 },
]
