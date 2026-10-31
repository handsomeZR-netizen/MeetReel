// 录像进度条：章节带、条目图钉、进度轨、每位发言人的说话泳道。拖动任何一行都能定位。
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Pause, Play } from 'lucide'
import { Captions, RotateCcw, RotateCw } from 'lucide-react'
import { ITEM_TYPES, personById } from '@/data/model'
import type { Item, Meeting } from '@/data/meetings'
import { itemTime, mmss, segAt } from '@/data/derive'
import type { Clock } from '@/lib/useClock'
import { cn } from '@/lib/utils'
import { Face } from '@/components/common/bits'

const GUTTER = 30

interface Props {
  meeting: Meeting
  clock: Clock
  focusId?: string | null
  onItem: (it: Item) => void
}

export function Scrubber({ meeting: m, clock, focusId, onItem }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  const [pin, setPin] = useState<Item | null>(null)
  const dragging = useRef(false)
  const D = m.duration
  const x = (s: number) => (s / D) * w

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const at = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return Math.max(0, Math.min(D, ((e.clientX - r.left) / r.width) * D))
  }
  const speakers = [...new Set(m.segments.map(s => s.speaker))]
  const hoverSeg = hover != null ? segAt(m, hover) : null

  return (
    <div className="select-none">
      <div className="grid" style={{ gridTemplateColumns: `${GUTTER}px minmax(0,1fr)` }}>
        <div />
        <div
          ref={ref}
          className="relative cursor-pointer"
          onPointerDown={e => {
            if ((e.target as HTMLElement).closest('[data-pin]')) return
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            clock.seek(at(e))
          }}
          onPointerMove={e => {
            setHover(at(e))
            if (dragging.current) clock.seek(at(e))
          }}
          onPointerUp={() => { dragging.current = false }}
          onPointerLeave={() => setHover(null)}
        >
          {/* 章节 */}
          <div className="relative h-6">
            {m.chapters.map(c => {
              const on = clock.t >= c.start && clock.t < c.end
              return (
                <div key={c.name} className="absolute top-0 bottom-0 px-[1px]" style={{ left: x(c.start), width: x(c.end) - x(c.start) }}>
                  <div className={cn('flex h-full items-center truncate rounded-md px-1.5 text-[11.5px] transition-colors', on ? 'bg-primary/10 text-primary font-semibold' : 'text-ink-3 bg-muted/70')}>{c.name}</div>
                </div>
              )
            })}
          </div>

          {/* 条目图钉 */}
          <div className="relative mt-1.5 h-5">
            {m.items.map(it => {
              const c = ITEM_TYPES[it.type]
              const on = focusId === it.id
              return (
                <button
                  key={it.id}
                  data-pin
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: x(itemTime(it)) }}
                  onPointerEnter={() => setPin(it)}
                  onPointerLeave={() => setPin(null)}
                  onClick={() => onItem(it)}
                  aria-label={it.title}
                >
                  <motion.span
                    className="block rotate-45 rounded-[3px]"
                    style={{ background: c.color, boxShadow: on ? `0 0 0 2px #fff, 0 0 0 4px ${c.color}` : '0 0 0 1.5px #fff' }}
                    animate={{ width: on ? 11 : 9, height: on ? 11 : 9 }}
                  />
                </button>
              )
            })}
          </div>

          {/* 进度轨 */}
          <div className="bg-muted relative mt-1 h-1.5 rounded-full">
            <div className="bg-primary absolute inset-y-0 left-0 rounded-full" style={{ width: x(clock.t) }} />
            {hover != null && <div className="absolute inset-y-0 left-0 rounded-full bg-black/10" style={{ width: x(hover) }} />}
            <div className="bg-primary absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: x(clock.t) }} />
          </div>

          {/* 播放头竖线 + 悬停预览 */}
          <div className="bg-primary/60 pointer-events-none absolute top-0 bottom-[-4px] w-px" style={{ left: x(clock.t), height: `calc(100% + ${speakers.length * 16 + 10}px)` }} />
          <AnimatePresence>
            {(pin || (hover != null && hoverSeg)) && (
              <motion.div
                className="pointer-events-none absolute bottom-[calc(100%+6px)] z-10 w-[260px] -translate-x-1/2 rounded-xl border bg-white px-3 py-2 text-xs shadow-lg"
                style={{ left: Math.max(130, Math.min(w - 130, x(pin ? itemTime(pin) : hover!))) }}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {pin ? (
                  <>
                    <div className="flex items-center gap-1.5"><span className="font-mono text-ink-3">{mmss(itemTime(pin))}</span><span style={{ color: ITEM_TYPES[pin.type].color }} className="font-semibold">{ITEM_TYPES[pin.type].label}</span></div>
                    <div className="mt-0.5 text-[13px] font-medium">{pin.title}</div>
                    <div className="text-ink-3 mt-0.5 truncate">“{pin.quote}” · 点击定位</div>
                  </>
                ) : hoverSeg && (
                  <>
                    <div className="flex items-center gap-1.5"><span className="font-mono text-ink-3">{mmss(hover!)}</span><b className="font-medium">{personById(hoverSeg.speaker).name}</b></div>
                    <div className="text-ink-2 mt-0.5 line-clamp-2 leading-5">{hoverSeg.text}</div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 发言泳道 */}
      <div className="mt-2.5 flex flex-col gap-1">
        {speakers.map(pid => {
          const p = personById(pid)
          return (
            <div key={pid} className="grid items-center" style={{ gridTemplateColumns: `${GUTTER}px minmax(0,1fr)` }}>
              <Face p={pid} size={18} />
              <div className="relative h-3">
                <div className="bg-muted/60 absolute inset-x-0 top-1/2 h-px" />
                {m.segments.filter(s => s.speaker === pid).map(s => {
                  const on = clock.t >= s.start && clock.t < s.end
                  return (
                    <button
                      key={s.id}
                      className="absolute top-0 h-3 rounded-full transition-[filter]"
                      style={{ left: x(s.start), width: Math.max(4, x(s.end) - x(s.start)), background: p.fg, opacity: on ? 1 : 0.55, boxShadow: on ? `0 0 0 3px ${p.bg}` : undefined }}
                      onClick={() => clock.seek(s.start)}
                      title={`${p.name} ${mmss(s.start)}：${s.text}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PlayerControls({ clock, captions, onCaptions, extra }: { clock: Clock; captions: boolean; onCaptions: (v: boolean) => void; extra?: ReactNode }) {
  const speeds = [1, 1.5, 2]
  return (
    <div className="flex items-center gap-1.5">
      <button className="bg-ink grid size-9 place-items-center rounded-full text-white transition-transform hover:scale-105" onClick={clock.toggle} aria-label={clock.playing ? '暂停' : '播放'}>
        <MorphIcon icon={clock.playing ? Pause : Play} size={15} strokeWidth={2.4} />
      </button>
      <button className="text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={() => clock.seek(clock.t - 5)} aria-label="后退 5 秒"><RotateCcw size={15} /></button>
      <button className="text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={() => clock.seek(clock.t + 5)} aria-label="前进 5 秒"><RotateCw size={15} /></button>
      <span className="text-ink-2 ml-1 font-mono text-[12.5px] tabular-nums">{mmss(clock.t)} <span className="text-ink-4">/ {mmss(clock.duration)}</span></span>
      <div className="ml-auto flex items-center gap-1.5">
        {extra}
        <button className={cn('grid h-8 place-items-center rounded-lg px-2 transition-colors', captions ? 'text-ink bg-black/5' : 'text-ink-3 hover:bg-black/5')} onClick={() => onCaptions(!captions)} aria-label="字幕" title="字幕"><Captions size={16} /></button>
        <button className="text-ink-2 h-8 min-w-11 rounded-lg px-2 font-mono text-[12.5px] hover:bg-black/5" onClick={() => clock.setSpeed(speeds[(speeds.indexOf(clock.speed) + 1) % speeds.length])} title="倍速">{clock.speed}×</button>
      </div>
    </div>
  )
}
