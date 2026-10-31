import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** “**加粗**”标记：去掉标记后的纯文本 */
export const plain = (s: string) => s.replace(/\*\*/g, '')

/** 2026-10-31 → 10月31日 */
export const cnDate = (d: string) => {
  const [, m, day] = d.split('-').map(Number)
  return `${m}月${day}日`
}

export const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export const weekday = (d: string) => WEEK[new Date(`${d}T00:00:00`).getDay()]
