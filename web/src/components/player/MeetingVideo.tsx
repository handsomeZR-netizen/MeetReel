// 模拟的会议录像画面：左边是共享屏（议程 + 这一议题里已经说出的要点），右边是参会人画面，底部字幕逐字走。
// 没有真实视频文件，画面完全由时钟 t 和会议数据推导，所以和逐字稿、账本天然对齐。
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, Play } from 'lucide-react'
import { ITEM_TYPES, personById } from '@/data/model'
import type { Item, Meeting } from '@/data/meetings'
import { charAtTime, chapterAt, isSpeaking, itemTime, mmss, quoteSpan, segAt } from '@/data/derive'
import { cn } from '@/lib/utils'
import { TypePill } from '@/components/common/bits'

interface Props {
  meeting: Meeting
  t: number
  playing: boolean
  onToggle: () => void
  focus?: Item | null
  /** 每次定位都换一个 key，触发描边闪一下 */
  pulse?: number
  captions?: boolean
}

export function MeetingVideo({ meeting: m, t, playing, onToggle, focus, pulse = 0, captions = true }: Props) {
  const seg = segAt(m, t)
  const speaking = isSpeaking(seg, t)
  const chapter = chapterAt(m, t)
  const ci = m.chapters.indexOf(chapter)
  const said = useMemo(() => m.items.filter(i => itemTime(i) >= chapter.start - 0.01 && itemTime(i) < chapter.end && itemTime(i) <= t + 0.05), [m, chapter, t])
  const showCap = captions && seg && t < seg.end + 0.6
  const k = seg ? Math.max(0, Math.min(seg.text.length, charAtTime(seg, t))) : 0
  const quotes = seg ? m.items.filter(i => i.seg === seg.id).map(quoteSpan) : []

  return (
    <div className={cn('mv', playing && 'playing')} onClick={onToggle}>
      <div className="mv-top">
        <span className="mv-rec"><i /> REC</span>
        <span className="font-mono tabular-nums">{mmss(t)}</span>
        <span className="truncate opacity-80">{m.title}</span>
        <span className="ml-auto opacity-60 max-sm:hidden">会映录制 · 演示画面</span>
      </div>

      <div className="mv-stage">
        <div className="mv-slide">
          <div className="mv-agenda">
            <b>议程</b>
            {m.chapters.map((c, i) => (
              <span key={c.name} className={i === ci ? 'on' : i < ci ? 'past' : ''}><i />{c.name}</span>
            ))}
          </div>
          <div className="mv-body">
            <small>议题 {ci + 1} / {m.chapters.length} · {personById(m.host).name} 主持</small>
            <AnimatePresence mode="wait">
              <motion.h4 key={chapter.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
                {chapter.name}
              </motion.h4>
            </AnimatePresence>
            <div className="mt-[2%] flex flex-col gap-[6%]">
              <AnimatePresence initial={false}>
                {said.map(it => (
                  <motion.div
                    key={it.id}
                    layout
                    className="mv-note"
                    style={{ boxShadow: focus?.id === it.id ? `0 0 0 2px ${ITEM_TYPES[it.type].color}` : undefined }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  >
                    <TypePill item={it} />
                    <span className="truncate">{it.title}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!said.length && <div className="text-[clamp(8px,1vw,12.5px)] text-[#A3A3AC]">讨论中…</div>}
            </div>
          </div>
        </div>

        <div className="mv-tiles">
          {m.attendees.slice(0, 4).map(pid => {
            const p = personById(pid)
            const on = speaking && seg?.speaker === pid
            return (
              <div key={pid} className={cn('mv-tile', on && 'on', playing && 'playing')}>
                <span className="mv-face" style={{ background: p.bg, color: p.fg }}>{p.short}</span>
                <span className="mv-name">
                  {on ? <span className="mv-bars"><i /><i /><i /></span> : <Mic size={10} className="opacity-60" />}
                  {p.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {showCap && seg && (
          <motion.div key={seg.id} className="mv-cap" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <b>{personById(seg.speaker).name}</b>
            {caption(seg.text, k, quotes)}
          </motion.div>
        )}
      </AnimatePresence>

      {focus && (
        <motion.div key={pulse} className="mv-flash" style={{ '--c': ITEM_TYPES[focus.type].color } as CSSProperties} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.4, ease: 'easeOut' }} />
      )}

      <div className={cn('mv-big-play', !playing && 'show')}>
        {!playing && <span><Play size={26} fill="currentColor" className="ml-1" /></span>}
      </div>
    </div>
  )
}

/** 字幕：已经说出的字是白色，没说到的半透明，原话（被抽成条目的部分）加下划线 */
function caption(text: string, k: number, quotes: { from: number; to: number }[]) {
  const color = (i: number) => quotes.find(x => i >= x.from && i < x.to) ?? null
  const out: ReactNode[] = []
  let i = 0
  while (i < text.length) {
    const said = i < k
    const q = color(i)
    let j = i + 1
    while (j < text.length && (j < k) === said && color(j) === q) j++
    const cls = said ? 'said' : 'unsaid'
    out.push(q ? <mark key={i} className={cls} style={{ '--c': '#A5B4FC' } as CSSProperties}>{text.slice(i, j)}</mark> : <span key={i} className={cls}>{text.slice(i, j)}</span>)
    i = j
  }
  return out
}
