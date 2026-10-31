// 跨页面共享的演示状态：哪场会已分发、谁确认了哪条、回流动态、当前模型。
// 不持久化，刷新即回到初始状态，方便反复演示。

import { useRef, useSyncExternalStore } from 'react'
import type { EngineId, PersonId } from '@/data/model'
import { MEETINGS, itemById } from '@/data/meetings'
import { personById } from '@/data/model'

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
  events: FeedEvent[]
  engine: EngineId
}

let seq = 100

const initial = (): State => ({
  dispatched: Object.fromEntries(MEETINGS.map(m => [m.id, m.status === 'sent'])),
  confirmed: Object.fromEntries(MEETINGS.flatMap(m => m.confirmed.map(id => [id, m.items.find(i => i.id === id)!.owner!]))),
  owners: {},
  answered: {},
  engine: 'deepseek',
  events: [
    { id: 1, when: '昨天 15:40', meeting: 'cx', item: 'cx_06', person: 'maxiao', kind: 'ask', text: '补券的话，券面额和预算谁来定？' },
    { id: 2, when: '昨天 11:20', meeting: 'cx', item: 'cx_04', person: 'lilin', kind: 'confirm' },
    { id: 3, when: '昨天 10:58', meeting: 'cx', item: 'cx_03', person: 'wangke', kind: 'confirm' },
    { id: 4, when: '10/29 17:02', meeting: 'q4', item: 'q4_06', person: 'zhouning', kind: 'confirm' },
    { id: 5, when: '10/28 15:10', meeting: 'app', item: 'app_02', person: 'tangyou', kind: 'confirm' },
    { id: 6, when: '10/21 09:30', meeting: 's618', item: 's618_05', person: 'wutong', kind: 'confirm' },
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
  setEngine: (engine: EngineId) => set({ engine }),

  /** 投递完成：标记已分发，并模拟几条陆续回流的确认和追问 */
  dispatch(meeting: string) {
    if (state.dispatched[meeting]) return
    set(s => ({ dispatched: { ...s.dispatched, [meeting]: true } }))
    push({ meeting, person: 'wangke', kind: 'sent', text: '7 份简报已投递到飞书' })
    if (meeting !== 'd11') return
    later(2600, () => actions.confirm('it_04', 'chenmo'))
    later(5200, () => actions.confirm('it_02', 'sunyue'))
    later(8200, () => push({ meeting, item: 'it_01', person: 'lilin', kind: 'ask', text: '新券规则什么时候对用户公告？' }))
    later(11500, () => actions.confirm('it_07', 'zhouning'))
    later(15000, () => push({ meeting, person: 'linzong', kind: 'read', text: '看完了 90 秒视频简报' }))
  },

  confirm(item: string, person: PersonId) {
    if (state.confirmed[item]) return
    set(s => ({ confirmed: { ...s.confirmed, [item]: person } }))
    push({ meeting: itemById(item).meeting, item, person, kind: 'confirm' })
  },

  /** 主持人指派负责人；被指派的人稍后确认 */
  assign(item: string, person: PersonId) {
    if (state.owners[item] === person) return
    set(s => ({ owners: { ...s.owners, [item]: person } }))
    push({ meeting: itemById(item).meeting, item, person: 'wangke', kind: 'assign', text: `指派给 ${personById(person).name}` })
    later(3500, () => actions.confirm(item, person))
  },

  /** 主持人转问 / 回答一条追问 */
  answer(eventId: number, text: string) {
    set(s => ({ answered: { ...s.answered, [eventId]: true } }))
    const ev = state.events.find(e => e.id === eventId)
    if (ev) push({ meeting: ev.meeting, item: ev.item, person: 'wangke', kind: 'answer', text })
  },

  /** 看过回流动态后清掉“新”标记 */
  seen: () => {
    if (state.events.some(e => e.fresh)) set(s => ({ events: s.events.map(e => (e.fresh ? { ...e, fresh: false } : e)) }))
  },

  reset: () => { state = initial(); emit() },
}
