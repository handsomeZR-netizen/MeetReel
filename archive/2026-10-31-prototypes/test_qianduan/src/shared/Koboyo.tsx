import type { CSSProperties } from 'react'
import { KOBOYO, type KoboyoName } from './koboyoData'

/** Koboyo 手绘图标：填充色跟随 currentColor，宽度按 size，高度按原图比例 */
export function Kb({ name, size = 24, className, style }: { name: KoboyoName; size?: number; className?: string; style?: CSSProperties }) {
  const { vb, d } = KOBOYO[name]
  const [, , w, h] = vb.split(' ').map(Number)
  return (
    <svg
      className={className}
      style={style}
      viewBox={vb}
      width={size}
      height={(size * h) / w}
      fill="currentColor"
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}
