// rough.js 手绘图形：生成路径后用 motion.path 画出来，可做“一笔画出”的入场
import { memo, useMemo } from 'react'
import { motion } from 'motion/react'
import rough from 'roughjs'
import type { Options } from 'roughjs/bin/core'

const gen = rough.generator()

export type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'ellipse'; x: number; y: number; w: number; h: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'path'; d: string }

function build(shape: Shape, opts: Options) {
  switch (shape.kind) {
    case 'rect': return gen.rectangle(shape.x, shape.y, shape.w, shape.h, opts)
    case 'ellipse': return gen.ellipse(shape.x, shape.y, shape.w, shape.h, opts)
    case 'line': return gen.line(shape.x1, shape.y1, shape.x2, shape.y2, opts)
    case 'path': return gen.path(shape.d, opts)
  }
}

/** 没给 seed 时按形状算一个，保证每次渲染形状一样（不然每帧都会抖） */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) % 2 ** 31 || 1
}

interface Props {
  shape: Shape
  opts?: Options
  /** 画出来的时长（秒）；0 表示直接出现 */
  draw?: number
  delay?: number
  className?: string
}

function RoughImpl({ shape, opts, draw = 0.5, delay = 0, className }: Props) {
  const key = JSON.stringify([shape, opts ?? null])
  const paths = useMemo(
    () => gen.toPaths(build(shape, { roughness: 1.4, bowing: 1.2, strokeWidth: 1.6, seed: hash(key), ...opts })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return (
    <g className={className}>
      {paths.map((p, i) => (
        <motion.path
          key={i}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill={p.fill ?? 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={draw ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { duration: draw, delay, ease: 'easeInOut' }, opacity: { duration: 0.01, delay } }}
        />
      ))}
    </g>
  )
}

/** 一个手绘图形；opts.seed 变了就是“线条抖动” */
export const Rough = memo(
  RoughImpl,
  (a, b) => a.draw === b.draw && a.delay === b.delay && a.className === b.className && JSON.stringify([a.shape, a.opts ?? null]) === JSON.stringify([b.shape, b.opts ?? null]),
)

/** 手绘箭头：一条曲线 + 两撇箭头。head = [x, y, 方向弧度] */
export function RoughArrow({ d, head, opts, draw = 0.5, delay = 0 }: { d: string; head: [number, number, number]; opts?: Options; draw?: number; delay?: number }) {
  const [hx, hy, ang] = head
  const a1 = ang + Math.PI * 0.82
  const a2 = ang - Math.PI * 0.82
  const L = 11
  const tip = `M${(hx + L * Math.cos(a1)).toFixed(1)},${(hy + L * Math.sin(a1)).toFixed(1)} L${hx},${hy} L${(hx + L * Math.cos(a2)).toFixed(1)},${(hy + L * Math.sin(a2)).toFixed(1)}`
  const o = { roughness: 0.9, ...opts }
  return (
    <g>
      <Rough shape={{ kind: 'path', d }} opts={o} draw={draw} delay={delay} />
      <Rough shape={{ kind: 'path', d: tip }} opts={o} draw={draw * 0.4} delay={delay + draw * 0.9} />
    </g>
  )
}
