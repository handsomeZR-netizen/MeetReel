# 会映 MeetReel · 工作台（前端）

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

全部是 mock 数据，刷新页面回到初始状态（侧栏底部头像菜单里也能“重置演示数据”）。

**中英文**：顶栏右上角“EN / 中文”切换（存在 localStorage，切换会刷新页面、演示数据回到初始）；链接带 `?lang=en` 直接打开英文版，例如 `#/?lang=en`。
文案就近写成 `L('中文', 'English')`（`src/lib/i18n.ts`）；话题、负责范围这类要互相匹配的词统一走 `term()`（`data/model.ts`）；主案例直播的英文转写和简报在 `data/xm-en.ts`。

**手机**：小于 768px 时侧栏收进左上角菜单的抽屉，录像页上下叠放，智能分发的画布盖在对话上。

**部署**：`bash web/scripts/deploy.sh` 把当前分支已提交的 HEAD 发布到 https://120.26.94.180/sukesong/（同机还有别的项目，脚本只换 `/opt/sukesong/current`，不动 nginx）。

## 页面

| 地址 | 页面 | 看点 |
|---|---|---|
| `#/` | 我的会议 | 按项目组织；指标卡；待分发提醒；“需要你处理”；回流动态（确认、追问陆续回来） |
| `#/m/:id` | 会议详情 · 溯源 | 模拟录像（共享屏 + 发言人画面 + 逐字字幕）、多泳道进度条（章节 / 条目图钉 / 每人发言）、逐字稿逐字高亮、点任意一个字或原话跳到那一秒 |
| `#/m/:id?tab=people&p=linzong` | 成员简报 | 某个人收到了什么：相关议题、待处理事项、为什么发给 TA、TA 的发言；右栏会议信息、成员、文件、发送记录 |
| `#/dispatch/d11` | 智能分发 | 对话式智能体 + 右侧画布：深色编排时间轴 → 账本流向收件人 → 手绘路由矩阵 → 便利贴简报；投递前停下来等主持人确认 |
| `#/shared?as=zhaoyi` | 共享给我 | 收件人视角，可切换身份；权限闸实时生效（受限条目看脱敏版） |
| `#/kb` | 会议知识库 | 跨会议问答（回答附原话引用，点击回到录像）；按类型 / 项目筛选全部账本 |
| `#/templates` | 模板中心 | 分发规则 R1–R6、权限闸、人在回路、简报模板、会议模板、关注档案 |
| `#/new` | 新建会议 | 上传录像、选项目和相关人，进入智能分发 |

任何页面 `Ctrl K` 搜会议、条目、原话或人。

## 溯源怎么做的

每条账本条目都锚定到一段发言里的一句原话（`data/meetings.ts` 的 `seg` + `quote`），
`data/derive.ts` 由此算出它在录像里的秒数和逐字位置。所有“原话”按钮都跳到
`#/m/<会议>?t=<秒>&item=<条目>`：录像定位播放、逐字稿滚动并高亮、条目卡片闪一下。
现在字级时间按段内均匀分布；接入 ASR 后换成字级时间戳即可。

## 目录

| 路径 | 内容 |
|---|---|
| `src/data/` | `model.ts` 人、项目、类型；`meetings.ts` 五场会；`run.ts` 双 11 的编排剧本；`derive.ts` 溯源和简报推导；`extras.ts` 地点、文件、阅读回执 |
| `src/lib/` | `store.ts` 跨页面状态（分发、确认、回流）；`router.ts` hash 路由；`useClock.ts` 演示时钟 |
| `src/components/player/` | 模拟录像、进度条、逐字稿 |
| `src/components/dispatch/` | 编排时间轴、账本流向图 |
| `src/components/sketch/` | 手绘矩阵、便利贴、简报纸（rough.js + 霞鹜文楷 + Koboyo 图标） |
| `src/components/meeting/` | 成员简报 |
| `scripts/transparent_logo.py` | 白底 Logo 转透明底，输出到 `src/assets/brand/`，侧栏自动换上 |

## 品牌 Logo

```bash
python -I scripts/transparent_logo.py <白底 logo 图片>
```

生成 `src/assets/brand/logo.png`（横版）和 `logo-mark.png`（图标，侧栏收起时用），侧栏会自动使用；没有这两个文件时显示内置的 M 标。

## 第三方素材

- 手绘图标：[Koboyo Icons](https://koboyo.com/icons)（Original），免费商用、无需署名；不得把图标库本身单独再分发。
- 模型图标：Lobe Icons（MIT），见 `src/assets/models/SOURCE.md`。
- 字体：Inter、JetBrains Mono（fontsource），霞鹜文楷（OFL）。
- UI：shadcn/ui 组件（Radix + Tailwind v4），motion、morphicons、rough.js、cmdk。
