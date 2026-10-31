import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, animate } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Pause, Play } from 'lucide'
import {
  ArrowUpRight, BarChart3, Circle, Code2, Hand, Image, LayoutGrid, Lock, Maximize, Menu, Minus, MousePointer2,
  Pencil, Plus, Presentation, Redo2, RotateCcw, Shapes, Smile, Sparkles, Square, Type, Undo2, X,
} from 'lucide-react'
import { parseTranscript } from '@web/lib/transcript'
import {
  AGENTS, DEFAULT_TEXT, DEFAULT_TITLE, ITEMS, ITEM_TYPES, QUIET_AT, REASONS, ROUTES, T_END,
  agentSeg, agentState, briefOf, countOf, isQuiet, itemById, itemState, PEOPLE_SORTED, personById,
  quoteAt, readyAt, routesAt,
  type AgentId, type Item, type PersonId,
} from '@/shared/script'
import { useDemo } from '@/shared/useDemo'
import { Kb } from '@/shared/Koboyo'
import type { KoboyoName } from '@/shared/koboyoData'
import { Rough, RoughArrow } from './rough'

const W = 1720
const H = 1060
const INK = '#1E1E1E'

export function App() {
  const demo = useDemo({ startDelay: 500 })
  const { t, clock, running, done } = demo
  const [open, setOpen] = useState<PersonId | null>(null)
  const view = useView()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (!running && e.altKey && e.key.toLowerCase() === 's') demo.start()
      if (e.key === ' ' && running) {
        e.preventDefault()
        clock.toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, clock, demo])

  return (
    <div className="sk">
      <motion.div className="sk-view" ref={view.ref} style={{ backgroundPosition: view.bgPos, backgroundSize: view.bgSize }}>
        <motion.div className="sk-pan" drag dragMomentum={false} style={{ x: view.x, y: view.y }}>
          <div className="sk-world" style={{ width: W, height: H, transform: `scale(${view.zoom})` }}>
            {running && <Board t={t} done={done} onOpen={setOpen} />}
          </div>
        </motion.div>
        <AnimatePresence>{!running && <Empty onStart={demo.start} />}</AnimatePresence>
      </motion.div>

      <Chrome demo={demo} view={view} />
      <AnimatePresence>{open && <BriefPaper id={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

// ---------------- 视口：拖动、缩放 ----------------

function useView() {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [zoom, setZoom] = useState(0.8)
  const bgSize = useMotionTemplate`${22 * zoom}px ${22 * zoom}px`
  const bgPos = useMotionTemplate`${x}px ${y}px`
  const fit = (smooth = false) => {
    const el = ref.current
    if (!el) return
    const vw = el.clientWidth
    const vh = el.clientHeight
    const z = Math.min((vw - 150) / W, (vh - 110) / H)
    const tx = (vw - W * z) / 2 + 20
    const ty = (vh - H * z) / 2 + 12
    setZoom(z)
    if (smooth) {
      animate(x, tx, { type: 'spring', stiffness: 200, damping: 30 })
      animate(y, ty, { type: 'spring', stiffness: 200, damping: 30 })
    } else {
      x.set(tx)
      y.set(ty)
    }
  }
  useLayoutEffect(() => {
    fit()
    const onResize = () => fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const zoomBy = (k: number) => {
    const el = ref.current
    if (!el) return
    const next = Math.max(0.35, Math.min(1.8, zoom * k))
    const cx = el.clientWidth / 2
    const cy = el.clientHeight / 2
    x.set(cx - ((cx - x.get()) * next) / zoom)
    y.set(cy - ((cy - y.get()) * next) / zoom)
    setZoom(next)
  }
  return { ref, x, y, zoom, bgSize, bgPos, fit, zoomBy }
}

// ---------------- 外框：工具栏（参考 Koboyo 画布） ----------------

function Chrome({ demo, view }: { demo: ReturnType<typeof useDemo>; view: ReturnType<typeof useView> }) {
  const { clock, running, done } = demo
  const tools = [MousePointer2, Hand, null, Square, Circle, Shapes, ArrowUpRight, null, Type, Pencil, null, Image, Smile, BarChart3, null, LayoutGrid, Lock]
  return (
    <>
      <div className="sk-tl">
        <button className="sk-ib sk-float" aria-label="菜单"><Menu size={16} /></button>
        <div className="sk-float sk-doc">
          <span className="sk-logo" aria-hidden><svg viewBox="0 0 24 24" width="13" height="13"><path d="M4 7.5h9M4 12h13M4 16.5h7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="19" cy="7.5" r="1.9" fill="#fff" /><circle cx="15.5" cy="16.5" r="1.9" fill="#fff" /></svg></span>
          会映 · {DEFAULT_TITLE}
          <em>演示</em>
        </div>
      </div>

      <nav className="sk-rail sk-float" aria-label="工具">
        {tools.map((I, i) => I ? (
          <button key={i} className={`sk-ib ${i === 0 ? 'on' : ''}`} aria-label="工具"><I size={16} strokeWidth={1.6} /></button>
        ) : <i key={i} className="sk-rail-sep" />)}
      </nav>

      <div className="sk-tr sk-float">
        <button className="sk-ib" title="AI 生成"><Sparkles size={16} strokeWidth={1.6} /></button>
        <button className="sk-ib" title="导出成幻灯片"><Presentation size={16} strokeWidth={1.6} /></button>
        <button className="sk-ib" title="导出数据"><Code2 size={16} strokeWidth={1.6} /></button>
      </div>

      <AnimatePresence>
        {running && (
          <motion.div className="sk-play sk-float" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}>
            <button className="sk-ib dark" onClick={clock.toggle} aria-label={clock.playing ? '暂停' : '播放'}><MorphIcon icon={clock.playing ? Pause : Play} size={15} strokeWidth={2.2} /></button>
            <span className="sk-time">{clock.t.toFixed(1)}s</span>
            <span className="sk-bar"><i style={{ width: `${(clock.t / T_END) * 100}%` }} /></span>
            <button className={`sk-chip ${clock.speed === 2 ? 'on' : ''}`} onClick={() => clock.setSpeed(clock.speed === 2 ? 1 : 2)}>{clock.speed}×</button>
            <button className="sk-ib" onClick={clock.restart} aria-label="重放"><RotateCcw size={15} strokeWidth={1.8} /></button>
            <span className="sk-sep" />
            <button className="sk-chip" onClick={demo.reset}>{done ? '新会议' : '清空画布'}</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sk-bl">
        <div className="sk-float sk-zoom">
          <button className="sk-ib" onClick={() => view.zoomBy(1 / 1.15)} aria-label="缩小"><Minus size={15} /></button>
          <span>{Math.round(view.zoom * 100)}%</span>
          <button className="sk-ib" onClick={() => view.zoomBy(1.15)} aria-label="放大"><Plus size={15} /></button>
          <button className="sk-ib" onClick={() => view.fit(true)} aria-label="适应屏幕"><Maximize size={14} /></button>
        </div>
        <div className="sk-float sk-zoom">
          <button className="sk-ib" aria-label="撤销"><Undo2 size={15} strokeWidth={1.6} /></button>
          <button className="sk-ib" aria-label="重做"><Redo2 size={15} strokeWidth={1.6} /></button>
        </div>
      </div>
    </>
  )
}

// ---------------- 空画布（输入页） ----------------

function Empty({ onStart }: { onStart: () => void }) {
  return (
    <motion.div className="sk-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3 } }}>
      <motion.div className="sk-empty-mark" initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}>
        <Kb name="meeting" size={46} />
      </motion.div>
      <p className="sk-empty-title">把一场会拖到画布上</p>
      <p className="sk-empty-sub">或者用 <kbd>M</kbd> 示例会议 <kbd>V</kbd> 粘贴文本 <kbd>/</kbd> 全部工具</p>
      <div className="sk-empty-btns">
        <button className="go" onClick={onStart}><Sparkles size={15} /> 用示例会议开始 <kbd>Alt+S</kbd></button>
        <button><Kb name="megaphone" size={16} /> 上传录音</button>
        <button><Kb name="document" size={14} /> 粘贴文本</button>
      </div>

      <Hint className="h1" text="工具都在这里" d="M150 18 C 100 10, 50 20, 14 52" head={[14, 52, Math.PI * 0.72]} />
      <Hint className="h2" text="从示例会议开始" d="M100 66 C 70 62, 48 40, 44 8" head={[44, 8, -Math.PI * 0.55]} />
      <Hint className="h3" text="缩放 / 复位" d="M60 10 C 40 20, 20 40, 14 70" head={[14, 70, Math.PI * 0.55]} />
      <Hint className="h4" text="AI 生成和导出" d="M10 60 C 60 56, 110 40, 150 10" head={[150, 10, -Math.PI * 0.2]} />
    </motion.div>
  )
}

function Hint({ className, text, d, head }: { className: string; text: string; d: string; head: [number, number, number] }) {
  return (
    <div className={`sk-hint ${className}`}>
      <svg width="170" height="90" viewBox="0 0 170 90" fill="none"><RoughArrow d={d} head={head} opts={{ stroke: '#9A9A9A', strokeWidth: 1.4 }} draw={0.8} delay={0.5} /></svg>
      <span>{text}</span>
    </div>
  )
}

// ---------------- 画板内容 ----------------

const BOX_W = 136
const BOX_H = 104
const POS: Record<AgentId, { x: number; y: number }> = {
  orc: { x: 640, y: 112 },
  scribe: { x: 452, y: 252 }, topic: { x: 624, y: 252 }, ext: { x: 796, y: 252 }, aud: { x: 968, y: 252 },
  router: { x: 968, y: 452 }, editor: { x: 796, y: 452 }, disp: { x: 624, y: 452 },
}
const ICON: Record<AgentId, KoboyoName> = {
  orc: 'compass', scribe: 'quill', topic: 'signpost', ext: 'magnifyingGlass',
  aud: 'stamp', router: 'route', editor: 'pencil', disp: 'paperPlane',
}

/** 智能体之间的手绘箭头，at 秒时画出来 */
const ARROWS: { at: number; d: string; head: [number, number, number]; color?: string; label?: string; lx?: number; ly?: number }[] = [
  { at: 0.8, d: 'M672,184 C 600,200 540,215 522,248', head: [522, 248, Math.PI * 0.62] },
  { at: 2.7, d: 'M590,304 C 600,300 610,302 620,304', head: [620, 304, 0] },
  { at: 4.4, d: 'M762,304 C 772,300 782,302 792,304', head: [792, 304, 0] },
  { at: 5.4, d: 'M934,288 C 944,282 954,284 964,288', head: [964, 288, 0] },
  { at: 7.7, d: 'M964,324 C 954,330 944,330 934,324', head: [934, 324, Math.PI], color: '#E03131' },
  { at: 9.7, d: 'M1040,248 C 1040,190 960,160 864,152', head: [864, 152, Math.PI * 1.04] },
  { at: 10.3, d: 'M858,170 C 1100,190 1140,380 1076,448', head: [1076, 448, Math.PI * 0.7] },
  { at: 14.4, d: 'M964,504 C 954,500 944,502 934,504', head: [934, 504, Math.PI] },
  { at: 18.45, d: 'M792,504 C 782,500 772,502 762,504', head: [762, 504, Math.PI] },
  { at: 19.1, d: 'M690,560 C 686,640 640,700 600,770', head: [600, 770, Math.PI * 0.66] },
]

function Board({ t, done, onOpen }: { t: number; done: boolean; onOpen: (id: PersonId) => void }) {
  return (
    <>
      <svg className="sk-svg" width={W} height={H}>
        <Rough shape={{ kind: 'line', x1: 44, y1: 82, x2: 380, y2: 84 }} opts={{ stroke: INK, strokeWidth: 2.2 }} draw={0.6} />
        {ARROWS.filter(a => t >= a.at).map(a => (
          <RoughArrow key={a.at} d={a.d} head={a.head} opts={{ stroke: a.color ?? INK, strokeWidth: 1.8 }} draw={0.45} />
        ))}
      </svg>

      <div className="sk-title">
        <h1>{DEFAULT_TITLE}</h1>
        <p>会后按人分发 · 8 个智能体 · 20 秒</p>
      </div>

      <Transcript t={t} />
      <Agents t={t} />
      <Matrix t={t} />
      <Notes t={t} onOpen={onOpen} />

      <Note show={t >= 7.25} x={810} y={378} color="#E03131" rotate={-2}>原话对不上转写 → 打回重抽！</Note>
      <Note show={t >= 0.8 && t < 2.7} x={470} y={196} color="#7048E8" rotate={-3}>先派场记去听写</Note>
      <Note show={done} x={430} y={42} color="#2F9E44" rotate={-1.5} big>✓ 8 个相关人，7 份不同的简报，1 人没被打扰</Note>
      {done && (
        <svg className="sk-svg" width={W} height={H} style={{ pointerEvents: 'none' }}>
          <Rough shape={{ kind: 'ellipse', x: 690, y: 56, w: 560, h: 64 }} opts={{ stroke: '#2F9E44', strokeWidth: 2, roughness: 1.8 }} draw={0.7} delay={0.2} />
        </svg>
      )}
    </>
  )
}

function Note({ show, x, y, color, rotate = 0, big, children }: { show: boolean; x: number; y: number; color: string; rotate?: number; big?: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`sk-note ${big ? 'big' : ''}`}
          style={{ left: x, top: y, color, rotate }}
          initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 左：会议记录
const TX = 40
const TY = 112
const TW = 370
const TH = 640

function Transcript({ t }: { t: number }) {
  const segs = useMemo(() => parseTranscript(DEFAULT_TEXT), [])
  const items = ITEMS.filter(i => itemState(i, t) !== 'hidden' && quoteAt(i, t) === i.quote)
  return (
    <>
      <svg className="sk-svg" width={W} height={H}>
        <Rough shape={{ kind: 'rect', x: TX, y: TY, w: TW, h: TH }} opts={{ stroke: INK, fill: '#FFFDF4', fillStyle: 'solid', strokeWidth: 1.8 }} draw={0.7} />
      </svg>
      <div className="sk-tx" style={{ left: TX + 18, top: TY + 14, width: TW - 36, height: TH - 28 }}>
        <div className="sk-tx-head"><Kb name="notebook" size={24} /> 会议记录 <small>11 段 · 00:58</small></div>
        {segs.map((s, i) => {
          const lit = t >= 0.95 + i * 0.15
          return (
            <p key={s.id} className={lit ? 'lit' : ''}>
              <b>{s.speaker}</b>{mark(s.text, items)}
            </p>
          )
        })}
      </div>
    </>
  )
}

function mark(text: string, items: Item[]) {
  const hits = items.map(it => ({ it, at: text.indexOf(it.quote) })).filter(h => h.at >= 0).sort((a, b) => a.at - b.at)
  const out: ReactNode[] = []
  let cur = 0
  for (const { it, at } of hits) {
    if (at < cur) continue
    out.push(text.slice(cur, at))
    out.push(
      <motion.span key={it.id} className="sk-hl" style={{ '--c': ITEM_TYPES[it.type].color } as CSSProperties}
        initial={{ backgroundSize: '0% 100%' }} animate={{ backgroundSize: '100% 100%' }} transition={{ duration: 0.5 }}>
        {it.quote}
      </motion.span>,
    )
    cur = at + it.quote.length
  }
  out.push(text.slice(cur))
  return out
}

// 中：智能体
function Agents({ t }: { t: number }) {
  const boil = Math.floor(t * 5)
  return (
    <>
      <svg className="sk-svg" width={W} height={H}>
        {AGENTS.map((a, i) => {
          const st = agentState(a.id, t)
          const p = POS[a.id]
          const isOrc = a.id === 'orc'
          const w = isOrc ? 220 : BOX_W
          const h = isOrc ? 72 : BOX_H
          const active = st === 'busy' || st === 'fail'
          const color = st === 'fail' ? '#E03131' : a.color
          const opts = {
            stroke: st === 'idle' ? '#B8B8B8' : INK,
            strokeWidth: active ? 2.2 : 1.6,
            fill: st === 'idle' ? undefined : active ? color : `${a.color}22`,
            fillStyle: active ? 'hachure' : 'solid',
            hachureGap: 7,
            fillWeight: 1.2,
            seed: active ? boil * 13 + i : i + 1,
          }
          return (
            <g key={a.id}>
              <Rough shape={isOrc ? { kind: 'ellipse', x: p.x + w / 2, y: p.y + h / 2, w, h } : { kind: 'rect', x: p.x, y: p.y, w, h }} opts={opts} draw={0} />
              {st === 'done' && !isOrc && (
                <Rough shape={{ kind: 'path', d: `M${p.x + w - 30},${p.y + 18} l7,8 l14,-16` }} opts={{ stroke: '#2F9E44', strokeWidth: 2.6, roughness: 0.6 }} draw={0.3} />
              )}
              {st === 'fail' && (
                <Rough shape={{ kind: 'ellipse', x: p.x + w / 2, y: p.y + h / 2, w: w + 34, h: h + 30 }} opts={{ stroke: '#E03131', strokeWidth: 2.4, roughness: 2 }} draw={0.35} />
              )}
            </g>
          )
        })}
      </svg>
      {AGENTS.map(a => {
        const st = agentState(a.id, t)
        const p = POS[a.id]
        const isOrc = a.id === 'orc'
        const seg = agentSeg(a.id, t)
        return (
          <div key={a.id} className={`sk-agent ${st} ${isOrc ? 'orc' : ''}`} style={{ left: p.x, top: p.y, width: isOrc ? 220 : BOX_W, height: isOrc ? 72 : BOX_H, '--c': a.color } as CSSProperties}>
            <span className="sk-agent-ic"><Kb name={ICON[a.id]} size={isOrc ? 26 : 34} /></span>
            <b>{a.name}</b>
            {!isOrc && <small>{seg ? seg.title : st === 'done' ? '完成' : st === 'idle' ? a.duty : '等待…'}</small>}
          </div>
        )
      })}
    </>
  )
}

// 右：路由矩阵
const MX = 1130
const MY = 112
const LBL = 196
const COL = 46
const ROW = 44
const HEAD = 70
const cx = (j: number) => MX + LBL + j * COL + COL / 2
const ry = (i: number) => MY + HEAD + i * ROW + ROW / 2

function Matrix({ t }: { t: number }) {
  const routes = routesAt(t)
  const routing = t >= 10.3
  const people = PEOPLE_SORTED
  const quietCol = people.findIndex(p => isQuiet(p.id))
  const zy = people.findIndex(p => p.id === 'zhaoyi')
  return (
    <>
      <svg className="sk-svg" width={W} height={H}>
        {t >= 3 && (
          <g>
            {Array.from({ length: ITEMS.length + 1 }, (_, i) => (
              <Rough key={'h' + i} shape={{ kind: 'line', x1: MX, y1: MY + HEAD + i * ROW, x2: MX + LBL + people.length * COL, y2: MY + HEAD + i * ROW }} opts={{ stroke: '#CFCFCA', strokeWidth: 1, roughness: 0.8 }} draw={0.5} delay={i * 0.03} />
            ))}
            {Array.from({ length: people.length + 1 }, (_, j) => (
              <Rough key={'v' + j} shape={{ kind: 'line', x1: MX + LBL + j * COL, y1: MY + HEAD - 8, x2: MX + LBL + j * COL, y2: MY + HEAD + ITEMS.length * ROW }} opts={{ stroke: '#CFCFCA', strokeWidth: 1, roughness: 0.8 }} draw={0.5} delay={0.3 + j * 0.03} />
            ))}
          </g>
        )}
        {routing && people.map((p, j) => (
          <Rough key={p.id} shape={{ kind: 'ellipse', x: cx(j), y: MY + HEAD - 28, w: 34, h: 34 }} opts={{ stroke: INK, fill: isQuiet(p.id) && t >= QUIET_AT ? '#EEEEEA' : p.bg, fillStyle: 'solid', strokeWidth: 1.4 }} draw={0.3} delay={j * 0.05} />
        ))}
        {routing && people[0].host && ITEMS.map((it, i) => (
          <Rough key={'host' + it.id} shape={{ kind: 'ellipse', x: cx(0), y: ry(i), w: 7, h: 7 }} opts={{ stroke: '#9A9A9A', fill: '#9A9A9A', fillStyle: 'solid', roughness: 0.4 }} draw={0.2} delay={i * 0.02} />
        ))}
        {routes.map(r => {
          const i = ITEMS.findIndex(x => x.id === r.item)
          const j = people.findIndex(p => p.id === r.person)
          const r4 = r.reasons.includes('R4')
          const x0 = cx(j) - 9
          const y0 = ry(i)
          return (
            <g key={r.item + r.person}>
              <Rough shape={{ kind: 'path', d: `M${x0},${y0} l6,7 l13,-15` }} opts={{ stroke: r4 ? '#E03131' : INK, strokeWidth: 2.2, roughness: 0.7 }} draw={0.28} />
              {r4 && <Rough shape={{ kind: 'ellipse', x: cx(j), y: y0, w: 38, h: 34 }} opts={{ stroke: '#E03131', strokeWidth: 1.8, roughness: 1.6 }} draw={0.35} delay={0.25} />}
            </g>
          )
        })}
        {t >= 12 && (
          <RoughArrow d={`M${MX + 300},${MY + HEAD + ITEMS.length * ROW + 46} C ${MX + 330},${MY + HEAD + ITEMS.length * ROW + 10} ${cx(zy) - 10},${ry(4) + 80} ${cx(zy)},${ry(4) + 22}`} head={[cx(zy), ry(4) + 22, -Math.PI / 2]} opts={{ stroke: '#E03131', strokeWidth: 1.8 }} draw={0.6} />
        )}
        {t >= QUIET_AT && (
          <RoughArrow d={`M${cx(quietCol) - 60},${MY - 2} C ${cx(quietCol) - 30},${MY - 6} ${cx(quietCol) - 4},${MY + 6} ${cx(quietCol)},${MY + HEAD - 50}`} head={[cx(quietCol), MY + HEAD - 50, Math.PI / 2]} opts={{ stroke: '#868E96', strokeWidth: 1.6 }} draw={0.5} />
        )}
      </svg>

      <div className="sk-mx-title" style={{ left: MX, top: MY - 8 }}><Kb name="route" size={26} /> 谁收到什么</div>
      {routing && people.map((p, j) => (
        <motion.span key={p.id} className="sk-mx-face" style={{ left: cx(j), top: MY + HEAD - 28, color: isQuiet(p.id) && t >= QUIET_AT ? '#ADB5BD' : p.fg }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + j * 0.05 }}>
          {p.short}
        </motion.span>
      ))}
      {ITEMS.map((it, i) => {
        const st = itemState(it, t)
        if (st === 'hidden') return null
        const c = ITEM_TYPES[it.type]
        return (
          <motion.div key={it.id} className={`sk-mx-row ${st}`} style={{ left: MX, top: ry(i) - 12, width: LBL - 10 }} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            <span style={{ color: c.color }}>{c.label}</span>
            {it.title}
            {it.sensitivity === 'restricted' && <Lock size={12} className="sk-lock" />}
          </motion.div>
        )
      })}
      <Note show={t >= 12} x={MX + 40} y={MY + HEAD + ITEMS.length * ROW + 40} color="#E03131" rotate={-1.5}>赵一没参会、没被点名，<br />但他依赖的订单接口变了</Note>
      <Note show={t >= 13.2} x={MX + 2} y={MY + HEAD + ITEMS.length * ROW + 100} color="#C2255C" rotate={1}>🔒 预算金额只有 4 个人看得到</Note>
      <AnimatePresence>
        {t >= QUIET_AT && (
          <motion.div className="sk-quiet" style={{ left: cx(quietCol) - 150, top: MY - 30 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Kb name="coffee" size={22} /> 吴桐：这场不打扰
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// 下：便利贴简报
const NOTE_COLORS = ['#FFF3B0', '#FFD8E4', '#D0EBFF', '#D3F9D8', '#E5DBFF', '#FFE8CC', '#C5F6FA', '#EDEDE8']

function Notes({ t, onOpen }: { t: number; onOpen: (id: PersonId) => void }) {
  return (
    <div className="sk-notes" style={{ left: 40, top: 790 }}>
      <div className="sk-notes-label"><Kb name="mailbox" size={24} /> 每人一份简报 {t >= 19.1 ? '· 已投递飞书' : ''}</div>
      {PEOPLE_SORTED.map((p, i) => {
        const ready = t >= readyAt(p.id)
        const quiet = isQuiet(p.id)
        return (
          <AnimatePresence key={p.id}>
            {ready ? (
              <motion.button
                className={`sk-sticky ${quiet ? 'quiet' : ''}`}
                style={{ background: NOTE_COLORS[i], left: i * 208 }}
                initial={{ opacity: 0, scale: 0.6, rotate: -12, y: 30 }}
                animate={{ opacity: 1, scale: 1, rotate: [-2.5, 1.5, -1, 2, -1.8, 1, -2.2, 1.2][i], y: 0 }}
                whileHover={{ scale: 1.05, rotate: 0, y: -6, zIndex: 3 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                onClick={() => onOpen(p.id)}
              >
                <span className="sk-tape" />
                <div className="sk-sticky-top"><b>{p.name}</b><small>{p.role}</small><em>{quiet ? <Kb name="coffee" size={18} /> : countOf(p.id)}</em></div>
                <p>{briefOf(p.id).headline}</p>
                <span className="sk-sticky-open">{quiet ? '不打扰' : '点开看 →'}</span>
              </motion.button>
            ) : (
              <div className="sk-sticky-slot" style={{ left: i * 208 }} />
            )}
          </AnimatePresence>
        )
      })}
    </div>
  )
}

// ---------------- 简报纸 ----------------

function BriefPaper({ id, onClose }: { id: PersonId; onClose: () => void }) {
  const p = personById(id)
  const b = briefOf(id)
  const quiet = isQuiet(id)
  const rows = p.host ? ITEMS.map(i => i.id) : b.entries.map(e => e.item)
  const [ok, setOk] = useState<Record<string, boolean>>({})
  return (
    <>
      <motion.div className="sk-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sk-paper" initial={{ opacity: 0, y: 40, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: -0.6 }} exit={{ opacity: 0, y: 30, rotate: 2 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
        <button className="sk-paper-x" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        <div className="sk-paper-head">
          <span className="sk-paper-face" style={{ background: p.bg, color: p.fg }}>{p.short}</span>
          <div><b>{p.name}</b><small>{p.role}{quiet ? ' · 这场不打扰' : ` · 约 ${b.readSeconds} 秒读完`}</small></div>
        </div>
        <p className="sk-paper-headline">{b.headline}</p>
        {quiet && <div className="sk-paper-quiet"><Kb name="coffee" size={40} /> 没有需要你必读的内容。上线日期的变化放进了日报。</div>}
        <ol className="sk-paper-list">
          {rows.map(iid => {
            const it = itemById(iid)
            const e = b.entries.find(x => x.item === iid)
            const c = ITEM_TYPES[it.type]
            const r4 = e?.reasons.includes('R4')
            return (
              <li key={iid}>
                <button className={`sk-check ${ok[iid] ? 'on' : ''}`} onClick={() => setOk(s => ({ ...s, [iid]: !s[iid] }))} aria-label="确认">
                  <svg width="22" height="22" viewBox="0 0 22 22">
                    <Rough shape={{ kind: 'rect', x: 2, y: 2, w: 18, h: 18 }} opts={{ stroke: INK, strokeWidth: 1.4, roughness: 1.2 }} draw={0} />
                    {ok[iid] && <Rough shape={{ kind: 'path', d: 'M5,11 l5,6 l10,-15' }} opts={{ stroke: '#2F9E44', strokeWidth: 2.4, roughness: 0.6 }} draw={0.25} />}
                  </svg>
                </button>
                <div>
                  <div className="sk-paper-t"><span style={{ color: c.color }}>{c.label}</span>{it.title}{it.sensitivity === 'restricted' && <Lock size={13} className="sk-lock" />}</div>
                  {e && <p>{e.forYou}</p>}
                  {e && <small className={r4 ? 'r4' : ''}>为什么发给你：{e.why}（{e.reasons.map(r => REASONS[r]).join('、')}）</small>}
                  {p.host && <small>发给：{[...new Set(ROUTES.filter(r => r.item === iid).map(r => personById(r.person).name))].join('、') || '只在账本里'}</small>}
                  <q>{it.quote}<em> — {personById(it.speaker).name} {it.at}</em></q>
                </div>
              </li>
            )
          })}
        </ol>
        <div className="sk-paper-foot"><Kb name="paperPlane" size={22} /> 由投递官发到飞书 · 勾选就是“确认”</div>
      </motion.div>
    </>
  )
}
