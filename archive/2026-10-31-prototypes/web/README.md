# 会映 MeetReel · 前端

React 19 + Vite 7 + TypeScript，动画用 motion（Framer Motion），图标用 lucide-react，模型图标来自 Lobe Icons（见 `src/assets/models/SOURCE.md`）。

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## 现在是什么

纯前端框架，后端还没接入。流程是：输入会议文本 → 多智能体编排动画 → 账本条目流向收件人 → 每人一份简报。

- 编排、账本、路由、简报都来自 `src/data/demo.ts` 的预置数据（双 11 评审会，需求文档 14.2 节剧本），字段沿用需求文档第 8 节的契约。
- 所有动画都由一个演示时钟 `t`（秒）推导（`src/lib/useClock.ts`），可以暂停、2 倍速、在时间轴上拖动。
- 输入框里的文本会被切成发言段显示在左栏；如果改了文本，分析结果仍是示例会议的，页面上有提示。

## 文件

| 文件 | 内容 |
|---|---|
| `src/components/Composer.tsx` | 输入页 |
| `src/components/TranscriptPanel.tsx` | 左栏：会议原文、议题、原话高亮 |
| `src/components/AgentTimeline.tsx` | 多智能体时间轴：泳道、交接线、悬停详情、模型切换 |
| `src/components/RoutingBoard.tsx` | 账本 → 收件人：条目卡片、流动连线、收件人卡片 |
| `src/components/Brief.tsx` | 结果区缩略卡 + 侧滑的个人简报（模拟飞书卡片） |

## 接后端时

把 `demo.ts` 里的 `SEGS / JOBS / LOG`（编排过程）、`ITEMS`（账本）、`ROUTES`（路由）、`BRIEFS`（简报）换成接口返回值即可；时间字段（`appearAt`、`at` 等）可以由后端日志里每个 Agent 的开始、结束时间生成。
