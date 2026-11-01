// 中英文切换：整页只用一种语言。切换时存进 localStorage 并刷新页面，
// 这样 data/ 里在模块加载时就算好的东西（会议、简报、编排剧本）也能直接用 L() 写两种语言。
// 链接里带 ?lang=en（hash 里的 query 也行）可以直接打开英文版，方便发给海外客户。

export type Lang = 'zh' | 'en'

const KEY = 'meetreel.lang'

function detect(): Lang {
  const fromUrl = (location.hash.split('?')[1] ?? '').match(/(?:^|&)lang=(zh|en)\b/)?.[1] ?? new URLSearchParams(location.search).get('lang')
  if (fromUrl === 'zh' || fromUrl === 'en') {
    try { localStorage.setItem(KEY, fromUrl) } catch { /* 隐身模式等存不了，就只管这一次 */ }
    return fromUrl
  }
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch { /* 同上 */ }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const lang: Lang = detect()
export const isEn = lang === 'en'

/** 两种语言写在一起：L('与我有关', 'For me')；也可以传 JSX 或任何值 */
export const L = <T,>(zh: T, en: T): T => (isEn ? en : zh)

export function setLang(next: Lang) {
  if (next === lang) return
  try { localStorage.setItem(KEY, next) } catch { /* 存不了就靠 URL */ }
  // 去掉链接里的 lang=，不然刷新后又被它覆盖
  const [p, q = ''] = location.hash.split('?')
  const rest = q.split('&').filter(kv => kv && !kv.startsWith('lang=')).join('&')
  const hash = `${p}${rest ? `?${rest}` : ''}`
  if (hash !== location.hash) history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`)
  location.reload()
}

document.documentElement.lang = L('zh-CN', 'en')
document.title = L('会映 MeetReel · 工作台', 'MeetReel · Workspace')

// ---------- 英文里常用的小工具 ----------

/** 英文复数：plural(3, 'item') → 3 items；中文原样拼 */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const monthName = (m: number) => MONTHS[(m - 1 + 12) % 12]
