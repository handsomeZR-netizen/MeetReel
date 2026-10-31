# 会映 · 前端风格实验室

同一份演示剧本（双 11 评审会：输入 → 8 个智能体编排 → 账本按人分发 → 每人一份简报），做成 5 种视觉风格，用来挑正式前端的方向。

```bash
npm install
npm run dev      # http://localhost:5174 ，首页是风格总览
npm run build
```

演示数据直接读 `../web/src/data/demo.ts`，和正式前端是同一份；改那里，5 个风格一起变。

## 五种风格

| 键 | 风格 | 地址 | 看点 | 用到 |
|---|---|---|---|---|
| 1 | A · 玻璃 Glass | `/glass/` | 极光底 + 磨砂玻璃；智能体星座、交接光束；完成后 macOS 式放大 Dock，点开 visionOS 式简报窗口 | motion、backdrop-filter、morphicons |
| 2 | B · 对话 Chat | `/chat/` | ChatGPT 式：附件 → 可展开的“思考过程” → 逐字流式回答 → 人员卡片 → 右侧 Canvas 看飞书卡片 / 数据；预置 3 个追问 | motion、morphicons |
| 3 | C · 控制台 shadcn/ui | `/ui/` | 真 shadcn 组件（Radix + Tailwind v4）：指标卡、标签页、数据表、Sheet、Ctrl K 命令面板、亮暗主题 | shadcn/ui、Tailwind v4、Radix、cmdk |
| 4 | D · 暗夜 Midnight | `/night/` | Linear / Raycast 式暗色：Raycast 启动器、泳道时间轴 + 扫描线 + 交接弧线、账本到人的光束、终端日志、鼠标聚光描边 | motion、SVG |
| 5 | E · 手绘白板 Sketch | `/sketch/` | Koboyo 式无限画布（可拖动、缩放）：rough.js 手绘框和箭头、工作中的框“线条抖动”、路由矩阵逐格打勾、手写批注、便利贴简报 | rough.js、Koboyo Icons、霞鹜文楷 |

## 现场用法

- 首页每张卡片是实时缩略图；右上角的心可以投票，票数存在这台电脑的浏览器里（`localStorage`），右下的投票卡实时排名。
- 任何页面按 `1`–`5` 切风格，`0` 回总览；右下角的切换器也能切。
- 运行中按空格暂停 / 继续；各页都有 2× 速度和重放。
- 地址参数：`?at=12` 直接从第 12 秒开始；再加 `&still` 停在那一帧（总览页缩略图就是这么做的）。

## 目录

| 路径 | 内容 |
|---|---|
| `index.html` + `src/gallery/` | 风格总览、投票 |
| `src/shared/script.ts` | 从演示时钟 `t` 推导所有状态：智能体忙闲、条目校验、路由、简报就绪 |
| `src/shared/useDemo.ts`、`useClock.ts` | 输入 → 运行流程、演示时钟、地址参数 |
| `src/shared/Switcher.tsx` | 右下角风格切换器 |
| `src/shared/koboyoData.ts`、`Koboyo.tsx` | 31 个 Koboyo 手绘图标（路径数据）和组件 |
| `src/<风格>/` | 各风格的页面和样式，互相独立（多页面，样式不串） |
| `src/ui/components/ui/` | shadcn 组件；`components.json` 已配好，可以继续用 `npx shadcn add` 加组件 |

## 第三方素材

- 手绘图标：[Koboyo Icons](https://koboyo.com/icons)（Original 风格），免费商用、无需署名；不能把图标库本身单独再分发。
- 形变图标：[morphicons](https://www.morphicons.com/)，图标数据来自 `lucide`。
- 模型图标：Lobe Icons，见 `../web/src/assets/models/SOURCE.md`。
- 字体：Inter、Geist、JetBrains Mono（fontsource），霞鹜文楷（`lxgw-wenkai-webfont`，OFL）。
