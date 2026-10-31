import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Check, Pause, Play } from 'lucide'
import { BellOff, CornerDownLeft, Lock, RotateCcw, Sparkles, Terminal } from 'lucide-react'
import { parseTranscript } from '@web/lib/transcript'
import {
  AGENTS, AXIS_MAX, DEFAULT_TEXT, DEFAULT_TITLE, EDGES, EDGE_LEN, ITEMS, ITEM_TYPES, LOG, REASONS, REASON_SHORT, ROUTES, SEGS, T_END,
  agentById, agentModel, agentSeg, agentState, briefOf, countOf, isQuiet, itemById, itemState, logAt, PEOPLE_SORTED,
  personById, quoteAt, readyAt, routesAt, tokensAt,
  type AgentId, type Person, type PersonId,
} from '@/shared/script'
import { useDemo } from '@/shared/useDemo'
import { ModelIcon } from '@/shared/ModelIcon'

export function App() {
  const demo = useDemo({ startDelay: 500 })
  const { t, clock, running, done } = demo
  const [open, setOpen] = useState<PersonId | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === ' ' && running && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        clock.toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, clock])

  return (
    <div className="nt" onPointerMove={spotlight}>
      <div className="nt-bg" aria-hidden><div className="nt-grid" /><div className="nt-glow" /></div>
      <header className="nt-top">
        <div className="nt-brand">
          <span className="nt-logo" aria-hidden>
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 7.5h9M4 12h13M4 16.5h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><circle cx="19" cy="7.5" r="1.9" fill="currentColor" /><circle cx="15.5" cy="16.5" r="1.9" fill="currentColor" /></svg>
          </span>
          <b>会映</b><span>/</span><em>{DEFAULT_TITLE}</em>
        </div>
        {running && (
          <div className="nt-ctrl">
            <span className={`nt-status ${done ? 'done' : ''}`}>{done ? '已分发' : clock.playing ? '运行中' : '已暂停'}</span>
            <span className="nt-time">{t.toFixed(1)}s<i>/ {T_END}s</i></span>
            <button className="nt-btn" onClick={clock.toggle} aria-label={clock.playing ? '暂停' : '播放'}><MorphIcon icon={clock.playing ? Pause : Play} size={14} strokeWidth={2.2} /></button>
            <button className={`nt-btn ${clock.speed === 2 ? 'on' : ''}`} onClick={() => clock.setSpeed(clock.speed === 2 ? 1 : 2)}>{clock.speed}×</button>
            <button className="nt-btn" onClick={clock.restart} aria-label="重放"><RotateCcw size={14} /></button>
            <button className="nt-btn wide" onClick={demo.reset}>新会议</button>
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {!running ? (
          <Launcher key="launch" onStart={demo.start} />
        ) : (
          <motion.main key="run" className="nt-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <Timeline t={t} onSeek={clock.seek} />
            <div className="nt-row">
              <Routing t={t} onOpen={setOpen} />
              <Log t={t} />
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      <AnimatePresence>{open && <BriefModal id={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

/** 卡片的鼠标聚光：把指针位置写到最近的 .nt-card 上 */
function spotlight(e: PointerEvent) {
  const card = (e.target as HTMLElement).closest<HTMLElement>('.nt-card')
  if (!card) return
  const r = card.getBoundingClientRect()
  card.style.setProperty('--mx', `${e.clientX - r.left}px`)
  card.style.setProperty('--my', `${e.clientY - r.top}px`)
}

// ---------------- 启动器（输入页） ----------------

function Launcher({ onStart }: { onStart: () => void }) {
  const segs = useMemo(() => parseTranscript(DEFAULT_TEXT), [])
  const [sel, setSel] = useState(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onStart()
      if (e.key === 'ArrowDown') setSel(s => Math.min(segs.length - 1, s + 1))
      if (e.key === 'ArrowUp') setSel(s => Math.max(0, s - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart, segs.length])

  return (
    <motion.section className="nt-launch-wrap" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }} transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}>
      <h1>会后信息路由<span>8 个智能体，把一场会拆成每人一份。</span></h1>
      <div className="nt-launch nt-card">
        <div className="nt-launch-in">
          <Sparkles size={16} />
          <span>{DEFAULT_TITLE}</span>
          <em>11 段发言 · 8 位相关人</em>
        </div>
        <ul className="nt-launch-list">
          {segs.map((s, i) => (
            <li key={s.id} className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)}>
              <Face p={s.person} size={20} />
              <b>{s.speaker}</b>
              <span>{s.text}</span>
              <small>{s.at}</small>
            </li>
          ))}
        </ul>
        <footer className="nt-launch-foot">
          <span className="nt-launch-model"><ModelIcon icon="deepseek" size={14} /> DeepSeek V4.1 Flash</span>
          <button className="nt-go" onClick={onStart}>开始编排 <kbd><CornerDownLeft size={12} /></kbd></button>
          <span className="nt-sep" />
          <span className="nt-hint">操作 <kbd>Ctrl</kbd><kbd>K</kbd></span>
        </footer>
      </div>
    </motion.section>
  )
}

// ---------------- 泳道时间轴 ----------------

const LANE = 38

function Timeline({ t, onSeek }: { t: number; onSeek: (t: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(900)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const x = (s: number) => (s / AXIS_MAX) * w
  const laneY = (id: AgentId) => AGENTS.findIndex(a => a.id === id) * LANE + LANE / 2
  const H = AGENTS.length * LANE
  const seek = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(((e.clientX - r.left) / r.width) * AXIS_MAX)
  }
  const [hover, setHover] = useState<number | null>(null)
  const hseg = hover != null ? SEGS[hover] : null

  return (
    <section className="nt-card nt-tl">
      <div className="nt-card-head">
        <div>
          <h2>编排时间轴</h2>
          <p>调度官派发任务、审核官打回重抽、路由官判断影响链，全部在 20 秒内完成</p>
        </div>
        <div className="nt-legend">
          <span><i className="lg-think" />思考</span><span><i className="lg-tool" />工具</span>
          <span><i className="lg-wait" />等待</span><span><i className="lg-fail" />打回</span><span><i className="lg-retry" />重抽</span>
        </div>
      </div>
      <div className="nt-tl-body">
        <ul className="nt-lanes" style={{ height: H }}>
          {AGENTS.map(a => {
            const st = agentState(a.id, t)
            const seg = agentSeg(a.id, t)
            const m = agentModel(a.id, 'deepseek')
            return (
              <li key={a.id} className={`nt-lane ${st}`} style={{ height: LANE, '--c': a.color } as CSSProperties}>
                <i />
                <div>
                  <b>{a.name}<ModelIcon icon={m.icon} size={11} /></b>
                  <small>{seg ? seg.title : st === 'done' ? '完成' : st === 'idle' ? a.duty : '等待中'}</small>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="nt-chart" ref={box} style={{ height: H + 26 }}>
          <svg width={w} height={H + 26} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seek(e) }} onPointerMove={e => e.buttons && seek(e)}>
            <defs>
              <pattern id="nt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="rgba(255,255,255,.03)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
              </pattern>
              <linearGradient id="nt-scan" x1="0" x2="1">
                <stop offset="0" stopColor="#5E6AD2" stopOpacity="0" />
                <stop offset="1" stopColor="#5E6AD2" stopOpacity=".22" />
              </linearGradient>
              <filter id="nt-blur"><feGaussianBlur stdDeviation="3" /></filter>
            </defs>
            {AGENTS.map((a, i) => <line key={a.id} x1={0} x2={w} y1={i * LANE + LANE} y2={i * LANE + LANE} className="nt-gridline" />)}
            {Array.from({ length: 11 }, (_, i) => i * 2).map(s => (
              <g key={s}>
                <line x1={x(s)} x2={x(s)} y1={0} y2={H} className="nt-gridline v" />
                <text x={x(s)} y={H + 17} className="nt-axis">{s}s</text>
              </g>
            ))}

            <rect x={Math.max(0, x(t) - 90)} y={0} width={Math.min(90, x(t))} height={H} fill="url(#nt-scan)" />

            {SEGS.map((s, i) => {
              if (t < s.start) return null
              const a = agentById(s.agent)
              const end = Math.min(t, s.end)
              const live = t < s.end
              const y = laneY(s.agent)
              const fill = s.kind === 'wait' ? 'url(#nt-hatch)' : s.kind === 'fail' ? '#F43F5E' : s.kind === 'retry' ? '#F59E0B' : a.color
              return (
                <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="nt-seg">
                  {live && s.kind !== 'wait' && <rect x={x(s.start)} y={y - 7} width={Math.max(2, x(end) - x(s.start))} height={14} rx={4} fill={fill} filter="url(#nt-blur)" opacity={0.7} />}
                  <rect
                    x={x(s.start)} y={y - (s.kind === 'wait' ? 5 : 7)} width={Math.max(2, x(end) - x(s.start))} height={s.kind === 'wait' ? 10 : 14} rx={4}
                    fill={fill} fillOpacity={s.kind === 'think' ? 0.35 : 1}
                    stroke={s.kind === 'think' ? a.color : 'none'} strokeOpacity={0.8}
                  />
                </g>
              )
            })}

            {EDGES.filter(e => t >= e.at).map(e => {
              const x0 = x(e.at)
              const y1 = laneY(e.from)
              const y2 = laneY(e.to)
              const bulge = 18 + Math.abs(y2 - y1) * 0.08
              const d = `M${x0},${y1} C${x0 + bulge},${y1} ${x0 + bulge},${y2} ${x0},${y2}`
              const p = (t - e.at) / EDGE_LEN
              const active = p < 1
              return (
                <g key={e.at}>
                  <path d={d} className="nt-hand" />
                  {active && (
                    <path d={d} pathLength={1} className="nt-hand-live" style={{ strokeDasharray: '0.22 1', strokeDashoffset: 0.22 - p * 1.22, stroke: agentById(e.to).color }} />
                  )}
                  <circle cx={x0} cy={y2} r={active ? 3.5 : 2.2} fill={agentById(e.to).color} />
                </g>
              )
            })}

            <line x1={x(t)} x2={x(t)} y1={-4} y2={H + 4} className="nt-playhead" />
            <circle cx={x(t)} cy={-4} r={4} className="nt-playhead-dot" />
          </svg>
          <AnimatePresence>
            {hseg && (
              <motion.div
                className="nt-tip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ left: Math.min(w - 280, Math.max(0, x(hseg.start))), top: laneY(hseg.agent) + 14 }}
              >
                <b style={{ color: agentById(hseg.agent).color }}>{agentById(hseg.agent).name}</b> · {hseg.start.toFixed(1)}–{hseg.end.toFixed(1)}s{hseg.tokens ? ` · ${hseg.tokens} tok` : ''}
                <div>{hseg.title}</div>
                {hseg.note && <small>↳ {hseg.note}</small>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

// ---------------- 账本 → 收件人 光束 ----------------

const IT_H = 34
const IT_GAP = 5
const P_H = 40
const P_GAP = 6
const BEAM_W = 150

function Routing({ t, onOpen }: { t: number; onOpen: (id: PersonId) => void }) {
  const [focus, setFocus] = useState<{ kind: 'item' | 'person'; id: string } | null>(null)
  const colH = ITEMS.length * (IT_H + IT_GAP) - IT_GAP
  const pColH = PEOPLE_SORTED.length * (P_H + P_GAP) - P_GAP
  const pOff = (colH - pColH) / 2
  const iy = (id: string) => ITEMS.findIndex(i => i.id === id) * (IT_H + IT_GAP) + IT_H / 2
  const py = (id: PersonId) => pOff + PEOPLE_SORTED.findIndex(p => p.id === id) * (P_H + P_GAP) + P_H / 2
  const routes = routesAt(t)
  const lit = (r: { item: string; person: string }) => !focus || (focus.kind === 'item' ? focus.id === r.item : focus.id === r.person)

  return (
    <section className="nt-card nt-route">
      <div className="nt-card-head">
        <div>
          <h2>账本 → 收件人</h2>
          <p>相关性决定推不推，权限决定看不看得到</p>
        </div>
        <div className="nt-kpis">
          <span><b>{ITEMS.filter(i => t >= i.appearAt).length}</b>条目</span>
          <span><b>{routes.length}</b>推送</span>
          <span><b>{t >= 19.1 ? 7 : 0}</b>已送达</span>
        </div>
      </div>
      <div className="nt-route-grid" style={{ gridTemplateColumns: `minmax(0,1fr) ${BEAM_W}px 210px`, height: Math.max(colH, pColH) }}>
        <ul className="nt-items">
          {ITEMS.map(it => {
            const st = itemState(it, t)
            const c = ITEM_TYPES[it.type]
            const dim = focus && !(focus.kind === 'item' ? focus.id === it.id : ROUTES.some(r => r.item === it.id && r.person === focus.id))
            return (
              <li
                key={it.id}
                className={`nt-item ${st} ${dim ? 'dim' : ''}`}
                style={{ height: IT_H, '--c': c.color } as CSSProperties}
                onMouseEnter={() => setFocus({ kind: 'item', id: it.id })}
                onMouseLeave={() => setFocus(null)}
              >
                {st === 'hidden' ? <span className="nt-slot" /> : (
                  <motion.div className="nt-item-in" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <span className="nt-id">{it.id}</span>
                    <span className="nt-type">{c.label}</span>
                    <b>{it.title}</b>
                    {it.sensitivity === 'restricted' && <Lock size={11} className="nt-lock" />}
                    <span className="nt-q">{st === 'fail' ? '原话对不上 · 打回' : `“${quoteAt(it, t)}”`}</span>
                    <span className={`nt-st ${st}`}>{st === 'ok' ? <MorphIcon icon={Check} size={11} strokeWidth={3} /> : st === 'fail' ? '×' : ''}</span>
                  </motion.div>
                )}
              </li>
            )
          })}
        </ul>

        <svg className="nt-beams" width={BEAM_W} height={Math.max(colH, pColH)}>
          <defs>
            {ITEMS.map(it => (
              <linearGradient key={it.id} id={`nt-b-${it.id}`} x1="0" x2="1">
                <stop offset="0" stopColor={ITEM_TYPES[it.type].color} />
                <stop offset="1" stopColor="#A5B4FC" />
              </linearGradient>
            ))}
          </defs>
          {routes.map(r => {
            const y1 = iy(r.item)
            const y2 = py(r.person)
            const d = `M0,${y1} C${BEAM_W * 0.55},${y1} ${BEAM_W * 0.45},${y2} ${BEAM_W},${y2}`
            const p = Math.min(1, (t - r.at) / 0.6)
            const r4 = r.reasons.includes('R4')
            return (
              <g key={r.item + r.person} opacity={lit(r) ? 1 : 0.08}>
                <path d={d} className={`nt-beam ${r4 ? 'r4' : ''}`} stroke={`url(#nt-b-${r.item})`} />
                {p < 1 && <path d={d} pathLength={1} className="nt-beam-live" stroke={`url(#nt-b-${r.item})`} style={{ strokeDasharray: '0.3 1', strokeDashoffset: 0.3 - p * 1.3 }} />}
              </g>
            )
          })}
        </svg>

        <ul className="nt-people" style={{ paddingTop: pOff }}>
          {PEOPLE_SORTED.map(p => {
            const quiet = isQuiet(p.id)
            const n = p.host ? (routes.length ? ITEMS.length : 0) : routes.filter(r => r.person === p.id).length
            const ready = t >= readyAt(p.id)
            const r4 = routes.some(r => r.person === p.id && r.reasons.includes('R4'))
            const dim = focus && !(focus.kind === 'person' ? focus.id === p.id : ROUTES.some(r => r.item === focus.id && r.person === p.id) || p.host)
            return (
              <li
                key={p.id}
                className={`nt-person ${quiet && ready ? 'quiet' : ''} ${t >= T_END ? 'click' : ''} ${dim ? 'dim' : ''}`}
                style={{ height: P_H }}
                onMouseEnter={() => setFocus({ kind: 'person', id: p.id })}
                onMouseLeave={() => setFocus(null)}
                onClick={() => t >= T_END && onOpen(p.id)}
              >
                <Face p={p} size={24} muted={quiet && ready} />
                <div>
                  <b>{p.name}{r4 && <em>影响链</em>}</b>
                  <small>{quiet && ready ? '不打扰' : p.role}</small>
                </div>
                <motion.span key={n} className="nt-n" initial={{ scale: 1.5, color: '#A5B4FC' }} animate={{ scale: 1, color: '#EDEDEF' }}>{quiet && ready ? <BellOff size={13} /> : n}</motion.span>
                {t >= 19.1 && !quiet && <span className="nt-sent" />}
              </li>
            )
          })}
        </ul>
      </div>
      {t >= T_END && <p className="nt-route-tip">点右侧任何一个人，看他收到的简报</p>}
    </section>
  )
}

// ---------------- 终端日志 ----------------

function Log({ t }: { t: number }) {
  const lines = logAt(t)
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [lines.length])
  const tokens = tokensAt(t)
  return (
    <section className="nt-card nt-log">
      <div className="nt-log-head">
        <Terminal size={13} />
        <span>meetreel run --meeting 双11评审 --engine deepseek</span>
      </div>
      <div className="nt-log-body" ref={box}>
        {lines.map((l, i) => {
          const a = agentById(l.agent)
          const fresh = t - l.at < 0.6
          const bad = l.text.includes('失败')
          return (
            <div key={l.at} className={`nt-line ${bad ? 'bad' : ''} ${fresh ? 'fresh' : ''}`}>
              <span className="ts">{l.at.toFixed(2).padStart(5, '0')}</span>
              <span className="who" style={{ color: a.color }}>{a.id.padEnd(6, ' ')}</span>
              <span className="msg">{fresh && i === lines.length - 1 ? l.text.slice(0, Math.ceil(l.text.length * Math.min(1, (t - l.at) / 0.4))) : l.text}</span>
            </div>
          )
        })}
        {t < T_END ? <span className="nt-caret" /> : <div className="nt-line ok"><span className="ts">20.00</span><span className="msg">✓ done · {LOG.length} events · {tokens.toLocaleString()} tokens</span></div>}
      </div>
    </section>
  )
}

// ---------------- 简报弹窗 ----------------

function BriefModal({ id, onClose }: { id: PersonId; onClose: () => void }) {
  const p = personById(id)
  const b = briefOf(id)
  const quiet = isQuiet(id)
  const rows = p.host ? ITEMS.map(i => i.id) : b.entries.map(e => e.item)
  const [sel, setSel] = useState(0)
  return (
    <>
      <motion.div className="nt-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="nt-modal nt-card" initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
        <div className="nt-modal-head">
          <Face p={p} size={34} muted={quiet} />
          <div><b>{p.name}</b><small>{p.role} · {quiet ? '不打扰' : `${countOf(p.id)} 条 · 约 ${b.readSeconds}s`}</small></div>
        </div>
        <p className="nt-modal-headline">{b.headline}</p>
        <div className="nt-modal-list">
          {quiet && <div className="nt-quiet"><BellOff size={16} /> 没有必读内容，上线日期变化已进日报。</div>}
          {rows.map((iid, i) => {
            const it = itemById(iid)
            const e = b.entries.find(x => x.item === iid)
            const c = ITEM_TYPES[it.type]
            return (
              <div key={iid} className={`nt-entry ${i === sel ? 'on' : ''}`} style={{ '--c': c.color } as CSSProperties} onMouseEnter={() => setSel(i)}>
                <div className="nt-entry-top"><span className="nt-type">{c.label}</span><b>{it.title}</b>{e && e.reasons.map(r => <span key={r} className={`nt-r ${r === 'R4' ? 'r4' : ''}`}>{REASON_SHORT[r]}</span>)}</div>
                {e && <p>{e.forYou}</p>}
                {e && i === sel && <small className="nt-why">为什么发给你：{e.why}（{e.reasons.map(r => REASONS[r]).join('、')}）</small>}
                {i === sel && <small className="nt-why">“{it.quote}” — {personById(it.speaker).name} {it.at}</small>}
              </div>
            )
          })}
        </div>
        <footer className="nt-modal-foot">
          <span><ModelIcon icon="send" size={13} /> 飞书卡片 · H5</span>
          <span className="nt-sep" />
          <span>确认 <kbd><CornerDownLeft size={11} /></kbd></span>
          <span>追问 <kbd>Ctrl</kbd><kbd>R</kbd></span>
          <span>关闭 <kbd>esc</kbd></span>
        </footer>
      </motion.div>
    </>
  )
}

function Face({ p, size, muted }: { p?: Person; size: number; muted?: boolean }) {
  return (
    <span className="nt-face" style={{ width: size, height: size, fontSize: size * 0.46, background: muted ? '#1C1D21' : p ? `${p.fg}` : '#26272B', color: muted ? '#5C5F66' : p ? p.bg : '#8A8F98' }}>
      {p?.short ?? '?'}
    </span>
  )
}
