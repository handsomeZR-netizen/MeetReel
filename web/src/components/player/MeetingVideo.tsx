// 会议录像画面：左边是共享屏（议程 + 这一议题里已经说出的要点），右边是参会人画面或真实录像，底部字幕逐字走。
// 有真实录像（直播）时，录像跟着时钟 t 播放和跳转；没有时画面完全由 t 和会议数据推导，和逐字稿、账本天然对齐。
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, Play, Volume2, VolumeX } from 'lucide-react'
import { ITEM_TYPES, personById, type PersonId } from '@/data/model'
import type { Item, Meeting } from '@/data/meetings'
import { charAtTime, chapterAt, isSpeaking, itemTime, mmss, quoteSpan, segAt } from '@/data/derive'
import { cn } from '@/lib/utils'
import { TypePill } from '@/components/common/bits'
import { L } from '@/lib/i18n'

interface Props {
  meeting: Meeting
  t: number
  playing: boolean
  onToggle: () => void
  focus?: Item | null
  /** 每次定位都换一个 key，触发描边闪一下 */
  pulse?: number
  captions?: boolean
  speed?: number
}

export function MeetingVideo({ meeting: m, t, playing, onToggle, focus, pulse = 0, captions = true, speed = 1 }: Props) {
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
        <span className="ml-auto opacity-60 max-sm:hidden">{m.video ? L('直播录像 · B 站转载', 'Livestream recording · Bilibili repost') : L('会映录制', 'Recorded by MeetReel')}</span>
      </div>

      <div className="mv-stage">
        <div className="mv-slide">
          <div className="mv-agenda">
            <b>{L('议程', 'Agenda')}</b>
            {m.chapters.map((c, i) => (
              <span key={c.name} className={i === ci ? 'on' : i < ci ? 'past' : ''}><i />{c.name}</span>
            ))}
          </div>
          <div className="mv-body">
            <small>{L('议题', 'Topic')} {ci + 1} / {m.chapters.length} · {L(`${personById(m.host).name} 主持`, `hosted by ${personById(m.host).name}`)}</small>
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
              {!said.length && <div className="text-[clamp(8px,1vw,12.5px)] text-[#A3A3AC]">{L('讨论中…', 'Discussing…')}</div>}
            </div>
          </div>
        </div>

        {m.video ? <RealVideo src={m.video.src} poster={m.video.poster} t={t} playing={playing} speed={speed} speaker={speaking ? seg?.speaker : undefined} /> : <div className="mv-tiles">
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
        </div>}
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

/** 真实录像（竖屏）：跟着演示时钟播放、暂停、倍速；时钟跳转时录像也跳过去 */
function RealVideo({ src, poster, t, playing, speed, speaker }: { src: string; poster: string; t: number; playing: boolean; speed: number; speaker?: PersonId }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (playing) v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}) })
    else v.pause()
  }, [playing])
  useEffect(() => {
    const v = ref.current
    if (v && Math.abs(v.currentTime - t) > (playing ? 0.8 : 0.05)) v.currentTime = t
  }, [t, playing])
  useEffect(() => { if (ref.current) ref.current.playbackRate = speed }, [speed])
  useEffect(() => { if (ref.current) ref.current.muted = muted }, [muted])
  return (
    <div className="mv-real">
      <video ref={ref} src={src} poster={poster} playsInline preload="auto" />
      {speaker && <span className="mv-name"><span className="mv-bars"><i /><i /><i /></span>{personById(speaker).name}</span>}
      <button className="mv-mute" onClick={e => { e.stopPropagation(); setMuted(x => !x) }} aria-label={muted ? L('打开声音', 'Unmute') : L('静音', 'Mute')}>
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
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
