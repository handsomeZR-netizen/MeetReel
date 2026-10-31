/** 五种风格的登记表：总览页和风格切换器都读这里 */
export interface StyleEntry {
  id: string
  key: string
  name: string
  en: string
  path: string
  tagline: string
  points: string[]
  stack: string[]
  /** 缩略图用的帧（秒） */
  thumbAt: number
  swatch: [string, string, string]
}

export const STYLES: StyleEntry[] = [
  {
    id: 'glass', key: 'A', name: '玻璃', en: 'Glass', path: '/glass/',
    tagline: '极光底色上的磨砂玻璃，8 个智能体像星座一样轮流亮起。',
    points: ['visionOS 式玻璃面板', '智能体星座 + 交接光束', '简报卡片共享元素展开'],
    stack: ['motion', 'backdrop-filter', 'morphicons'],
    thumbAt: 7.4, swatch: ['#6366F1', '#22D3EE', '#F0ABFC'],
  },
  {
    id: 'chat', key: 'B', name: '对话', en: 'Chat', path: '/chat/',
    tagline: '像 ChatGPT 一样：贴会议、看它思考、结果流式写出，点人名在侧边画布打开简报。',
    points: ['可展开的“思考过程”', '逐字流式输出', 'Canvas 侧栏看个人简报'],
    stack: ['motion', 'morphicons', 'lucide'],
    thumbAt: 20, swatch: ['#0D0D0D', '#F4F4F4', '#10A37F'],
  },
  {
    id: 'ui', key: 'C', name: '控制台', en: 'shadcn/ui', path: '/ui/',
    tagline: 'shadcn/ui + Tailwind v4 搭的运营控制台：表格、标签页、侧滑面板、Ctrl K 搜索，支持暗色。',
    points: ['真 shadcn 组件（Radix）', '数据表 + 命令面板', '亮 / 暗主题一键切换'],
    stack: ['shadcn/ui', 'Tailwind v4', 'Radix', 'cmdk'],
    thumbAt: 12.2, swatch: ['#18181B', '#FAFAFA', '#6366F1'],
  },
  {
    id: 'night', key: 'D', name: '暗夜', en: 'Midnight', path: '/night/',
    tagline: 'Linear / Raycast 式暗色：泳道时间轴、扫描光标、账本到人的光束连线。',
    points: ['泳道甘特 + 扫描线', '光束路由动画', '鼠标跟随的聚光描边'],
    stack: ['motion', 'SVG', 'morphicons'],
    thumbAt: 12.6, swatch: ['#08090A', '#5E6AD2', '#26C6DA'],
  },
  {
    id: 'sketch', key: 'E', name: '手绘白板', en: 'Sketch', path: '/sketch/',
    tagline: 'Koboyo 式无限画布：手绘框线、手写批注、路由矩阵一笔一笔画出来。',
    points: ['rough.js 手绘线条', 'Koboyo 手绘图标', '霞鹜文楷手写批注'],
    stack: ['rough.js', 'Koboyo Icons', 'LXGW WenKai'],
    thumbAt: 12.4, swatch: ['#FBFBF8', '#1E1E1E', '#F2C94C'],
  },
]
