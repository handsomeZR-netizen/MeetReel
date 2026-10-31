// 点阵屏：一格格的小方点，像 LED 屏。
// DotLoader：加载时一道光斜着扫过小方阵；DotText：把字（中文也行）采样成点阵，粒子从四处汇拢拼出字；
// useDotCanvas：给别的点阵画面（知识库向量空间）用的画布循环。
import { useEffect, useMemo, useRef, type CSSProperties, type DependencyList } from 'react'
import { cn } from '@/lib/utils'

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 稳定的伪随机 */
export const hash = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x) }
export const easeOut = (p: number) => 1 - (1 - p) ** 3

type Draw = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number, fg: string) => void

/** 画布循环：按设备像素比铺满画布元素，滚出屏幕就停；减少动态效果时只画最终那一帧。deps 变了时间从 0 重新算 */
export function useDotCanvas(draw: Draw, deps: DependencyList) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const still = reducedMotion()
    const start = performance.now()
    let w = 0, h = 0, fg = '#000', raf = 0, visible = true
    const size = () => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width; h = r.height
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fg = getComputedStyle(cv).color
    }
    const frame = (now: number) => {
      ctx.clearRect(0, 0, w, h)
      drawRef.current(ctx, still ? 1e5 : (now - start) / 1000, w, h, fg)
      if (!still && visible) raf = requestAnimationFrame(frame)
    }
    const ro = new ResizeObserver(() => { size(); if (still || !visible) frame(performance.now()) })
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting === visible) return
      visible = e.isIntersecting
      cancelAnimationFrame(raf)
      if (visible && !still) raf = requestAnimationFrame(frame)
    })
    size()
    ro.observe(cv)
    io.observe(cv)
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}

/** 带圆角的小方点；一次 fill 画一批时先 beginPath 再循环调用 */
export const square = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  if (ctx.roundRect) ctx.roundRect(x, y, s, s, s * 0.22)
  else ctx.rect(x, y, s, s)
}

/** 加载中：小方阵里一道光斜着扫过去，颜色跟着文字颜色走 */
export function DotLoader({ cols = 4, rows = 3, dot = 3, gap = 1.5, className, style }: { cols?: number; rows?: number; dot?: number; gap?: number; className?: string; style?: CSSProperties }) {
  const pitch = dot + gap
  const ref = useDotCanvas((ctx, t, _w, _h, fg) => {
    ctx.fillStyle = fg
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = Math.max(0, Math.sin(t * 5.2 - (x * 0.75 + y * 0.55))) ** 3
      ctx.globalAlpha = 0.14 + 0.86 * i
      ctx.beginPath()
      square(ctx, x * pitch, y * pitch, dot)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [cols, rows, dot, gap])
  return <canvas ref={ref} aria-hidden className={cn('inline-block flex-none align-middle', className)} style={{ width: cols * pitch - gap, height: rows * pitch - gap, ...style }} />
}

// ---------------- 字的点阵 ----------------

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))

/** 在离屏画布上逐字写（字间空一格），按格子平均覆盖率采样出亮点 */
function sampleText(text: string, rows: number) {
  const S = 4
  const font = `700 ${rows * S}px "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans SC", sans-serif`
  const c = document.createElement('canvas')
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.font = font
  const chars = [...text]
  const adv = chars.map(ch => Math.ceil(g.measureText(ch).width / S) + 1)
  const cols = adv.reduce((a, b) => a + b, 0) - 1
  c.width = cols * S; c.height = rows * S
  g.font = font
  g.textBaseline = 'middle'
  let x = 0
  chars.forEach((ch, i) => { g.fillText(ch, x * S, (rows * S) / 2 + S * 0.6); x += adv[i] })
  const data = g.getImageData(0, 0, c.width, c.height).data
  const on: { x: number; y: number }[] = []
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let a = 0
    for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) a += data[((cy * S + yy) * c.width + cx * S + xx) * 4 + 3]
    if (a / (S * S) > 255 * 0.42) on.push({ x: cx, y: cy })
  }
  return { cols, on }
}

/**
 * 点阵字：粒子从附近散落的位置汇拢，从左往右一列列落位；拼好之后每隔几秒一道高光扫过。
 * 底下每一格都有一个很淡的方点，看得出是一块屏。
 */
export function DotText({ text, rows = 16, pitch = 6, from = '#5F3E54', to = '#A48FA2', className }: { text: string; rows?: number; pitch?: number; from?: string; to?: string; className?: string }) {
  const { cols, on } = useMemo(() => sampleText(text, rows), [text, rows])
  const a = hex(from), b = hex(to)
  const ref = useDotCanvas((ctx, t, w) => {
    const p = w / cols, s = p * 0.74, o = (p - s) / 2
    ctx.fillStyle = from
    ctx.globalAlpha = 0.07
    ctx.beginPath()
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) square(ctx, x * p + o, y * p + o, s)
    ctx.fill()
    const sweep = t > 1.8 ? (((t - 1.8) % 5.5) / 5.5) * (cols + 24) - 12 : -99
    on.forEach((d, i) => {
      const delay = (d.x / cols) * 0.9 + hash(i) * 0.35
      const k = Math.min(1, Math.max(0, (t - delay) / 0.75))
      if (k <= 0) return
      const e = easeOut(k)
      const sx = d.x + (hash(i + 0.5) - 0.5) * 26, sy = d.y + (hash(i + 0.25) - 0.5) * 18
      const x = sx + (d.x - sx) * e, y = sy + (d.y - sy) * e
      const m = d.x / cols, glow = Math.max(0, 1 - Math.abs(d.x - sweep) / 5) * 0.55
      const rgb = a.map((v, j) => Math.round((v + (b[j] - v) * m) * (1 - glow) + 255 * glow))
      ctx.globalAlpha = e
      ctx.fillStyle = `rgb(${rgb})`
      ctx.beginPath()
      square(ctx, x * p + o, y * p + o, s)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }, [cols, on, from, to])
  return <canvas ref={ref} aria-hidden className={cn('block max-w-full', className)} style={{ width: cols * pitch, aspectRatio: `${cols} / ${rows}` }} />
}
