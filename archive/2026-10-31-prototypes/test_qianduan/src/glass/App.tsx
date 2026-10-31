import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Check, Circle, LoaderCircle, Pause, Play, X as XIcon } from 'lucide'
import {
  AudioLines, BellOff, Lock, MessageCircleQuestion, PenLine, Plus, RotateCcw,
  Route as RouteIcon, ScanSearch, ShieldCheck, Sparkles, Split, UserX, Workflow, X,
} from 'lucide-react'
import { parseTranscript } from '@web/lib/transcript'
import {
  AGENTS, DEFAULT_TEXT, DEFAULT_TITLE, ENGINES, ITEMS, ITEM_TYPES, PEOPLE, PHASES, REASONS, REASON_SHORT, T_END,
  agentModel, agentProgress, agentSeg, agentState, briefOf, countOf, edgesAt, EDGE_LEN, isQuiet, itemById, itemState,
  itemsAt, logAt, notesAt, PEOPLE_SORTED, personById, phaseIndex, quoteAt, readyAt, routesAt, routesFor,
  tokensAt, topicsAt, agentById,
  type AgentId, type EngineId, type Person, type PersonId,
} from '@/shared/script'
import { useDemo } from '@/shared/useDemo'
import { ModelIcon } from '@/shared/ModelIcon'

const ICON: Record<AgentId, typeof Workflow> = {
  orc: Workflow, scribe: AudioLines, topic: Split, ext: ScanSearch,
  aud: ShieldCheck, router: RouteIcon, editor: PenLine, disp: Sparkles,
}

const ease = [0.2, 0.7, 0.2, 1] as const

export function App() {
  const demo = useDemo({ startDelay: 650 })
  const { t, clock, running, done } = demo
  const [engine, setEngine] = useState<EngineId>('deepseek')
  const [open, setOpen] = useState<PersonId | null>(null)
  const segs = useMemo(() => parseTranscript(DEFAULT_TEXT), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === ' ' && running && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        clock.toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, clock])

  return (
    <div className="gl">
      <Aurora />
      <Header stage={!running ? 0 : done ? 2 : 1} demo={demo} engine={engine} onEngine={setEngine} />

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {!running ? (
            <Composer key="composer" onStart={demo.start} />
          ) : (
            <motion.main key="stage" className={`gl-stage ${done ? 'done' : ''}`} exit={{ opacity: 0 }}>
              <Transcript segs={segs} t={t} />
              <motion.section
                className="glass gl-center"
                initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.15, duration: 0.7, ease }}
              >
                <Constellation t={t} engine={engine} />
                <Activity t={t} />
              </motion.section>
              <motion.section
                className="glass gl-right"
                initial={{ opacity: 0, x: 40, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.3, duration: 0.7, ease }}
              >
                <RightPanel t={t} onOpen={setOpen} />
              </motion.section>
            </motion.main>
          )}
        </AnimatePresence>

        <AnimatePresence>{done && <Dock onOpen={setOpen} open={open} />}</AnimatePresence>
        <AnimatePresence>{open && <BriefWindow id={open} onClose={() => setOpen(null)} />}</AnimatePresence>
      </LayoutGroup>
    </div>
  )
}

// ---------------- 背景 ----------------

function Aurora() {
  return (
    <div className="gl-aurora" aria-hidden>
      <i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" />
      <div className="gl-noise" />
    </div>
  )
}

// ---------------- 顶栏 ----------------

function Header({ stage, demo, engine, onEngine }: {
  stage: number
  demo: ReturnType<typeof useDemo>
  engine: EngineId
  onEngine: (e: EngineId) => void
}) {
  const { clock, running } = demo
  return (
    <header className="gl-top">
      <div className="glass gl-pill gl-brand">
        <span className="gl-logo" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M4 7.5h9M4 12h13M4 16.5h7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="19" cy="7.5" r="1.8" fill="#fff" /><circle cx="15.5" cy="16.5" r="1.8" fill="#fff" />
          </svg>
        </span>
        <b>会映</b><span>MeetReel</span>
      </div>

      <nav className="glass gl-pill gl-steps">
        {['输入', '编排', '分发'].map((s, i) => (
          <span key={s} className={i === stage ? 'on' : i < stage ? 'past' : ''}>
            {i === stage && <motion.i layoutId="gl-step" className="gl-step-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <em>{i + 1}</em>{s}
          </span>
        ))}
      </nav>

      <div className="gl-top-r">
        {running && (
          <motion.div className="glass gl-pill gl-ctrl" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <button className="gl-play" onClick={clock.toggle} aria-label={clock.playing ? '暂停' : '播放'}>
              <MorphIcon icon={clock.playing ? Pause : Play} size={16} strokeWidth={2.2} />
            </button>
            <Scrubber t={clock.t} onSeek={clock.seek} />
            <button className={`gl-speed ${clock.speed === 2 ? 'on' : ''}`} onClick={() => clock.setSpeed(clock.speed === 2 ? 1 : 2)}>
              {clock.speed}×
            </button>
            <button className="gl-icon" onClick={clock.restart} aria-label="重放"><RotateCcw size={15} /></button>
          </motion.div>
        )}
        <div className="glass gl-pill gl-engines">
          {ENGINES.map(e => (
            <button key={e.id} className={e.id === engine ? 'on' : ''} onClick={() => onEngine(e.id)} title={e.sub}>
              {e.id === engine && <motion.i layoutId="gl-engine" className="gl-engine-bg" transition={{ type: 'spring', stiffness: 460, damping: 34 }} />}
              <span><ModelIcon icon={e.id} size={14} />{e.label}</span>
            </button>
          ))}
        </div>
        {running && (
          <button className="glass gl-pill gl-new" onClick={demo.reset}><Plus size={15} /> 新会议</button>
        )}
      </div>
    </header>
  )
}

function Scrubber({ t, onSeek }: { t: number; onSeek: (t: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const seekAt = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    onSeek(((x - r.left) / r.width) * T_END)
  }
  return (
    <div
      ref={ref}
      className="gl-scrub"
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seekAt(e.clientX) }}
      onPointerMove={e => e.buttons && seekAt(e.clientX)}
    >
      <i style={{ width: `${(t / T_END) * 100}%` }} />
      <b style={{ left: `${(t / T_END) * 100}%` }} />
      <span>{t.toFixed(1)}s</span>
    </div>
  )
}

// ---------------- 输入页 ----------------

function Composer({ onStart }: { onStart: () => void }) {
  const [text, setText] = useState(DEFAULT_TEXT)
  return (
    <motion.main className="gl-compose" exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }} transition={{ duration: 0.45 }}>
      <motion.div className="gl-hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
        <span className="glass gl-eyebrow"><Sparkles size={13} /> 会后信息路由 · 8 个智能体</span>
        <h1>开完一场会<br /><span>每个人只收到和自己有关的那部分</span></h1>
      </motion.div>

      <motion.section
        layoutId="gl-meeting"
        className="glass gl-composer"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 30, delay: 0.1 }}
      >
        <div className="gl-c-head">
          <b>{DEFAULT_TITLE}</b>
          <div className="gl-faces">
            {PEOPLE.map((p, i) => (
              <motion.span key={p.id} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 500, damping: 22 }}>
                <Face p={p} size={28} ring={p.present} />
              </motion.span>
            ))}
          </div>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} spellCheck={false} aria-label="会议文本"
          onKeyDown={e => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onStart()} />
        <div className="gl-c-foot">
          <span>8 位相关人 · 参会 3 · 缺席 5 · 关注档案已加载</span>
          <button className="gl-go" onClick={onStart}>
            <span className="gl-go-shine" />
            开始分析 <kbd>Ctrl ↵</kbd>
          </button>
        </div>
      </motion.section>
    </motion.main>
  )
}

// ---------------- 左：会议原文 ----------------

function Transcript({ segs, t }: { segs: ReturnType<typeof parseTranscript>; t: number }) {
  const items = itemsAt(t).filter(i => itemState(i, t) !== 'hidden' && quoteAt(i, t) === i.quote)
  const topics = topicsAt(t)
  return (
    <motion.section layoutId="gl-meeting" className="glass gl-left" transition={{ type: 'spring', stiffness: 200, damping: 30 }}>
      <div className="gl-panel-head">
        <b>{DEFAULT_TITLE}</b>
        <small>11 段发言 · 00:58</small>
      </div>
      <div className="gl-topics">
        <AnimatePresence>
          {topics.map(x => (
            <motion.span key={x.name} initial={{ opacity: 0, scale: 0.6, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
              # {x.name}
            </motion.span>
          ))}
        </AnimatePresence>
        {!topics.length && <em>议题官稍后切分议题…</em>}
      </div>
      <ol className="gl-segs">
        {segs.map((s, i) => {
          const scanAt = 0.95 + i * 0.15
          const lit = t >= scanAt
          const scanning = t >= scanAt && t < scanAt + 0.4
          return (
            <li key={s.id} className={`${lit ? 'lit' : ''} ${scanning ? 'scan' : ''}`}>
              <Face p={s.person} size={24} />
              <div>
                <div className="gl-seg-meta"><b>{s.speaker}</b><small>{s.at}</small></div>
                <p>{highlight(s.text, items)}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </motion.section>
  )
}

function highlight(text: string, items: typeof ITEMS) {
  const hits = items
    .map(it => ({ it, at: text.indexOf(it.quote) }))
    .filter(h => h.at >= 0)
    .sort((a, b) => a.at - b.at)
  const out: ReactNode[] = []
  let cur = 0
  for (const { it, at } of hits) {
    if (at < cur) continue
    out.push(text.slice(cur, at))
    const c = ITEM_TYPES[it.type]
    out.push(
      <motion.mark key={it.id} style={{ '--c': c.color } as CSSProperties} initial={{ backgroundSize: '0% 100%' }} animate={{ backgroundSize: '100% 100%' }} transition={{ duration: 0.6, ease }}>
        {it.quote}
      </motion.mark>,
    )
    cur = at + it.quote.length
  }
  out.push(text.slice(cur))
  return out
}

// ---------------- 中：智能体星座 ----------------

const SW = 600
const SH = 470
const CX = SW / 2
const CY = SH / 2 - 8
const ORBIT = AGENTS.filter(a => a.id !== 'orc')
const POS = Object.fromEntries([
  ['orc', { x: CX, y: CY }],
  ...ORBIT.map((a, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / ORBIT.length
    return [a.id, { x: CX + 232 * Math.cos(ang), y: CY + 168 * Math.sin(ang) }]
  }),
]) as Record<AgentId, { x: number; y: number }>

function Constellation({ t, engine }: { t: number; engine: EngineId }) {
  const box = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setK(Math.min(1.15, e.contentRect.width / SW, e.contentRect.height / SH)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const edges = edgesAt(t)
  const phase = PHASES[phaseIndex(t)]
  const tokens = tokensAt(t)

  return (
    <div className="gl-sky" ref={box}>
      <div className="gl-sky-in" style={{ width: SW, height: SH, transform: `translate(-50%, -50%) scale(${k})` }}>
        <svg className="gl-lines" width={SW} height={SH}>
          <defs>
            {edges.map(e => (
              <linearGradient key={e.at} id={`gl-g-${e.at}`} gradientUnits="userSpaceOnUse" x1={POS[e.from].x} y1={POS[e.from].y} x2={POS[e.to].x} y2={POS[e.to].y}>
                <stop offset="0" stopColor={agentById(e.from).color} />
                <stop offset="1" stopColor={agentById(e.to).color} />
              </linearGradient>
            ))}
          </defs>
          <ellipse cx={CX} cy={CY} rx={232} ry={168} className="gl-orbit" />
          {ORBIT.map(a => (
            <line key={a.id} x1={CX} y1={CY} x2={POS[a.id].x} y2={POS[a.id].y} className={`gl-spoke ${agentState(a.id, t) === 'busy' ? 'on' : ''}`} style={{ stroke: a.color }} />
          ))}
          {edges.map(e => {
            const p = (t - e.at) / EDGE_LEN
            const a = POS[e.from]
            const b = POS[e.to]
            const head = Math.min(1, p * 1.6)
            const tail = Math.max(0, p * 1.6 - 0.6)
            const x = (u: number) => a.x + (b.x - a.x) * u
            const y = (u: number) => a.y + (b.y - a.y) * u
            return (
              <g key={e.at} style={{ opacity: p > 0.85 ? (1 - p) / 0.15 : 1 }}>
                <line x1={x(tail)} y1={y(tail)} x2={x(head)} y2={y(head)} stroke={`url(#gl-g-${e.at})`} strokeWidth={4} strokeLinecap="round" className="gl-beam" />
                <circle cx={x(head)} cy={y(head)} r={5} fill="#fff" className="gl-beam-dot" />
              </g>
            )
          })}
        </svg>

        {edges.map(e => (
          <motion.span
            key={e.at}
            className="gl-edge-label"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ left: (POS[e.from].x + POS[e.to].x) / 2, top: (POS[e.from].y + POS[e.to].y) / 2 }}
          >
            {e.label}
          </motion.span>
        ))}

        <div className={`gl-core ${agentState('orc', t) === 'busy' ? 'busy' : ''}`} style={{ left: CX, top: CY }}>
          <div className="gl-core-ring" />
          <div className="gl-core-in">
            <Workflow size={30} strokeWidth={1.8} />
          </div>
          <div className="gl-core-label">
            <b>调度官</b>
            <AnimatePresence mode="wait">
              <motion.span key={t >= T_END ? 'done' : phase.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {t >= T_END ? '全部完成' : phase.label}
              </motion.span>
            </AnimatePresence>
            <small>{tokens.toLocaleString()} tokens</small>
          </div>
        </div>

        {ORBIT.map(a => <Orb key={a.id} id={a.id} t={t} engine={engine} />)}
      </div>
    </div>
  )
}

function Orb({ id, t, engine }: { id: AgentId; t: number; engine: EngineId }) {
  const a = agentById(id)
  const st = agentState(id, t)
  const prog = agentProgress(id, t)
  const m = agentModel(id, engine)
  const Icon = ICON[id]
  const R = 39
  const C = 2 * Math.PI * R
  const badge = st === 'done' ? Check : st === 'fail' ? XIcon : st === 'busy' || st === 'wait' ? LoaderCircle : Circle
  return (
    <div className={`gl-orb gl-orb--${st}`} style={{ left: POS[id].x, top: POS[id].y, '--c': a.color } as CSSProperties}>
      <svg className="gl-orb-ring" width={92} height={92} viewBox="0 0 92 92">
        <circle cx={46} cy={46} r={R} className="track" />
        <circle cx={46} cy={46} r={R} className="bar" strokeDasharray={C} strokeDashoffset={C * (1 - prog)} />
      </svg>
      <div className="gl-orb-core"><Icon size={24} strokeWidth={1.9} /></div>
      <span className={`gl-orb-badge ${st}`}>
        <MorphIcon icon={badge} size={11} strokeWidth={3} />
      </span>
      <div className="gl-orb-label">
        <b>{a.name}</b>
        <small><ModelIcon icon={m.icon} size={11} />{m.label}</small>
      </div>
    </div>
  )
}

function Activity({ t }: { t: number }) {
  const busy = AGENTS.map(a => ({ a, seg: agentSeg(a.id, t) })).filter(x => x.seg && x.a.id !== 'orc')
  const notes = notesAt(t)
  const log = logAt(t).slice(-3).reverse()
  return (
    <div className="gl-activity">
      <div className="gl-now">
        <AnimatePresence initial={false}>
          {busy.map(({ a, seg }) => (
            <motion.div
              key={a.id + seg!.start}
              layout
              className={`gl-now-row ${seg!.kind}`}
              style={{ '--c': a.color } as CSSProperties}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
              transition={{ duration: 0.35 }}
            >
              <i />
              <b>{a.name}</b>
              <span>{seg!.title}</span>
              <div className="gl-now-bar"><motion.em style={{ width: `${Math.min(100, ((t - seg!.start) / (seg!.end - seg!.start)) * 100)}%` }} /></div>
            </motion.div>
          ))}
          {notes.map(n => (
            <motion.div key={'n' + n.at} layout className="gl-note" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <b>{agentById(n.agent).name}</b> {n.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {!busy.length && !notes.length && <div className="gl-now-idle">{t >= T_END ? '全部完成：8 个相关人，7 份不同的简报，1 人没被打扰' : '调度官在等待…'}</div>}
      </div>
      <ul className="gl-log">
        <AnimatePresence initial={false}>
          {log.map(l => (
            <motion.li key={l.at} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <i style={{ background: agentById(l.agent).color }} />
              <span>{l.text}</span>
              <small>{l.at.toFixed(1)}s</small>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

// ---------------- 右：账本 / 收件人 ----------------

function RightPanel({ t, onOpen }: { t: number; onOpen: (id: PersonId) => void }) {
  const [pick, setPick] = useState<'ledger' | 'people' | null>(null)
  const auto = t >= 10.3 ? 'people' : 'ledger'
  const view = pick ?? auto
  const items = itemsAt(t)
  const routes = routesAt(t)
  return (
    <>
      <div className="gl-panel-head gl-seg-ctl">
        {(['ledger', 'people'] as const).map(v => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setPick(v === auto ? null : v)}>
            {view === v && <motion.i layoutId="gl-tab" className="gl-tab-bg" transition={{ type: 'spring', stiffness: 460, damping: 34 }} />}
            <span>{v === 'ledger' ? `会议账本 ${items.length}/10` : `收件人 · ${routes.length} 条推送`}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {view === 'ledger' ? (
          <motion.ul key="ledger" className="gl-items" initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(6px)' }}>
            {!items.length && <li className="gl-empty">抽取官 4.5 秒后开始抽取条目</li>}
            <AnimatePresence>
              {items.map(it => {
                const st = itemState(it, t)
                const c = ITEM_TYPES[it.type]
                return (
                  <motion.li
                    key={it.id}
                    layout
                    className={`gl-item ${st}`}
                    style={{ '--c': c.color, '--soft': c.soft } as CSSProperties}
                    initial={{ opacity: 0, x: 30, scale: 0.94 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  >
                    <div className="gl-item-top">
                      <span className="gl-type">{c.label}</span>
                      <b>{it.title}</b>
                      {it.sensitivity === 'restricted' && <Lock size={12} className="gl-lock" />}
                      <span className={`gl-st ${st}`}>
                        <MorphIcon icon={st === 'ok' ? Check : st === 'fail' ? XIcon : LoaderCircle} size={12} strokeWidth={3} />
                      </span>
                    </div>
                    <div className="gl-item-q">
                      {st === 'fail' ? <span className="gl-fail">原话不在转写里，打回重抽</span> : <>“{quoteAt(it, t)}”</>}
                      {it.flags && st === 'ok' && it.flags.map(f => <em key={f}>{f}</em>)}
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <motion.ul key="people" className="gl-people" initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(6px)' }}>
            {PEOPLE_SORTED.map((p, i) => {
              const quiet = isQuiet(p.id)
              const got = p.host ? (routes.length ? ITEMS.length : 0) : routesFor(p.id, t).length
              const ready = t >= readyAt(p.id)
              const sent = t >= 19.1 && !quiet
              const reasons = [...new Set(routesFor(p.id, t).flatMap(r => r.reasons))]
              return (
                <motion.li
                  key={p.id}
                  className={`gl-person ${quiet && ready ? 'quiet' : ''} ${sent ? 'sent' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => t >= T_END && onOpen(p.id)}
                >
                  <Face p={p} size={34} muted={quiet && ready} />
                  <div className="gl-person-main">
                    <b>{p.name} <small>{p.role}</small>{!p.present && <em>缺席</em>}</b>
                    <div className="gl-reasons">
                      {quiet && ready ? <span className="gl-quiet"><BellOff size={11} /> 没有必读，不打扰</span>
                        : p.host ? <span className="gl-r">主持人 · 全部条目</span>
                        : reasons.map(r => <span key={r} className={`gl-r ${r === 'R4' ? 'r4' : ''}`}>{REASON_SHORT[r]}</span>)}
                    </div>
                  </div>
                  <motion.b key={got} className="gl-count" initial={{ scale: 1.5, color: '#4F46E5' }} animate={{ scale: 1, color: '#1B1B2F' }}>
                    {got}
                  </motion.b>
                  <AnimatePresence>
                    {sent && (
                      <motion.span className="gl-sent" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: i * 0.05 }}>
                        <MorphIcon icon={Check} size={11} strokeWidth={3.2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  )
}

// ---------------- 完成：Dock + 简报窗口 ----------------

function Dock({ onOpen, open }: { onOpen: (id: PersonId) => void; open: PersonId | null }) {
  const mouseX = useMotionValue(Infinity)
  return (
    <motion.div
      className="gl-dock-wrap"
      initial={{ y: 140, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 140, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.3 }}
    >
      <div className="gl-dock-title">分发完成 · 点头像看每个人收到的简报</div>
      <div className="glass gl-dock" onMouseMove={e => mouseX.set(e.clientX)} onMouseLeave={() => mouseX.set(Infinity)}>
        {PEOPLE_SORTED.map(p => (
          <DockItem key={p.id} p={p} mouseX={mouseX} onOpen={onOpen} hidden={open === p.id} />
        ))}
      </div>
    </motion.div>
  )
}

function DockItem({ p, mouseX, onOpen, hidden }: { p: Person; mouseX: MotionValue<number>; onOpen: (id: PersonId) => void; hidden: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  const dist = useTransform(mouseX, x => {
    const r = ref.current?.getBoundingClientRect()
    return r ? x - r.left - r.width / 2 : Infinity
  })
  const size = useSpring(useTransform(dist, [-160, 0, 160], [52, 84, 52]), { stiffness: 380, damping: 26 })
  const quiet = isQuiet(p.id)
  return (
    <motion.button
      ref={ref}
      layoutId={`gl-brief-${p.id}`}
      className={`gl-dock-item ${quiet ? 'quiet' : ''}`}
      style={{ width: size, height: size, background: quiet ? '#E9E9EF' : p.bg, color: quiet ? '#9A9AA6' : p.fg, opacity: hidden ? 0 : 1 }}
      onClick={() => onOpen(p.id)}
    >
      <span>{p.short}</span>
      <em className="gl-dock-n">{quiet ? <BellOff size={10} /> : countOf(p.id)}</em>
      <small className="gl-dock-tip">{p.name}</small>
    </motion.button>
  )
}

function BriefWindow({ id, onClose }: { id: PersonId; onClose: () => void }) {
  const p = personById(id)
  const b = briefOf(id)
  const quiet = isQuiet(id)
  const [acted, setActed] = useState<Record<string, 'ok' | 'no' | 'ask'>>({})
  const rows = p.host ? ITEMS.map(i => i.id) : b.entries.map(e => e.item)
  return (
    <>
      <motion.div className="gl-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        layoutId={`gl-brief-${id}`}
        className="glass gl-window"
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{ borderRadius: 32 }}
      >
        <motion.div className="gl-win-in" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
          <div className="gl-win-head">
            <Face p={p} size={46} muted={quiet} />
            <div>
              <b>{p.name}</b>
              <span>{p.role} · {quiet ? '这场会不打扰' : `约 ${b.readSeconds} 秒读完`}</span>
            </div>
            <button className="gl-x" onClick={onClose} aria-label="关闭"><X size={16} /></button>
          </div>
          <p className="gl-headline">{b.headline}</p>

          {quiet ? (
            <div className="gl-quiet-box">
              <BellOff size={26} />
              <b>没有需要你必读的内容</b>
              <span>上线日期的变化已经放进你的日报，不单独推送。</span>
            </div>
          ) : (
            <ul className="gl-entries">
              {rows.map((iid, i) => {
                const it = itemById(iid)
                const e = b.entries.find(x => x.item === iid)
                const c = ITEM_TYPES[it.type]
                const restricted = it.sensitivity === 'restricted' && !['linzong', 'zhouning', 'wangke', 'chenmo'].includes(id)
                const a = acted[iid]
                return (
                  <motion.li key={iid} style={{ '--c': c.color, '--soft': c.soft } as CSSProperties}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                    <div className="gl-entry-top">
                      <span className="gl-type">{c.label}</span>
                      <b>{restricted ? it.redacted : it.title}</b>
                      {it.sensitivity === 'restricted' && <Lock size={12} className="gl-lock" />}
                    </div>
                    {e && <p>{e.forYou}</p>}
                    {e && (
                      <div className="gl-why">
                        为什么发给你：{e.why}
                        {e.reasons.map(r => <span key={r} className={`gl-r ${r === 'R4' ? 'r4' : ''}`}>{REASONS[r]}</span>)}
                      </div>
                    )}
                    {p.host && (
                      <div className="gl-why">
                        发给：{routesAt(99).filter(r => r.item === iid).map(r => personById(r.person).name).filter((v, k, s) => s.indexOf(v) === k).join('、') || '仅账本'}
                      </div>
                    )}
                    <div className="gl-quote">“{it.quote}” <small>{personById(it.speaker).name} · {it.at}</small></div>
                    {e && it.type === 'action' && (
                      <div className="gl-acts">
                        <button className={a === 'ok' ? 'on' : ''} onClick={() => setActed(s => ({ ...s, [iid]: 'ok' }))}>
                          <MorphIcon icon={a === 'ok' ? Check : Circle} size={13} strokeWidth={2.4} /> {a === 'ok' ? '已确认' : '确认'}
                        </button>
                        <button className={a === 'no' ? 'on' : ''} onClick={() => setActed(s => ({ ...s, [iid]: 'no' }))}><UserX size={13} /> 不是我</button>
                        <button className={a === 'ask' ? 'on' : ''} onClick={() => setActed(s => ({ ...s, [iid]: 'ask' }))}><MessageCircleQuestion size={13} /> 追问</button>
                      </div>
                    )}
                  </motion.li>
                )
              })}
            </ul>
          )}
        </motion.div>
      </motion.div>
    </>
  )
}

// ---------------- 小部件 ----------------

function Face({ p, size, ring, muted }: { p?: Person; size: number; ring?: boolean; muted?: boolean }) {
  return (
    <span
      className={`gl-face ${ring ? 'ring' : ''}`}
      style={{
        width: size, height: size, fontSize: size * 0.42,
        background: muted ? '#ECECF1' : p?.bg ?? '#EEF', color: muted ? '#A1A1AA' : p?.fg ?? '#555',
      }}
    >
      {p?.short ?? '?'}
    </span>
  )
}
