// 极简 hash 路由：#/m/xm_safety?t=262&item=xm_06
import { useSyncExternalStore } from 'react'

export interface Route {
  path: string[]
  query: URLSearchParams
  raw: string
}

const parse = (): Route => {
  const raw = location.hash.replace(/^#/, '') || '/'
  const [p, q = ''] = raw.split('?')
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q), raw }
}

// 前进 / 后退：给每条历史记录打上序号，就能知道还能不能往回、往前走
interface Nav { idx: number; max: number }
const stamp = (): number => {
  const i = (history.state as { i?: number } | null)?.i
  if (typeof i === 'number') return i
  const next = nav ? nav.idx + 1 : 0
  history.replaceState({ ...(history.state ?? {}), i: next }, '')
  return next
}
let nav: Nav | null = null
const first = stamp()
nav = { idx: first, max: first }

let cur = parse()
const subs = new Set<() => void>()
window.addEventListener('hashchange', () => {
  const fresh = typeof (history.state as { i?: number } | null)?.i !== 'number'
  const idx = stamp()
  // 新开的一条会截掉原来的“前进”记录
  nav = { idx, max: fresh ? idx : Math.max(nav!.max, idx) }
  cur = parse()
  subs.forEach(f => f())
})

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => cur)
}

export function useNav(): Nav {
  return useSyncExternalStore(subscribe, () => nav!)
}

export function href(path: string, query?: Record<string, string | number | undefined | null>) {
  const q = query ? Object.entries(query).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : ''
  return `#${path}${q ? `?${q}` : ''}`
}

export function go(path: string, query?: Record<string, string | number | undefined | null>) {
  location.hash = href(path, query)
}

/** 跳到会议详情的某个时刻（溯源入口） */
export const goSource = (meeting: string, t: number, item?: string) => go(`/m/${meeting}`, { t: t.toFixed(1), item })
