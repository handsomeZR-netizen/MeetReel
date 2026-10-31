import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, CornerDownRight, Pause, Play, RefreshCw, RotateCcw, X } from 'lucide-react'
import {
  AGENTS, AXIS_MAX, ENGINES, JOBS, LOG, SEGS, T_END,
  agentById, agentModel, clamp01, type EngineId, type SegKind,
} from '../data/demo'
import type { Clock } from '../lib/useClock'
import { ModelIcon } from './ModelIcon'

const LANE_H = 40
const TOP = 12
const BAR_H = 18
const AXIS_H = 28
const PAD_L = 6
const PAD_R = 16
const R = 7

const KIND_LABEL: Record<SegKind, string> = {
  think: '思考', tool: '工具调用', wait: '等待', fail: '失败', retry: '重试',
}

const LANE = Object.fromEntries(AGENTS.map((a, i) => [a.id, i])) as Record<string, number>
const laneY = (i: number) => TOP + i * LANE_H + LANE_H / 2
const HEIGHT = TOP + AGENTS.length * LANE_H + AXIS_H
const TOTAL_TOKENS = SEGS.reduce((s, g) => s + (g.tokens ?? 0), 0)

interface Props {
  clock: Clock
  engine: EngineId
  onEngine: (e: EngineId) => void
}

export function AgentTimeline({ clock, engine, onEngine }: Props) {
  const { t } = clock
  const chartRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(760)
  const [hover, setHover] = useState<number | null>(null)
  const dragging = useRef(false)

  useLayoutEffect(() => {
    const el = chartRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const span = Math.max(1, w - PAD_L - PAD_R)
  const x = (s: number) => PAD_L + (s / AXIS_MAX) * span
  const done = t >= T_END

  const tokens = useMemo(
    () => Math.round(SEGS.reduce((s, g) => s + (g.tokens ?? 0) * clamp01((t - g.start) / (g.end - g.start)), 0)),
    [t],
  )
  const eng = ENGINES.find(e => e.id === engine)!
  const cost = (tokens / 1e6) * eng.yuanPerM
  const costText = eng.yuanPerM === 0 ? '自有算力' : `≈ ¥${cost.toFixed(cost < 0.1 ? 3 : 2)}`

  const activeAgents = new Set(SEGS.filter(g => g.kind !== 'wait' && t >= g.start && t < g.end).map(g => g.agent))
  const lastLog = [...LOG].reverse().find(e => e.at <= t)

  const seekFrom = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    clock.seek(((e.clientX - rect.left - PAD_L) / span) * AXIS_MAX)
  }

  const hovered = hover !== null ? SEGS[hover] : null

  return (
    <section className="card timeline">
      <header className="tl-head">
        <div>
          <h2 className="card-title">多智能体编排</h2>
          <div className="tl-stats">
            {done ? (
              <span className="tl-done"><CircleCheck size={15} /> 完成</span>
            ) : (
              <span className={clock.playing ? 'tl-running' : ''}>{clock.playing ? '运行中' : t > 0 ? '已暂停' : '就绪'}</span>
            )}
            <span>· {Math.min(t, T_END).toFixed(1)}s</span>
            <span>· {(done ? TOTAL_TOKENS : tokens).toLocaleString()} tokens</span>
            <span>· {costText}</span>
            {done && <span>· 8 个智能体 · 10 条账本 · 7 份简报</span>}
          </div>
        </div>
        <div className="engine-switch" role="tablist" aria-label="运行模型">
          {ENGINES.map(e => (
            <button
              key={e.id}
              role="tab"
              aria-selected={engine === e.id}
              className={engine === e.id ? 'on' : ''}
              onClick={() => onEngine(e.id)}
              title={`${e.label} · ${e.sub}`}
            >
              {engine === e.id && <motion.span layoutId="engine-pill" className="engine-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className="engine-in">
                <ModelIcon icon={e.icon} size={15} />
                <span>{e.label}</span>
                <small>{e.sub}</small>
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="ticker">
        <span className="ticker-label">Agent 工作台</span>
        <div className="ticker-line">
          <AnimatePresence mode="popLayout" initial={false}>
            {lastLog && (
              <motion.div
                key={lastLog.at}
                className="ticker-msg"
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <i style={{ background: agentById(lastLog.agent).color }} />
                <b>{agentById(lastLog.agent).name}</b>
                <span>{lastLog.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="tl-body">
        <ul className="tl-labels" style={{ paddingTop: TOP }}>
          {AGENTS.map(a => {
            const m = agentModel(a.id, engine)
            const on = activeAgents.has(a.id)
            return (
              <li key={a.id} style={{ height: LANE_H }} className={on ? 'on' : ''} title={a.duty}>
                <span className="lane-dot" style={{ background: a.color }} />
                <div>
                  <div className="lane-name">{a.name}</div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={m.label}
                      className="lane-model"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                    >
                      <ModelIcon icon={m.icon} size={12} />
                      <span>{m.label}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="tl-chart" ref={chartRef}>
          <svg
            width={w}
            height={HEIGHT}
            onPointerDown={e => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              clock.pause()
              seekFrom(e)
            }}
            onPointerMove={e => dragging.current && seekFrom(e)}
            onPointerUp={() => { dragging.current = false }}
          >
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#F4F4F2" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#D6D6D1" strokeWidth="2" />
              </pattern>
            </defs>

            {[0, 5, 10, 15, 20].map(s => (
              <g key={s}>
                <line x1={x(s)} x2={x(s)} y1={TOP - 4} y2={HEIGHT - AXIS_H} className="grid" />
                <text x={x(s)} y={HEIGHT - 8} className="axis-label" textAnchor="middle">{s}s</text>
              </g>
            ))}
            <line x1={PAD_L} x2={w - PAD_R} y1={HEIGHT - AXIS_H} y2={HEIGHT - AXIS_H} className="axis" />

            {/* 交接线：调度官 → 智能体 → 调度官 */}
            {JOBS.map(job => {
              if (t < job.dispatch) return null
              const a = agentById(job.agent)
              const segs = SEGS.filter(s => s.agent === job.agent)
              const yO = laneY(0) + BAR_H / 2
              const yL = laneY(LANE[job.agent])
              const xd = x(job.dispatch)
              const x1 = Math.max(x(segs[0].start), xd + R)
              const x2 = x(segs[segs.length - 1].end)
              const xr = x(job.ret)
              const pd = clamp01((t - job.dispatch) / 0.4)
              const pr = clamp01((t - job.ret) / 0.4)
              return (
                <g key={job.agent} stroke={a.color} fill="none">
                  <path
                    d={`M ${xd} ${yO} V ${yL - R} Q ${xd} ${yL} ${xd + R} ${yL} H ${x1}`}
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - pd}
                    className="handoff"
                  />
                  <circle cx={xd} cy={yO} r={3.5} fill={a.color} stroke="#fff" strokeWidth={1.5} />
                  {t >= job.ret && (
                    <>
                      <path
                        d={`M ${x2} ${yL} H ${xr - R} Q ${xr} ${yL} ${xr} ${yL - R} V ${yO}`}
                        pathLength={1}
                        strokeDasharray="1 1"
                        strokeDashoffset={1 - pr}
                        className="handoff"
                      />
                      {pr >= 1 && <circle cx={xr} cy={yO} r={3.5} fill={a.color} stroke="#fff" strokeWidth={1.5} />}
                    </>
                  )}
                </g>
              )
            })}

            {/* 工作块 */}
            {SEGS.map((g, k) => {
              if (t <= g.start) return null
              const a = agentById(g.agent)
              const x0 = x(g.start) + 1
              const x1 = x(Math.min(g.end, t)) - 1
              const bw = x1 - x0
              if (bw < 0.5) return null
              const cy = laneY(LANE[g.agent])
              const y = cy - BAR_H / 2
              const live = t < g.end && g.kind !== 'wait'
              const dim = hover !== null && hover !== k
              const fill =
                g.kind === 'wait' ? 'url(#hatch)'
                  : g.kind === 'think' ? a.color
                    : g.kind === 'fail' ? '#FFF1F2'
                      : a.color
              return (
                <g
                  key={k}
                  className="seg"
                  style={{ opacity: dim ? 0.45 : 1 }}
                  onMouseEnter={() => setHover(k)}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect
                    x={x0} y={y} width={bw} height={BAR_H} rx={5}
                    fill={fill}
                    fillOpacity={g.kind === 'think' ? 0.22 : 1}
                    stroke={g.kind === 'fail' ? '#F43F5E' : g.kind === 'wait' ? '#E2E2DD' : 'none'}
                    strokeWidth={1}
                  />
                  {g.kind === 'fail' && bw > 14 && <X x={x0 + bw / 2 - 6} y={cy - 6} size={12} color="#E11D48" strokeWidth={2.5} />}
                  {g.kind === 'retry' && bw > 14 && <RefreshCw x={x0 + bw / 2 - 5.5} y={cy - 5.5} size={11} color="#fff" strokeWidth={2.5} />}
                  {live && <circle cx={x1} cy={cy} r={4} fill={a.color} className="seg-head" />}
                </g>
              )
            })}

            {/* 播放头 */}
            <line x1={x(Math.min(t, T_END))} x2={x(Math.min(t, T_END))} y1={TOP - 6} y2={HEIGHT - AXIS_H} className="playhead" />
            <circle cx={x(Math.min(t, T_END))} cy={HEIGHT - AXIS_H} r={5} className="playhead-dot" />
          </svg>

          <AnimatePresence>
            {hovered && (
              <motion.div
                key={hover}
                className="tl-tip"
                style={{
                  left: Math.max(150, Math.min(w - 150, x((hovered.start + Math.min(hovered.end, t)) / 2))),
                  top: laneY(LANE[hovered.agent]) - BAR_H / 2 - 10,
                }}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
              >
                <div className="tip-head">
                  <i style={{ background: agentById(hovered.agent).color }} />
                  <b>{agentById(hovered.agent).name}</b>
                  <ModelIcon icon={agentModel(hovered.agent, engine).icon} size={12} />
                  <span>{agentModel(hovered.agent, engine).label}</span>
                </div>
                <div className="tip-title">{hovered.title}</div>
                <div className="tip-meta">
                  {KIND_LABEL[hovered.kind]} · {(hovered.end - hovered.start).toFixed(1)}s
                  {hovered.tokens ? ` · ${hovered.tokens.toLocaleString()} tokens` : hovered.kind === 'tool' ? ' · 规则 / 代码' : ''}
                </div>
                {hovered.note && (
                  <div className="tip-note"><CornerDownRight size={13} /> {hovered.note}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="tl-foot">
        <div className="tl-controls">
          <button className="round-btn" onClick={clock.toggle} aria-label={clock.playing ? '暂停' : '播放'}>
            {clock.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>
          <button className="icon-btn" onClick={clock.restart} aria-label="重播"><RotateCcw size={16} /></button>
          <div className="speed">
            {[1, 2].map(s => (
              <button key={s} className={clock.speed === s ? 'on' : ''} onClick={() => clock.setSpeed(s)}>{s}x</button>
            ))}
          </div>
        </div>
        <div className="legend">
          <span><i className="lg lg-think" />思考</span>
          <span><i className="lg lg-tool" />工具调用</span>
          <span><i className="lg lg-wait" />等待</span>
          <span><CornerDownRight size={13} />交接</span>
          <span><i className="lg lg-fail"><X size={9} strokeWidth={3} /></i>失败</span>
        </div>
      </footer>
    </section>
  )
}
