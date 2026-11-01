import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { L, monthName } from './i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** “**加粗**”标记：去掉标记后的纯文本 */
export const plain = (s: string) => s.replace(/\*\*/g, '')

/** 2026-10-31 → 10月31日 / Oct 31 */
export const cnDate = (d: string) => {
  const [, m, day] = d.split('-').map(Number)
  return L(`${m}月${day}日`, `${monthName(m)} ${day}`)
}

export const WEEK = L(['周日', '周一', '周二', '周三', '周四', '周五', '周六'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
export const weekday = (d: string) => WEEK[new Date(`${d}T00:00:00`).getDay()]
