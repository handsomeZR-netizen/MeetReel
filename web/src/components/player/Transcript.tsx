// 逐字稿：跟着录像逐字走；点任意一个字跳到那一刻；被抽成条目的原话按类型着色，点它定位到条目。
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownToLine, Search, X } from 'lucide-react'
import { ITEM_TYPES, personById, type PersonId } from '@/data/model'
import type { Item, Meeting, Segment } from '@/data/meetings'
import { charAtTime, charTime, isSpeaking, mmss, quoteSpan, segAt } from '@/data/derive'
import { cn } from '@/lib/utils'
import { Face } from '@/components/common/bits'
import { Switch } from '@/components/ui/misc'
import { L } from '@/lib/i18n'

interface Props {
  meeting: Meeting
  t: number
  onSeek: (t: number) => void
  focusId: string | null
  onFocus: (it: Item) => void
}

export function Transcript({ meeting: m, t, onSeek, focusId, onFocus }: Props) {
  const [follow, setFollow] = useState(true)
  const [query, setQuery] = useState('')
  const [who, setWho] = useState<PersonId | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const rows = useRef(new Map<string, HTMLDivElement>())
  // 回调和 ref 保持稳定，非当前段落就不会每帧重渲染
  const latest = useRef({ onSeek, onFocus })
  latest.current = { onSeek, onFocus }
  const seek = useCallback((v: number) => latest.current.onSeek(v), [])
  const focus = useCallback((it: Item) => latest.current.onFocus(it), [])
  const refFns = useRef(new Map<string, (el: HTMLDivElement | null) => void>())
  const refFor = (id: string) => {
    let f = refFns.current.get(id)
    if (!f) {
      f = el => { if (el) rows.current.set(id, el); else rows.current.delete(id) }
      refFns.current.set(id, f)
    }
    return f
  }
  const cur = segAt(m, t)
  const speaking = isSpeaking(cur, t)
  const k = cur && speaking ? charAtTime(cur, t) : cur && t >= cur.end ? 1e6 : -1
  const speakers = useMemo(() => [...new Set(m.segments.map(s => s.speaker))], [m])
  const hits = query.trim() ? m.segments.filter(s => s.text.includes(query.trim())).length : 0

  const scrollTo = (segId: string, smooth = true) => {
    const el = rows.current.get(segId)
    const c = box.current
    if (!el || !c) return
    c.scrollTo({ top: el.offsetTop - c.clientHeight * 0.28, behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    if (follow && cur) scrollTo(cur.id)
  }, [cur?.id, follow]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusId) return
    const it = m.items.find(i => i.id === focusId)
    if (it) {
      setFollow(true)
      scrollTo(it.seg)
    }
  }, [focusId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none flex-col gap-2.5 border-b px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="text-ink-3 absolute top-1/2 left-2.5 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={L('在逐字稿里搜索', 'Search the transcript')}
              className="focus:border-ring focus:ring-ring/30 h-8 w-full rounded-lg border bg-white pr-7 pl-8 text-[13px] outline-none focus:ring-[3px]"
            />
            {query && <button className="text-ink-3 absolute top-1/2 right-2 -translate-y-1/2" onClick={() => setQuery('')} aria-label={L('清空', 'Clear')}><X size={13} /></button>}
          </div>
          <label className="text-ink-2 flex flex-none items-center gap-1.5 text-[12.5px]"><Switch checked={follow} onCheckedChange={setFollow} /> {L('跟随', 'Follow')}</label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button className={cn('h-6 rounded-full px-2.5 text-[12px] transition-colors', !who ? 'bg-ink text-white' : 'text-ink-2 bg-muted hover:bg-black/10')} onClick={() => setWho(null)}>{L('全部', 'All')}</button>
          {speakers.map(pid => (
            <button key={pid} className={cn('flex h-6 items-center gap-1 rounded-full pr-2.5 pl-0.5 text-[12px] transition-colors', who === pid ? 'bg-ink text-white' : 'text-ink-2 bg-muted hover:bg-black/10')} onClick={() => setWho(w => (w === pid ? null : pid))}>
              <Face p={pid} size={20} />{personById(pid).name}
            </button>
          ))}
          {query.trim() && <span className="text-ink-3 ml-auto text-[12px]">{L(`${hits} 段命中`, `${hits} hits`)}</span>}
        </div>
      </div>

      <div
        ref={box}
        className="relative min-h-0 flex-1 overflow-y-auto px-2.5 py-2"
        onWheel={() => follow && setFollow(false)}
        onTouchMove={() => follow && setFollow(false)}
      >
        {m.segments.map(s => (
          <SegRow
            key={s.id}
            ref={refFor(s.id)}
            seg={s}
            items={m.items}
            cur={cur?.id === s.id}
            k={cur?.id === s.id ? k : -1}
            focusId={focusId}
            query={query.trim()}
            dim={!!who && s.speaker !== who}
            onSeek={seek}
            onFocus={focus}
          />
        ))}
        <div className="h-24" />
      </div>

      <AnimatePresence>
        {!follow && (
          <motion.button
            className="bg-ink absolute right-5 bottom-5 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-white shadow-lg"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={() => { setFollow(true); if (cur) scrollTo(cur.id) }}
          >
            <ArrowDownToLine size={14} /> {L('回到播放位置', 'Back to playhead')}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

interface RowProps {
  ref: (el: HTMLDivElement | null) => void
  seg: Segment
  items: Item[]
  cur: boolean
  k: number
  focusId: string | null
  query: string
  dim: boolean
  onSeek: (t: number) => void
  onFocus: (it: Item) => void
}

const SegRow = memo(function SegRow({ ref, seg, items, cur, k, focusId, query, dim, onSeek, onFocus }: RowProps) {
  const p = personById(seg.speaker)
  const mine = items.filter(i => i.seg === seg.id)
  const quotes = mine.map(it => ({ it, ...quoteSpan(it) })).sort((a, b) => a.from - b.from)
  const searchRanges: [number, number][] = []
  if (query) {
    let i = seg.text.indexOf(query)
    while (i >= 0) {
      searchRanges.push([i, i + query.length])
      i = seg.text.indexOf(query, i + query.length)
    }
  }
  const inSearch = (i: number) => searchRanges.some(([a, b]) => i >= a && i < b)

  const ch = (i: number) => {
    const state = !cur ? '' : i < k ? 'said' : i === k ? 'now' : 'unsaid'
    return (
      <span
        key={i}
        className={cn('c', state, inSearch(i) && 'tx-search')}
        onClick={e => { e.stopPropagation(); onSeek(charTime(seg, i)) }}
      >
        {seg.text[i]}
      </span>
    )
  }

  const out: ReactNode[] = []
  let i = 0
  for (const q of quotes) {
    if (q.from < i) continue
    while (i < q.from) out.push(ch(i++))
    const c = ITEM_TYPES[q.it.type]
    const inner: ReactNode[] = []
    while (i < q.to) inner.push(ch(i++))
    out.push(
      <span
        key={`q${q.it.id}`}
        className={cn('tx-q', focusId === q.it.id && 'focus')}
        style={{ '--c': c.color, '--soft': c.soft } as CSSProperties}
        title={`${q.it.id} · ${c.label} · ${q.it.title}`}
        onClick={e => { e.stopPropagation(); onFocus(q.it) }}
      >
        {inner}
      </span>,
    )
  }
  while (i < seg.text.length) out.push(ch(i++))

  return (
    <div ref={ref} className={cn('tx-seg', cur && 'cur', dim && 'opacity-35')}>
      <Face p={p} size={28} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <b className="text-[13px] font-semibold">{p.name}</b>
          <span className="text-ink-3 text-[11.5px]">{p.role}</span>
          <button className="text-ink-3 hover:text-primary font-mono text-[11.5px] tabular-nums transition-colors" onClick={() => onSeek(seg.start)}>{mmss(seg.start)}</button>
          <span className="ml-auto flex gap-1">
            {mine.map(it => (
              <button key={it.id} onClick={() => onFocus(it)} className="rounded-md transition-transform hover:-translate-y-px" title={it.title}>
                <span className="type-pill" style={{ '--c': ITEM_TYPES[it.type].color, '--soft': ITEM_TYPES[it.type].soft } as CSSProperties}>{ITEM_TYPES[it.type].label}</span>
              </button>
            ))}
          </span>
        </div>
        <div className="tx-text mt-0.5">{out}</div>
      </div>
    </div>
  )
})
