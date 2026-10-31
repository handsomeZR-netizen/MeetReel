// 全局 UI 小开关：任何页面都能打开 Ctrl K 搜索
let opener: () => void = () => {}
export const setSearchOpener = (f: () => void) => { opener = f }
export const openSearch = () => opener()
