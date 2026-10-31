import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { FileText, Info, Pencil } from 'lucide-react'
import { ITEMS, ITEM_TYPES, ROUTES, TOPICS, personById, type Item } from '../data/demo'
import type { TSeg } from '../lib/transcript'
import { Avatar } from './Avatar'
import type { Focus } from './RoutingBoard'

interface Props {
  segs: TSeg[]
  t: number
  title: string
  isDemo: boolean
  focus: Focus
  onEdit: () => void
}

const SPLIT_START = 0.95
const SPLIT_END = 1.7
const MAP_START = 1.75

export function TranscriptPanel({ segs, t, title, isDemo, focus, onEdit }: Props) {
  const speakers = new Set(segs.map(s => s.speaker)).size
  const visible = ITEMS.filter(i => t >= i.appearAt && !(i.failAt !== undefined && t < (i.fixAt ?? 0)))
  const focusItems = new Set(
    !focus ? [] : focus.kind === 'item' ? [focus.id] : ROUTES.filter(r => r.person === focus.id).map(r => r.item),
  )

  return (
    <motion.aside layoutId="meeting-card" className="card transcript" transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
      <header className="tr-head">
        <div className="tr-title">
          <FileText size={16} />
          <div>
            <h2 className="card-title">{title}</h2>
            <p className="card-sub">会议原文 · {segs.length} 段 · {speakers} 人发言</p>
          </div>
        </div>
        <button className="ghost-btn" onClick={onEdit}><Pencil size={13} /> 修改</button>
      </header>

      <div className="topics">
        {TOPICS.map(tp => (
          <motion.span
            key={tp.name}
            className="topic"
            initial={false}
            animate={t >= tp.at ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0.25, y: 3, filter: 'blur(1px)' }}
            transition={{ duration: 0.3 }}
          >
            # {tp.name}
          </motion.span>
        ))}
      </div>

      {!isDemo && (
        <div className="demo-note">
          <Info size={14} />
          <span>后端还没接入：下面的编排和分发结果用的是示例会议的预置数据。</span>
        </div>
      )}

      <ol className="tr-list">
        {segs.map((s, i) => {
          const litAt = SPLIT_START + (i / Math.max(1, segs.length)) * (SPLIT_END - SPLIT_START)
          const lit = t >= litAt
          const scanning = lit && t < litAt + 0.25
          const mapped = t >= MAP_START + i * 0.07
          return (
            <motion.li
              key={s.id}
              className={`tr-seg ${lit ? 'tr-seg--lit' : ''} ${scanning ? 'tr-seg--scan' : ''}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.03 }}
            >
              <div className="tr-who">
                {mapped && s.person ? (
                  <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Avatar person={s.person} size={24} />
                  </motion.span>
                ) : (
                  <span className="spk">S{i + 1}</span>
                )}
              </div>
              <div className="tr-body">
                <div className="tr-meta">
                  <b>{mapped ? s.speaker : `说话人 ${i + 1}`}</b>
                  <span className="mono">{s.at}</span>
                </div>
                <p>{highlight(s.text, visible, focusItems, !!focus)}</p>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </motion.aside>
  )
}

function highlight(text: string, items: Item[], focusItems: Set<string>, hasFocus: boolean) {
  const ranges = items
    .map(it => ({ it, start: text.indexOf(it.quote) }))
    .filter(r => r.start >= 0)
    .map(r => ({ ...r, end: r.start + r.it.quote.length }))
    .sort((a, b) => a.start - b.start)
  const out: ReactNode[] = []
  let cur = 0
  for (const r of ranges) {
    if (r.start < cur) continue
    if (r.start > cur) out.push(text.slice(cur, r.start))
    const ty = ITEM_TYPES[r.it.type]
    const strong = focusItems.has(r.it.id)
    out.push(
      <motion.mark
        key={r.it.id}
        className={`hl ${strong ? 'hl--strong' : ''} ${hasFocus && !strong ? 'hl--dim' : ''}`}
        style={{ ['--c' as string]: ty.color, ['--soft' as string]: ty.soft }}
        initial={{ backgroundSize: '0% 100%' }}
        animate={{ backgroundSize: '100% 100%' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        title={`${r.it.id} · ${ty.label} · ${personById(r.it.speaker).name}`}
      >
        {text.slice(r.start, r.end)}
      </motion.mark>,
    )
    cur = r.end
  }
  if (cur < text.length) out.push(text.slice(cur))
  return out
}
