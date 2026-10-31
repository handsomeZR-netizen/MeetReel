// 多智能体编排时间轴（深色卡片，参考 archive/references 里的多 Agent 协作时间轴视频）。
// 泳道 = 智能体；浅块 = 工具调用，深块 = 思考，斜纹 = 等待，彩线 = 调度官的派发与回收。
import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Pause, Play } from 'lucide'
import { CornerDownRight, RefreshCw, RotateCcw, X } from 'lucide-react'
import type { EngineId } from '@/data/model'
import {
  AGENTS, AXIS_MAX, JOBS, LOG, RUN_MEETING, SPANS, T_END, TOTAL_TOKENS,
  agentById, agentModel, clamp01, costText, tokensAt, type SpanKind,
} from '@/data/run'
import type { Clock } from '@/lib/useClock'
import { ModelIcon } from '@/components/common/bits'

const LANE_H = 50
const TOP = 6
const BAR_H = 22
const AXIS_H = 34
const R = 8

const KIND_LABEL: Record<SpanKind, string> = { think: '思考', tool: '工具调用', wait: '等待', fail: '失败', retry: '重试' }

const LANE = Object.fromEntries(AGENTS.map((a, i) => [a.id, i])) as Record<string, number>
const laneY = (i: number) => TOP + i * LANE_H + LANE_H / 2
const HEIGHT = TOP + AGENTS.length * LANE_H + AXIS_H

interface Props {
  clock: Clock
  engine: EngineId
  /** 等主持人确认投递时显示 */
  gated?: boolean
}

export function AgentTimeline({ clock, engine, gated }: Props) {
  const { t } = clock
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  const dragging = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const span = Math.max(1, w - 12)
  const x = (s: number) => 4 + (s / AXIS_MAX) * span
  const done = t >= T_END
  const tokens = done ? TOTAL_TOKENS : tokensAt(t)
  const active = new Set(SPANS.filter(g => g.kind !== 'wait' && t >= g.start && t < g.end).map(g => g.agent))
  const last = [...LOG].reverse().find(e => e.at <= t)
  const seekFrom = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    clock.seek(((e.clientX - r.left - 4) / span) * AXIS_MAX)
  }
  const hovered = hover != null ? SPANS[hover] : null
  const status = done ? '已完成' : gated ? '等待确认' : clock.playing ? '运行中' : t > 0 ? '已暂停' : '就绪'

  return (
    <section className="tld">
      <div className="tld-title">{RUN_MEETING.title} · 多智能体编排</div>
      <div className="tld-sub">
        {status} · <b>{Math.min(t, T_END).toFixed(1)}s</b> · <b>{tokens.toLocaleString()}</b> tokens · {costText(tokens, engine)}
      </div>

      <div className="tld-ticker">
        <span>AGENT LOG</span>
        <div className="tld-ticker-line">
          <AnimatePresence mode="popLayout" initial={false}>
            {last && (
              <motion.div key={last.at} className="tld-ticker-msg" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
                <i style={{ background: agentById(last.agent).bright }} />
                <b>{agentById(last.agent).name}</b>
                <span className="truncate">{last.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="tld-body">
        <ul className="tld-lanes" style={{ paddingTop: TOP }}>
          {AGENTS.map(a => {
            const m = agentModel(a.id, engine)
            return (
              <li key={a.id} style={{ height: LANE_H, '--c': a.bright } as CSSProperties} className={active.has(a.id) ? 'on' : ''} title={a.duty}>
                <span className="dot" style={{ background: a.bright }} />
                <div className="min-w-0">
                  <div className="tld-name">{a.name}</div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={m.label} className="tld-model" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                      <ModelIcon icon={m.icon} size={13} />
                      <span className="truncate">{m.label}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="tld-chart" ref={ref}>
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
              <pattern id="tld-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill="#1F1F1F" />
                <line x1="0" y1="0" x2="0" y2="7" stroke="#3A3A3A" strokeWidth="2.4" />
              </pattern>
              <linearGradient id="tld-fade" x1="0" x2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="1" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 5, 10, 15, 20].map(s => (
              <g key={s}>
                <line x1={x(s)} x2={x(s)} y1={0} y2={HEIGHT - AXIS_H} className="tld-grid" />
                <text x={x(s)} y={HEIGHT - 8} className="tld-axis-label" textAnchor="middle">{s}s</text>
              </g>
            ))}

            {/* 派发与回收 */}
            {JOBS.map(job => {
              if (t < job.dispatch) return null
              const a = agentById(job.agent)
              const segs = SPANS.filter(s => s.agent === job.agent)
              const yO = laneY(0) + BAR_H / 2
              const yL = laneY(LANE[job.agent])
              const xd = x(job.dispatch)
              const x1 = Math.max(x(segs[0].start), xd + R)
              const x2 = x(segs[segs.length - 1].end)
              const xr = x(job.ret)
              const pd = clamp01((t - job.dispatch) / 0.4)
              const pr = clamp01((t - job.ret) / 0.4)
              return (
                <g key={job.agent} stroke={a.bright} fill="none" strokeWidth={1.5} strokeLinecap="round" opacity={0.9}>
                  <path d={`M ${xd} ${yO} V ${yL - R} Q ${xd} ${yL} ${xd + R} ${yL} H ${x1}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pd} />
                  <circle cx={xd} cy={yO} r={4} fill={a.bright} stroke="#151515" strokeWidth={2} />
                  {t >= job.ret && (
                    <>
                      <path d={`M ${x2} ${yL} H ${xr - R} Q ${xr} ${yL} ${xr} ${yL - R} V ${yO}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pr} opacity={0.6} />
                      {pr >= 1 && <circle cx={xr} cy={yO} r={4} fill={a.bright} stroke="#151515" strokeWidth={2} />}
                    </>
                  )}
                </g>
              )
            })}

            {/* 工作块 */}
            {SPANS.map((g, k) => {
              if (t <= g.start) return null
              const a = agentById(g.agent)
              const x0 = x(g.start) + 1.5
              const x1 = x(Math.min(g.end, t)) - 1.5
              const bw = x1 - x0
              if (bw < 0.5) return null
              const cy = laneY(LANE[g.agent])
              const y = cy - BAR_H / 2
              const live = t < g.end && g.kind !== 'wait'
              const dim = hover !== null && hover !== k
              const fill = g.kind === 'wait' ? 'url(#tld-hatch)' : g.kind === 'fail' ? '#3A1518' : g.kind === 'think' ? `color-mix(in srgb, ${a.bright} 32%, #151515)` : a.bright
              return (
                <g key={k} className="tld-seg" style={{ opacity: dim ? 0.35 : 1 }} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}>
                  <rect x={x0} y={y} width={bw} height={BAR_H} rx={7} fill={fill} stroke={g.kind === 'fail' ? '#F87171' : g.kind === 'wait' ? '#333' : 'none'} strokeWidth={1.2} />
                  {live && <rect x={Math.max(x0, x1 - 18)} y={y} width={Math.min(18, bw)} height={BAR_H} rx={7} fill="url(#tld-fade)" opacity={0.25} />}
                  {g.kind === 'fail' && bw > 16 && (
                    <g transform={`translate(${x0 + bw / 2 - 7}, ${cy - 7})`}>
                      <circle cx={7} cy={7} r={7} fill="none" stroke="#F87171" strokeWidth={1.4} />
                      <X x={3} y={3} size={8} color="#F87171" strokeWidth={3} />
                    </g>
                  )}
                  {g.kind === 'retry' && bw > 16 && <RefreshCw x={x0 + bw / 2 - 6} y={cy - 6} size={12} color="#151515" strokeWidth={2.6} />}
                </g>
              )
            })}

            {/* 播放头 */}
            <line x1={x(Math.min(t, T_END))} x2={x(Math.min(t, T_END))} y1={0} y2={HEIGHT - AXIS_H} className="tld-play" />
            <circle cx={x(Math.min(t, T_END))} cy={HEIGHT - AXIS_H} r={6} className="tld-play-dot" />
          </svg>

          <AnimatePresence>
            {hovered && (
              <motion.div
                key={hover}
                className="tld-tip"
                style={{ left: Math.max(145, Math.min(w - 145, x((hovered.start + Math.min(hovered.end, t)) / 2))), top: laneY(LANE[hovered.agent]) - BAR_H / 2 - 10 }}
                initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
              >
                <div className="h">
                  <i className="size-2 rounded-full" style={{ background: agentById(hovered.agent).bright }} />
                  <b>{agentById(hovered.agent).name}</b>
                  <ModelIcon icon={agentModel(hovered.agent, engine).icon} size={12} />
                  <span>{agentModel(hovered.agent, engine).label}</span>
                </div>
                <div className="t">{hovered.title}</div>
                <div className="m">
                  {KIND_LABEL[hovered.kind]} · {(hovered.end - hovered.start).toFixed(1)}s
                  {hovered.tokens ? ` · ${hovered.tokens.toLocaleString()} tokens` : hovered.kind === 'tool' ? ' · 规则 / 代码' : ''}
                </div>
                {hovered.note && <div className="n"><CornerDownRight size={13} className="mt-0.5 flex-none" /> {hovered.note}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="tld-foot">
        <div className="tld-ctl">
          <button className="tld-btn" onClick={clock.toggle} aria-label={clock.playing ? '暂停' : '播放'}>
            <MorphIcon icon={clock.playing ? Pause : Play} size={16} strokeWidth={2.4} />
          </button>
          <button className="tld-icon" onClick={clock.restart} aria-label="重放"><RotateCcw size={17} /></button>
          <div className="tld-speed">
            {[1, 2].map(s => (
              <button key={s} className={clock.speed === s ? 'on' : ''} onClick={() => clock.setSpeed(s)}>
                {clock.speed === s && <motion.i layoutId="tld-speed" className="pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span>{s}x</span>
              </button>
            ))}
          </div>
        </div>
        <div className="tld-legend">
          <span><i className="lg" style={{ background: '#3B3B4A' }} />思考</span>
          <span><i className="lg" style={{ background: '#C7D2FE' }} />工具调用</span>
          <span><i className="lg" style={{ background: 'repeating-linear-gradient(45deg,#1F1F1F 0 2px,#3A3A3A 2px 4px)', border: '1px solid #333' }} />等待</span>
          <span><CornerDownRight size={14} />交接</span>
          <span><i className="grid size-[15px] place-items-center rounded-full border border-[#F87171] text-[#F87171]"><X size={9} strokeWidth={3} /></i>失败</span>
        </div>
      </div>
    </section>
  )
}
