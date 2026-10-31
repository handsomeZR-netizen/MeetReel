// 极简 hash 路由：#/m/d11?t=17&item=it_04
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

let cur = parse()
const subs = new Set<() => void>()
window.addEventListener('hashchange', () => {
  cur = parse()
  subs.forEach(f => f())
})

export function useRoute(): Route {
  return useSyncExternalStore(
    f => { subs.add(f); return () => subs.delete(f) },
    () => cur,
  )
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
