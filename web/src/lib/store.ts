// 跨页面共享的演示状态：哪场会已分发、谁确认了哪条、回流动态、选用的模型、新建的项目。
// 不持久化，刷新即回到初始状态，方便反复演示。

import { useRef, useSyncExternalStore } from 'react'
import { DEFAULT_MODELS, ME, personById, type ModelId, type PersonId, type Project } from '@/data/model'
import { MEETINGS, itemById } from '@/data/meetings'
import { RUN_ID } from '@/data/run'
import type { TodoStatus } from '@/data/schedule'

export type FeedKind = 'confirm' | 'ask' | 'assign' | 'not_me' | 'answer' | 'sent' | 'read'

export interface FeedEvent {
  id: number
  when: string
  meeting: string
  item?: string
  person: PersonId
  kind: FeedKind
  text?: string
  fresh?: boolean
}

interface State {
  dispatched: Record<string, boolean>
  confirmed: Record<string, PersonId>
  owners: Record<string, PersonId>
  answered: Record<string, boolean>
  /** 已完成的待办 */
  done: Record<string, boolean>
  /** 进行中的待办 */
  doing: Record<string, boolean>
  /** 在日历上排期的截止日（缺截止的待办接受建议或手动排上去） */
  due: Record<string, string>
  events: FeedEvent[]
  /** 选用的模型：多选 = 多模型协同（默认），单选 = 全部智能体用同一个 */
  models: ModelId[]
  projects: Project[]
}

let seq = 100

const initial = (): State => ({
  dispatched: Object.fromEntries(MEETINGS.map(m => [m.id, m.status === 'sent'])),
  confirmed: Object.fromEntries(MEETINGS.flatMap(m => m.confirmed.map(id => [id, m.items.find(i => i.id === id)!.owner!]))),
  owners: {},
  answered: {},
  done: {},
  doing: {},
  due: {},
  models: DEFAULT_MODELS,
  projects: [],
  events: [
    { id: 1, when: '今天 09:10', meeting: 'retail_weekly', person: 'hanzong', kind: 'read', text: '看完了门店销售周会的简报' },
    { id: 2, when: '昨天 17:30', meeting: 'own_monthly', item: 'ow_06', person: 'dengkai', kind: 'ask', text: '话术卡里竞品的说法，能先给门店看一版吗？' },
    { id: 3, when: '昨天 17:01', meeting: 'retail_weekly', item: 'rt_03', person: 'linxia', kind: 'confirm' },
    { id: 4, when: '10/29 11:52', meeting: 'own_monthly', item: 'ow_03', person: 'gaoyuan', kind: 'confirm' },
    { id: 5, when: '10/28 16:05', meeting: 'sf_weekly', item: 'sf_06', person: 'xunuo', kind: 'confirm' },
    { id: 6, when: '10/28 15:22', meeting: 'sf_weekly', item: 'sf_04', person: 'weiran', kind: 'confirm' },
  ],
})

let state: State = initial()
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
const set = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  emit()
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

const shallowEqual = (a: unknown, b: unknown) =>
  a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]))

/** 选择器可以返回新数组（例如 events.filter），内容没变就复用上一次的结果，避免无限重渲染 */
export function useStore<T>(pick: (s: State) => T): T {
  const last = useRef<{ v: T } | null>(null)
  return useSyncExternalStore(subscribe, () => {
    const v = pick(state)
    if (last.current && shallowEqual(last.current.v, v)) return last.current.v
    last.current = { v }
    return v
  })
}
export const getState = () => state

const push = (e: Omit<FeedEvent, 'id' | 'when'> & { when?: string }) =>
  set(s => ({ events: [{ id: ++seq, when: e.when ?? '刚刚', fresh: true, ...e }, ...s.events] }))

const later = (ms: number, f: () => void) => window.setTimeout(f, ms)

export const actions = {
  /** 多选模型；至少保留一个 */
  toggleModel: (id: ModelId) => set(s => {
    const on = s.models.includes(id)
    if (on && s.models.length === 1) return {}
    return { models: on ? s.models.filter(x => x !== id) : [...s.models, id] }
  }),
  setModels: (models: ModelId[]) => set({ models: models.length ? models : DEFAULT_MODELS }),

  addProject: (p: Project) => set(s => ({ projects: [...s.projects, p] })),

  /** 投递完成：标记已分发，并模拟几条陆续回流的阅读和追问 */
  dispatch(meeting: string) {
    if (state.dispatched[meeting]) return
    set(s => ({ dispatched: { ...s.dispatched, [meeting]: true } }))
    push({ meeting, person: ME, kind: 'sent', text: '7 份简报已投递到飞书' })
    if (meeting !== RUN_ID) return
    // 安全周会上派给江晚的“直播完按人分发”，到这里就做完了
    set(s => ({ done: { ...s.done, sf_08: true } }))
    later(2600, () => push({ meeting, person: 'songlan', kind: 'read', text: '读完了，标了 2 条转给安委会' }))
    later(5200, () => push({ meeting, item: 'xm_01', person: 'dengkai', kind: 'ask', text: '699 元的表盘是限时权益还是长期的？' }))
    later(8200, () => push({ meeting, person: 'hanzong', kind: 'read', text: '看完了 90 秒视频简报' }))
    later(11500, () => push({ meeting, item: 'xm_19', person: 'chengcheng', kind: 'ask', text: '4000 积分大概值多少钱？试点方案想对标' }))
    later(15000, () => push({ meeting, item: 'xm_14', person: 'weiran', kind: 'read', text: '把座椅夹手那条加进了开发清单' }))
  },

  confirm(item: string, person: PersonId) {
    if (state.confirmed[item]) return
    set(s => ({ confirmed: { ...s.confirmed, [item]: person } }))
    push({ meeting: itemById(item).meeting, item, person, kind: 'confirm' })
  },

  /** 改待办状态：直接开始或完成一条还没确认的，等于先确认负责 */
  setStatus(item: string, status: TodoStatus) {
    const owner = state.owners[item] ?? itemById(item).owner
    if (status !== 'triage' && owner && !state.confirmed[item]) actions.confirm(item, owner)
    set(s => ({
      doing: { ...s.doing, [item]: status === 'doing' },
      done: { ...s.done, [item]: status === 'done' },
    }))
  },

  /** 排期：把待办放到日历的某一天 */
  schedule: (item: string, date: string) => set(s => ({ due: { ...s.due, [item]: date } })),

  /** 发布者指派负责人；被指派的人稍后确认 */
  assign(item: string, person: PersonId) {
    if (state.owners[item] === person) return
    set(s => ({ owners: { ...s.owners, [item]: person } }))
    push({ meeting: itemById(item).meeting, item, person: ME, kind: 'assign', text: `指派给 ${personById(person).name}` })
    later(3500, () => actions.confirm(item, person))
  },

  /** 发布者转问 / 回答一条追问 */
  answer(eventId: number, text: string) {
    set(s => ({ answered: { ...s.answered, [eventId]: true } }))
    const ev = state.events.find(e => e.id === eventId)
    if (ev) push({ meeting: ev.meeting, item: ev.item, person: ME, kind: 'answer', text })
  },

  /** 看过回流动态后清掉“新”标记 */
  seen: () => {
    if (state.events.some(e => e.fresh)) set(s => ({ events: s.events.map(e => (e.fresh ? { ...e, fresh: false } : e)) }))
  },

  reset: () => { state = initial(); emit() },
}
