// 全局 UI 小开关：任何页面都能打开 Ctrl K 搜索；手机上顶栏的菜单按钮打开侧栏抽屉
import { useSyncExternalStore } from 'react'

let opener: () => void = () => {}
export const setSearchOpener = (f: () => void) => { opener = f }
export const openSearch = () => opener()

let navOpener: () => void = () => {}
export const setNavOpener = (f: () => void) => { navOpener = f }
export const openNav = () => navOpener()

/** 手机宽度（< 768px，和 Tailwind 的 md 断点一致） */
const PHONE = '(max-width: 767px)'
const phoneQuery = typeof matchMedia === 'function' ? matchMedia(PHONE) : null
export function usePhone() {
  return useSyncExternalStore(
    f => { phoneQuery?.addEventListener('change', f); return () => phoneQuery?.removeEventListener('change', f) },
    () => !!phoneQuery?.matches,
  )
}
