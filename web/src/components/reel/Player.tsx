// 播放器：同一份分镜按风格换皮；左下角一枚小标签写“谁的片子 · 什么风格”，底下是按五幕分段的进度条。
import { useRef } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACT, ACT_LABEL, DURATION, REEL_STYLES, tc, type ActName, type ReelSpec, type ReelStyle } from './spec'
import { Stage, clamp, type ReelClock } from './kit'
import { AppleReel } from './AppleReel'
import { SketchReel } from './SketchReel'
import { PopReel } from './PopReel'
import { IsoReel } from './IsoReel'

const SKINS: Record<ReelStyle, (p: { s: ReelSpec; t: number }) => React.ReactNode> = {
  apple: AppleReel, sketch: SketchReel, pop: PopReel, iso: IsoReel,
}

export function ReelFrame({ spec, style, t }: { spec: ReelSpec; style: ReelStyle; t: number }) {
  const Skin = SKINS[style]
  return <Skin s={spec} t={t} />
}

export function ReelPlayer({ spec, style, clock, controls = true, className }: { spec: ReelSpec; style: ReelStyle; clock: ReelClock; controls?: boolean; className?: string }) {
  const label = REEL_STYLES.find(x => x.id === style)!.label
  return (
    <div className={cn('overflow-hidden rounded-2xl bg-black shadow-[0_24px_50px_-30px_rgb(24_16_22/70%)]', className)}>
      <div className="relative">
        <Stage onClick={clock.toggle} className="cursor-pointer select-none">
          <ReelFrame spec={spec} style={style} t={clock.t} />
        </Stage>
        <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-[12px] text-white/90 backdrop-blur-md">
          <span className="text-[13px]">◐</span>{spec.person.name}<span className="h-3 w-px bg-white/30" />{label}
        </span>
        {!clock.playing && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-white/90 text-black shadow-xl">
              {clock.t >= DURATION - 0.01 ? <RotateCcw size={22} /> : <Play size={22} fill="currentColor" className="ml-1" />}
            </span>
          </span>
        )}
      </div>
      {controls && <Scrubber clock={clock} />}
    </div>
  )
}

/** 按五幕分段的进度条，点哪跳到哪 */
export function Scrubber({ clock, dark = true }: { clock: ReelClock; dark?: boolean }) {
  const bar = useRef<HTMLDivElement>(null)
  const seekAt = (x: number) => {
    const r = bar.current!.getBoundingClientRect()
    clock.seek(clamp((x - r.left) / r.width) * DURATION)
  }
  const acts = Object.keys(ACT) as ActName[]
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5', dark ? 'bg-[#111] text-white/80' : 'text-ink-2')}>
      <button className={cn('grid size-8 flex-none place-items-center rounded-full', dark ? 'bg-white/10 hover:bg-white/20' : 'sg-raised')} onClick={clock.toggle} aria-label={clock.playing ? '暂停' : '播放'}>
        {clock.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
      </button>
      <div
        ref={bar}
        className="relative flex min-w-0 flex-1 cursor-pointer gap-[3px] py-2"
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); seekAt(e.clientX) }}
        onPointerMove={e => { if (e.buttons) seekAt(e.clientX) }}
      >
        {acts.map(a => {
          const [s, z] = ACT[a]
          const fill = clamp((clock.t - s) / (z - s))
          return (
            <div key={a} className="relative min-w-0" style={{ flex: z - s }}>
              <div className={cn('h-[5px] overflow-hidden rounded-full', dark ? 'bg-white/15' : 'bg-black/10')}>
                <div className={cn('h-full rounded-full', dark ? 'bg-white' : 'bg-[var(--plum)]')} style={{ width: `${fill * 100}%` }} />
              </div>
              <div className={cn('mt-1 truncate text-[10.5px]', dark ? 'text-white/45' : 'text-ink-3', fill > 0 && fill < 1 && (dark ? 'text-white/90' : 'text-ink'))}>{ACT_LABEL[a]}</div>
            </div>
          )
        })}
      </div>
      <span className="flex-none font-mono text-[11.5px] tabular-nums opacity-70">{tc(clock.t)} / {tc(DURATION)}</span>
    </div>
  )
}
