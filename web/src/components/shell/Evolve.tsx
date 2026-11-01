// 自进化：顶栏右上角一枚“自进化中”小胶囊，右边一块点阵一直在流动；鼠标移上去（或点一下钉住）展开完整的每日自进化面板：
// 新会议和资料切块入库，回流的确认、退回、追问反过来改写关注档案和路由规则。
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, Pause, Play, Repeat2, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Kb } from '@/components/common/bits'
import { DotLoader, easeOut, hash, square, useDotCanvas } from '@/components/common/DotMatrix'
import { L } from '@/lib/i18n'

// ---------------- 每日自进化（RSI）：新资料切块入库 + 回流改写档案和规则 ----------------

// 簇的颜色用在深色屏上，取亮一档
type Cluster = { name: string; x: number; y: number; color: string }
const CLUSTERS: Cluster[] = [
  { name: L('安全组织 · 评审', 'Safety org · reviews'), x: 0.33, y: 0.3, color: '#8B93FF' },
  { name: L('开发安全', 'Dev safety'), x: 0.8, y: 0.28, color: '#2DD4BF' },
  { name: L('车主运营', 'Owner ops'), x: 0.36, y: 0.71, color: '#F472B6' },
  { name: L('门店 · 竞品卖点', 'Stores · competitor pitch'), x: 0.8, y: 0.71, color: '#FBBF24' },
  { name: L('安全理念 · 目标', 'Safety philosophy · goal'), x: 0.58, y: 0.5, color: '#38BDF8' },
]

interface Day {
  date: string
  label: string
  sources: { kind: 'meet' | 'doc' | 'fb'; text: string }[]
  /** 新增向量块按簇分布 */
  add: number[]
  chunks: number
  hit: number
  learned: string
}

const DAYS: Day[] = L<Day[]>([
  { date: '10/27', label: '周一', sources: [{ kind: 'doc', text: '历史纪要回填 · 32 份' }], add: [4, 4, 3, 3, 2], chunks: 1180, hit: 84, learned: '冷启动：按部门和职级初始化 10 份关注档案' },
  { date: '10/28', label: '周二', sources: [{ kind: 'meet', text: '安全周会 · 9 段' }, { kind: 'doc', text: '安委会常设方案.docx' }, { kind: 'fb', text: '魏然、许诺确认待办' }], add: [5, 3, 0, 0, 1], chunks: 1226, hit: 86, learned: '编制和预算类条目默认“受限”' },
  { date: '10/29', label: '周三', sources: [{ kind: 'meet', text: '车主运营月会 · 7 段' }, { kind: 'doc', text: '评分 × 积分试点方案.docx' }, { kind: 'fb', text: '高远：交付依赖积分方案' }], add: [0, 0, 5, 1, 0], chunks: 1264, hit: 87, learned: '高远的档案新增依赖「车主积分体系」（R4）' },
  { date: '10/30', label: '周四', sources: [{ kind: 'meet', text: '门店销售周会 · 6 段' }, { kind: 'doc', text: '权益对比表 v3.xlsx' }, { kind: 'fb', text: '江晚订阅「竞品卖点」' }], add: [0, 0, 1, 5, 1], chunks: 1295, hit: 89, learned: '“权益”“表盘”归到「购车权益」话题' },
  { date: '10/31', label: '周五', sources: [{ kind: 'meet', text: '小米安全专场直播 · 92 段' }, { kind: 'doc', text: 'PDF 纪要 · 对标表 · 拆解 MD · 3 张截图' }, { kind: 'fb', text: '审核官标出 1 处绝对化表述' }], add: [6, 4, 3, 3, 4], chunks: 1459, hit: 92, learned: '外部直播模板：关掉点名规则，绝对化表述一律“待核实”' },
], [
  { date: '10/27', label: 'Mon', sources: [{ kind: 'doc', text: 'Backfilled past minutes · 32 docs' }], add: [4, 4, 3, 3, 2], chunks: 1180, hit: 84, learned: 'Cold start: seeded 10 interest profiles from department and level' },
  { date: '10/28', label: 'Tue', sources: [{ kind: 'meet', text: 'Safety weekly · 9 segments' }, { kind: 'doc', text: 'Standing committee proposal.docx' }, { kind: 'fb', text: 'Wei Ran, Xu Nuo confirmed to-dos' }], add: [5, 3, 0, 0, 1], chunks: 1226, hit: 86, learned: 'Headcount and budget items default to “Restricted”' },
  { date: '10/29', label: 'Wed', sources: [{ kind: 'meet', text: 'Owner ops monthly · 7 segments' }, { kind: 'doc', text: 'Score × points pilot plan.docx' }, { kind: 'fb', text: 'Gao Yuan: delivery depends on the points plan' }], add: [0, 0, 5, 1, 0], chunks: 1264, hit: 87, learned: 'Gao Yuan’s profile now depends on “Owner points program” (R4)' },
  { date: '10/30', label: 'Thu', sources: [{ kind: 'meet', text: 'Store sales weekly · 6 segments' }, { kind: 'doc', text: 'Perk comparison v3.xlsx' }, { kind: 'fb', text: 'Jiang Wan followed “Competitor selling points”' }], add: [0, 0, 1, 5, 1], chunks: 1295, hit: 89, learned: '“Perks” and “dash” now map to the “Purchase perks” topic' },
  { date: '10/31', label: 'Fri', sources: [{ kind: 'meet', text: 'Xiaomi safety livestream · 92 segments' }, { kind: 'doc', text: 'PDF notes · benchmark · breakdown MD · 3 stills' }, { kind: 'fb', text: 'Auditor flagged 1 absolute claim' }], add: [6, 4, 3, 3, 4], chunks: 1459, hit: 92, learned: 'External livestream template: naming rule off, absolute claims always “Unverified”' },
])

const SRC = {
  meet: { label: L('会议', 'meeting'), icon: Video, color: '#5F3E54' },
  doc: { label: L('资料', 'doc'), icon: FileText, color: '#64748B' },
  fb: { label: L('回流', 'feedback'), icon: Repeat2, color: '#059669' },
} as const

const LOOP = L(['分发', '回流', '评测打分', '改写档案', '下一场更准'], ['Dispatch', 'Feedback', 'Score', 'Rewrite profiles', 'Sharper next time'])
const FEEDBACK_TOTAL = [0, 3, 5, 8, 13]

/** 每日自进化面板：打开时停在今天；点播放从周一起把这一周重放一遍 */
export function EvolvePanel() {
  const [day, setDay] = useState(DAYS.length - 1)
  const [auto, setAuto] = useState(false)
  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setDay(d => (d + 1) % DAYS.length), 4200)
    return () => clearInterval(id)
  }, [auto])
  const d = DAYS[day]
  const prev = day ? DAYS[day - 1] : null

  return (
    <section className="flex min-w-0 flex-col">
      <div className="flex items-center gap-2.5">
        <span className="sg-raised grid size-9 flex-none place-items-center rounded-xl text-[var(--plum)]"><Kb name="brain" size={22} /></span>
        <div className="min-w-0 leading-tight">
          <h2 className="text-[16px] font-semibold">{L('每天自进化', 'Self-improving, daily')}</h2>
          <p className="text-ink-3 truncate text-[12.5px]">{L('新会议和资料入库，确认、退回、追问反过来改写档案和规则', 'New meetings and docs go in; confirms, bounces and questions rewrite profiles and rules')}</p>
        </div>
        <button className="sg-raised sg-icon-btn ml-auto size-8 flex-none" onClick={() => { if (!auto && day === DAYS.length - 1) setDay(0); setAuto(!auto) }} aria-label={auto ? L('暂停', 'Pause') : L('重放这一周', 'Replay the week')} title={auto ? L('暂停', 'Pause') : L('重放这一周', 'Replay the week')}>{auto ? <Pause size={14} /> : <Play size={14} />}</button>
      </div>

      <div className="sg-well mt-3.5 grid grid-cols-5 gap-1 rounded-2xl p-1">
        {DAYS.map((x, i) => (
          <button key={x.date} onClick={() => { setDay(i); setAuto(false) }} className={cn('relative overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition-colors', i === day ? 'text-white' : 'hover:bg-white/60', i > day && 'text-ink-4')}>
            {i === day && <motion.span layoutId="evolve-day" className="sg-onyx absolute inset-0 rounded-xl" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <b className="relative block font-mono text-[12.5px] leading-tight">{x.date}</b>
            <span className={cn('relative text-[11px]', i === day ? 'text-white/60' : 'text-ink-3')}>{x.label}</span>
            {i === day && auto && <motion.i key={day} className="absolute inset-x-2.5 bottom-1 h-[2px] origin-left rounded-full bg-[#E9B8DA]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 4.2, ease: 'linear' }} />}
          </button>
        ))}
      </div>

      <div className="mt-3.5">
        <div className="text-ink-3 mb-2 flex items-center gap-2 text-[12px]">{L(`${d.date} 喂进来的`, `Fed in on ${d.date}`)}<span className="h-px flex-1 bg-[rgb(95_62_84/10%)]" /></div>
        <div className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {d.sources.map((s, i) => {
              const k = SRC[s.kind]
              return (
                <motion.div key={d.date + i} layout className="flex items-center gap-2.5 text-[13px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.08 }}>
                  <span className="sg-raised grid size-6 flex-none place-items-center rounded-lg" style={{ color: k.color }}><k.icon size={12} strokeWidth={2.2} /></span>
                  <span className="min-w-0 flex-1 truncate">{s.text}</span>
                  <span className="text-ink-4 flex-none font-mono text-[10.5px]">{k.label}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <VectorField day={day} />

      <div className="glass-metrics mt-3.5 grid grid-cols-3 gap-2">
        <Metric label={L('向量块', 'Vector chunks')} value={d.chunks.toLocaleString()} delta={prev ? `+${d.chunks - prev.chunks}` : ''} />
        <Metric label={L('路由命中率', 'Routing hit rate')} value={`${d.hit}%`} delta={prev ? `+${d.hit - prev.hit}` : ''} bar={d.hit} />
        <Metric label={L('本周回流', 'Feedback this week')} value={L(`${FEEDBACK_TOTAL[day]} 条`, `${FEEDBACK_TOTAL[day]}`)} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={d.date} className="sg-card mt-3 flex items-start gap-2.5 rounded-2xl px-3 py-2.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <span className="sg-onyx mt-px inline-flex flex-none items-center gap-1 rounded-full px-2 text-[11px] leading-[20px]"><Kb name="lightbulb" size={11} />{L('学到', 'Learned')}</span>
          <span className="text-[13.5px] leading-snug">{d.learned}</span>
        </motion.div>
      </AnimatePresence>

      <ol className="sg-well mt-3 flex flex-wrap items-center gap-0.5 self-start rounded-full p-1 text-[11.5px]">
        {LOOP.map((s, i) => (
          <li key={s} className="flex items-center gap-0.5">
            <span className={cn('rounded-full px-2 py-0.5', i === LOOP.length - 1 ? 'sg-onyx font-medium' : 'text-ink-2')}>{s}</span>
            {i < LOOP.length - 1 && <span className="text-ink-4">›</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------- 向量空间：深色点阵屏 ----------------
// 每个块落在一格上：从簇中心往外按距离（加一点抖动）排队，先入库的占中间。
// 当天的新块从左边的入口列飞进来，落位时闪一下，周围的格子跟着染上簇的颜色。

const COLS = 64, ROWS = 24
const FIELD = (() => {
  const order = CLUSTERS.map((c, ci) => {
    const cx = c.x * COLS, cy = c.y * ROWS
    const list: { x: number; y: number; k: number }[] = []
    for (let y = 0; y < ROWS; y++) for (let x = 4; x < COLS; x++) {
      const dd = Math.hypot(x - cx, y - cy)
      if (dd < 6) list.push({ x, y, k: dd + hash(ci * 1000 + y * COLS + x) * 2.2 })
    }
    return list.sort((a, b) => a.k - b.k)
  })
  const taken = new Set<number>()
  const next = CLUSTERS.map(() => 0)
  let i = 0
  return DAYS.flatMap((dd, di) => dd.add.flatMap((n, ci) => Array.from({ length: n }, () => {
    let cell = order[ci][next[ci]++]
    while (taken.has(cell.y * COLS + cell.x)) cell = order[ci][next[ci]++]
    taken.add(cell.y * COLS + cell.x)
    return { i: i++, day: di, ci, x: cell.x, y: cell.y }
  })))
})()
const KERNEL = Array.from({ length: 21 }, (_, d2) => Math.exp(-d2 / 4.5))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const FLY = 1.05

function VectorField({ day }: { day: number }) {
  const fresh = FIELD.filter(p => p.day === day).length
  const ref = useDotCanvas((ctx, t, w, h) => {
    const p = Math.min(w / COLS, h / ROWS), s = p * 0.68
    const ox = (w - p * COLS) / 2, oy = (h - p * ROWS) / 2
    const at = (x: number, y: number, size = s) => square(ctx, ox + x * p + (p - size) / 2, oy + y * p + (p - size) / 2, size)

    // 底：每一格一个很淡的方点
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.05
    ctx.beginPath()
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) at(x, y)
    ctx.fill()

    // 入场：一道竖光从左扫到右
    if (t < 1.5) {
      const bx = (t / 1.5) * (COLS + 8) - 4
      for (let x = Math.max(0, Math.floor(bx - 2)); x <= Math.min(COLS - 1, Math.ceil(bx + 2)); x++) {
        ctx.globalAlpha = 0.14 * clamp01(1 - Math.abs(x - bx) / 2)
        ctx.beginPath()
        for (let y = 0; y < ROWS; y++) at(x, y)
        ctx.fill()
      }
    }

    const pts = FIELD.filter(q => q.day <= day).map(q => {
      if (q.day < day) return { q, k: 1, since: 99 }
      const delay = 0.35 + hash(q.i + 0.1) * 1.1
      return { q, k: clamp01((t - delay) / FLY), since: t - delay - FLY }
    })

    // 入口列：还有块在飞时，一道光往下流
    const busy = pts.some(x => x.k < 1)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < 2; x++) {
      ctx.globalAlpha = busy ? 0.08 + 0.55 * Math.max(0, Math.sin(t * 7 - y * 0.55 - x)) ** 6 : 0.08
      ctx.beginPath()
      at(x, y)
      ctx.fill()
    }

    // 簇的晕：落位的块把周围的格子染上颜色
    const halo = CLUSTERS.map(() => new Float32Array(COLS * ROWS))
    for (const { q, k, since } of pts) {
      if (k < 1) continue
      const wgt = easeOut(clamp01(since / 0.6))
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d2 = dx * dx + dy * dy, x = q.x + dx, y = q.y + dy
        if (d2 > 20 || x < 0 || y < 0 || x >= COLS || y >= ROWS) continue
        halo[q.ci][y * COLS + x] += KERNEL[d2] * wgt
      }
    }
    for (let idx = 0; idx < COLS * ROWS; idx++) {
      let best = 0, bc = -1
      for (let ci = 0; ci < CLUSTERS.length; ci++) if (halo[ci][idx] > best) { best = halo[ci][idx]; bc = ci }
      if (best < 0.06) continue
      ctx.globalAlpha = Math.min(0.34, best * 0.14)
      ctx.fillStyle = CLUSTERS[bc].color
      ctx.beginPath()
      at(idx % COLS, Math.floor(idx / COLS))
      ctx.fill()
    }

    // 块本身：已落位的亮着轻轻呼吸；刚落位的闪白；在飞的拖一条尾巴
    for (const { q, k, since } of pts) {
      const c = CLUSTERS[q.ci].color
      if (k >= 1) {
        const flash = clamp01(1 - since / 0.7)
        ctx.fillStyle = c
        if (flash > 0) {
          ctx.globalAlpha = 0.3 * flash
          ctx.beginPath(); at(q.x, q.y, s * 2.6); ctx.fill()
        }
        ctx.globalAlpha = 0.82 + 0.18 * Math.sin(t * 2.2 + q.i)
        ctx.beginPath(); at(q.x, q.y); ctx.fill()
        if (flash > 0) {
          ctx.fillStyle = '#fff'
          ctx.globalAlpha = 0.85 * flash
          ctx.beginPath(); at(q.x, q.y); ctx.fill()
        }
        continue
      }
      if (k <= 0) continue
      const sx = 0.5, sy = ROWS * (0.2 + hash(q.i + 0.3) * 0.6), bend = (hash(q.i + 0.7) - 0.5) * 7
      const pos = (kk: number) => { const e = easeOut(kk); return [sx + (q.x - sx) * e, sy + (q.y - sy) * e + Math.sin(e * Math.PI) * bend] }
      ctx.fillStyle = c
      for (let j = 5; j >= 1; j--) {
        const [x, y] = pos(Math.max(0, k - j * 0.035))
        ctx.globalAlpha = (1 - j / 6) * 0.5
        ctx.beginPath(); at(x, y, s * (1 - j * 0.1)); ctx.fill()
      }
      const [x, y] = pos(k)
      ctx.fillStyle = '#fff'
      ctx.globalAlpha = 0.95
      ctx.beginPath(); at(x, y); ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [day])

  return (
    <div className="vx-screen sg-dark mt-3.5 p-2.5">
      <div className="relative" style={{ aspectRatio: `${COLS} / ${ROWS}` }}>
        <canvas ref={ref} className="absolute inset-0 size-full" aria-label={L(`知识库向量空间，${CLUSTERS.length} 个话题簇`, `Knowledge base vector space, ${CLUSTERS.length} topic clusters`)} role="img" />
        {CLUSTERS.map(c => (
          <span key={c.name} className="vx-label" style={{ left: `${c.x * 100}%`, top: `${((c.y * ROWS + 4.2) / ROWS) * 100}%`, '--c': c.color } as CSSProperties}><i />{c.name}</span>
        ))}
      </div>
      <span className="absolute top-2.5 left-3 flex items-center gap-2 rounded-md bg-black/45 px-2 py-1 font-mono text-[10.5px] text-white/60 backdrop-blur-sm">
        <DotLoader cols={3} rows={2} dot={2} gap={1} className="text-white/70" />
        {L('向量空间', 'Vector space')}{fresh ? L(` · 今天 +${fresh} 块`, ` · +${fresh} today`) : ''}
      </span>
    </div>
  )
}

function Metric({ label, value, delta, bar }: { label: string; value: string; delta?: string; bar?: number }) {
  return (
    <div className="rounded-xl bg-[#F7F8FB] px-3 py-2">
      <div className="text-ink-3 text-[11.5px]">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <motion.b key={value} className="text-[20px] font-semibold tabular-nums" initial={{ y: -6, opacity: 0.3 }} animate={{ y: 0, opacity: 1 }}>{value}</motion.b>
        {delta && <span className="text-[11.5px] text-emerald-600">{delta}</span>}
      </div>
      {bar != null && <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/[.07]"><motion.div className="h-full rounded-full bg-[#4F46E5]" animate={{ width: `${bar}%` }} transition={{ duration: 0.8 }} /></div>}
    </div>
  )
}

// ---------------- 顶栏：自进化中 ----------------

const LILAC = '#BBA3D6'

/**
 * 胶囊右半边的点阵：越往右越密（像图标后面铺开的一块屏），每格按自己的节奏明暗，一直在“重绘”；
 * 一道光从左往右扫，几颗亮点沿着行流进来，偶尔有格子闪一下话题簇的颜色 —— 新块落位。
 */
function EvoPixels() {
  const ref = useDotCanvas((ctx, t, w, h) => {
    const pitch = 5, s = 3.6
    const cols = Math.floor(w / pitch), rows = Math.floor(h / pitch)
    const ox = w - cols * pitch + (pitch - s) / 2, oy = (h - rows * pitch) / 2 + (pitch - s) / 2
    const at = (x: number, y: number) => { ctx.beginPath(); square(ctx, ox + x * pitch, oy + y * pitch, s); ctx.fill() }
    const band = ((t * 6) % (cols + 16)) - 8
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const u = x / (cols - 1), r = hash(x * 37 + y * 11 + 3)
      if (r > 0.06 + 0.94 * u ** 1.35) continue
      const tw = 0.5 + 0.5 * Math.sin(t * (1.1 + r * 2.6) + r * 40)
      const glow = Math.max(0, 1 - Math.abs(x - band) / 2.4)
      const ph = t * 0.55 + r * 9, cyc = Math.floor(ph)
      const pop = u > 0.3 && hash(cyc * 13 + x * 3 + y * 7) > 0.9 ? Math.sin((ph - cyc) * Math.PI) : 0
      ctx.fillStyle = LILAC
      ctx.globalAlpha = (0.16 + 0.62 * u) * (0.55 + 0.45 * tw) + glow * 0.4
      at(x, y)
      if (pop > 0.05) {
        ctx.fillStyle = CLUSTERS[Math.floor(hash(cyc + x * 5 + y) * CLUSTERS.length)].color
        ctx.globalAlpha = pop
        at(x, y)
      }
    }
    for (let k = 0; k < 3; k++) {
      const ph = t / 2.4 + k / 3, cyc = Math.floor(ph), p = ph - cyc
      const y = Math.floor(hash(cyc * 7 + k * 31) * rows), head = Math.round(p * (cols + 4) - 4)
      for (let j = 0; j < 4; j++) {
        const x = head - j
        if (x < 0 || x >= cols) continue
        ctx.fillStyle = j ? LILAC : '#fff'
        ctx.globalAlpha = (1 - j / 4) * 0.95 * Math.min(1, (1 - p) * 6)
        at(x, y)
      }
    }
    ctx.globalAlpha = 1
  }, [])
  return <canvas ref={ref} aria-hidden className="evo-pixels" />
}

/** 顶栏右上角：自进化中。鼠标移上去预览，点一下钉住，Esc 或点别处收起 */
export function EvolvePill() {
  const [open, setOpen] = useState(false)
  const pinned = useRef(false)
  const timer = useRef(0)
  const wrap = useRef<HTMLDivElement>(null)
  const later = (v: boolean, ms: number) => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(v), ms) }
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!open) return
    const close = () => { pinned.current = false; setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) close() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open])

  return (
    <div
      ref={wrap}
      className="relative"
      onPointerEnter={e => { if (e.pointerType === 'mouse') later(true, 90) }}
      onPointerLeave={e => { if (e.pointerType === 'mouse' && !pinned.current) later(false, 220) }}
    >
      <button
        className="evo-pill"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={L('知识库每天自进化', 'The knowledge base improves itself every day')}
        onClick={() => {
          clearTimeout(timer.current)
          if (open && pinned.current) { pinned.current = false; setOpen(false) } else { pinned.current = true; setOpen(true) }
        }}
      >
        <EvoPixels />
        <span className="evo-pill-label">{L('自进化中', 'Self-improving')}</span>
        <span className="evo-pill-icon"><Kb name="brain" size={19} /></span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={L('每天自进化', 'Self-improving, daily')}
            className="evo-pop pc-sheet absolute top-[calc(100%+10px)] right-0 z-40 w-[540px] max-w-[calc(100vw-40px)] origin-top-right rounded-[24px] p-4"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <EvolvePanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
