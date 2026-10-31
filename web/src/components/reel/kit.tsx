// 片子的公共零件：按时间 t 插值的小工具、1280×720 舞台、播放时钟。
// 片子里不用 motion 的弹簧动画：那是按真实时钟走的，导出成视频时会错帧；这里一切都是 t 的函数。
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import rough from 'roughjs'
import type { Options } from 'roughjs/bin/core'
import { ACT, DURATION, type ActName } from './spec'

export const W = 1280
export const H = 720

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** t 在 [a, b] 里走到了哪（0–1） */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / Math.max(1e-6, b - a))
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p
export const ease = {
  out: (p: number) => 1 - (1 - p) ** 3,
  in: (p: number) => p ** 3,
  inOut: (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  back: (p: number) => { const c = 1.70158; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2 },
}
/** 在 [a, b] 里先淡入、再淡出 */
export const life = (t: number, a: number, b: number, fadeIn = 0.5, fadeOut = 0.4) =>
  Math.min(ease.out(prog(t, a, a + fadeIn)), 1 - ease.in(prog(t, b - fadeOut, b)))
export const actLife = (t: number, act: ActName, fadeIn = 0.5, fadeOut = 0.45) => life(t, ACT[act][0], ACT[act][1], fadeIn, fadeOut)
export const actProg = (t: number, act: ActName) => prog(t, ACT[act][0], ACT[act][1])
export const inAct = (t: number, act: ActName) => t >= ACT[act][0] - 0.01 && t < ACT[act][1] + 0.01

/** 稳定的伪随机 */
export const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x) }

/** 数字从 from 走到 to */
export const count = (t: number, a: number, b: number, from: number, to: number) => Math.round(lerp(from, to, ease.inOut(prog(t, a, b))))

/** 一层：绝对定位 + 透明度为 0 时不画 */
export function Layer({ o = 1, style, children, className }: { o?: number; style?: CSSProperties; children?: ReactNode; className?: string }) {
  if (o <= 0.001) return null
  return <div className={className} style={{ position: 'absolute', inset: 0, opacity: o, ...style }}>{children}</div>
}

// ---------------- 手绘线：rough.js 生成路径，用 t 控制画到哪 ----------------

const gen = rough.generator()
type RShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'ellipse'; x: number; y: number; w: number; h: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'path'; d: string }

export function RoughT({ shape, opts, p = 1, seed = 1 }: { shape: RShape; opts?: Options; p?: number; seed?: number }) {
  const key = JSON.stringify([shape, opts ?? null, seed])
  const paths = useMemo(() => {
    const o: Options = { roughness: 1.3, bowing: 1.1, strokeWidth: 3, seed, ...opts }
    const d = shape.kind === 'rect' ? gen.rectangle(shape.x, shape.y, shape.w, shape.h, o)
      : shape.kind === 'ellipse' ? gen.ellipse(shape.x, shape.y, shape.w, shape.h, o)
      : shape.kind === 'line' ? gen.line(shape.x1, shape.y1, shape.x2, shape.y2, o)
      : gen.path(shape.d, o)
    return gen.toPaths(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (p <= 0) return null
  return (
    <>
      {paths.map((x, i) => (
        <path key={i} d={x.d} stroke={x.stroke} strokeWidth={x.strokeWidth} fill={x.fill ?? 'none'} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={x.fill && x.fill !== 'none' ? undefined : 1} strokeDashoffset={x.fill && x.fill !== 'none' ? undefined : 1 - clamp(p)}
          opacity={x.fill && x.fill !== 'none' ? clamp(p) : 1} />
      ))}
    </>
  )
}

// ---------------- 舞台：按 1280×720 画，按容器宽度缩放 ----------------

export function Stage({ children, background, className, onClick }: { children: ReactNode; background?: string; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [s, setS] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => setS(el.getBoundingClientRect().width / W)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} onClick={onClick} style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', background, contain: 'layout paint' }}>
      {s > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------- 播放时钟 ----------------

export interface ReelClock { t: number; playing: boolean; toggle: () => void; seek: (t: number) => void; play: () => void; pause: () => void }

/** start：从某一刻开始并停在那里（分享某一帧用） */
export function useReelClock({ autoPlay = true, loop = false, start }: { autoPlay?: boolean; loop?: boolean; start?: number } = {}): ReelClock {
  const [t, setT] = useState(start ?? 0)
  const [playing, setPlaying] = useState(autoPlay && start == null)
  const tr = useRef(start ?? 0)
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      let nt = tr.current + dt
      if (nt >= DURATION) {
        if (loop) nt = 0
        else { tr.current = DURATION; setT(DURATION); setPlaying(false); return }
      }
      tr.current = nt
      setT(nt)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, loop])
  const seek = useCallback((v: number) => { tr.current = clamp(v, 0, DURATION); setT(tr.current) }, [])
  const toggle = useCallback(() => {
    if (tr.current >= DURATION - 0.01) seek(0)
    setPlaying(p => !p)
  }, [seek])
  const play = useCallback(() => { if (tr.current >= DURATION - 0.01) seek(0); setPlaying(true) }, [seek])
  const pause = useCallback(() => setPlaying(false), [])
  return { t, playing, toggle, seek, play, pause }
}
