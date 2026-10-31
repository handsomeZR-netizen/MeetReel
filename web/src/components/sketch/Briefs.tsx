// 手绘风的简报：便利贴墙（每人一张）+ 点开后的简报纸。原话可以直接跳回录像。
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lock, X } from 'lucide-react'
import { ITEM_TYPES, REASONS, personById, type PersonId } from '@/data/model'
import { meetingById } from '@/data/meetings'
import { briefFor, mmss, quoteSpan, recipientsOf, visibility } from '@/data/derive'
import { goSource } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { Kb } from '@/components/common/bits'
import { Rough } from './rough'

const NOTE_COLORS = ['#FFF3B0', '#FFD8E4', '#D0EBFF', '#D3F9D8', '#E5DBFF', '#FFE8CC', '#C5F6FA', '#EDEDE8']
const TILT = [-2.5, 1.5, -1, 2, -1.8, 1, -2.2, 1.2]
const INK = '#1E1E1E'

export function StickyNotes({ meeting, people, ready, onOpen }: { meeting: string; people: PersonId[]; ready: (pid: PersonId) => boolean; onOpen: (pid: PersonId) => void }) {
  const m = meetingById(meeting)!
  return (
    <div className="sk-stickies">
      {people.map((pid, i) => {
        const p = personById(pid)
        const b = briefFor(meeting, pid)
        const quiet = !b.host && !b.entries.length
        return (
          <AnimatePresence key={pid} mode="popLayout">
            {ready(pid) ? (
              <motion.button
                key="note"
                className={`sk-sticky ${quiet ? 'quiet' : ''}`}
                style={{ background: NOTE_COLORS[i % NOTE_COLORS.length] }}
                initial={{ opacity: 0, scale: 0.6, rotate: -12, y: 30 }}
                animate={{ opacity: 1, scale: 1, rotate: TILT[i % TILT.length], y: 0 }}
                whileHover={{ scale: 1.04, rotate: 0, y: -6, zIndex: 3 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                onClick={() => onOpen(pid)}
              >
                <span className="sk-tape" />
                <div className="sk-sticky-top">
                  <b>{p.name}</b>
                  <small>{b.host ? '主持' : p.role}</small>
                  <em>{quiet ? <Kb name="coffee" size={20} /> : b.host ? m.items.length : b.entries.length}</em>
                </div>
                <p>{b.headline}</p>
                <span className="sk-sticky-open">{quiet ? '不打扰，只进日报' : '点开看 →'}</span>
              </motion.button>
            ) : (
              <motion.div key="slot" className="sk-sticky-slot" exit={{ opacity: 0 }}>{p.name}</motion.div>
            )}
          </AnimatePresence>
        )
      })}
    </div>
  )
}

export function BriefPaper({ meeting, pid, onClose }: { meeting: string; pid: PersonId | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <AnimatePresence>
      {pid && (
        <>
          <motion.div key="scrim" className="sk-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div key={pid} className="sk-paper" initial={{ opacity: 0, y: 40, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: -0.6 }} exit={{ opacity: 0, y: 30, rotate: 2 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
            <PaperBody meeting={meeting} pid={pid} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function PaperBody({ meeting, pid, onClose }: { meeting: string; pid: PersonId; onClose: () => void }) {
  const m = meetingById(meeting)!
  const p = personById(pid)
  const b = briefFor(meeting, pid)
  const quiet = !b.host && !b.entries.length
  const confirmed = useStore(s => s.confirmed)
  const rows = b.host ? m.items.map(i => i.id) : b.entries.map(e => e.item)
  return (
    <>
      <button className="sk-paper-x" onClick={onClose} aria-label="关闭"><X size={18} /></button>
      <div className="sk-paper-head">
        <span className="sk-paper-face" style={{ background: p.bg, color: p.fg }}>{p.short}</span>
        <div><b>{p.name}</b><small>{b.host ? '主持' : p.role}{quiet ? ' · 这场不打扰' : ` · 约 ${b.readSeconds} 秒读完`}</small></div>
      </div>
      <p className="sk-paper-headline">{b.headline}</p>
      {quiet && <div className="flex items-center gap-3 py-3.5 text-[17px] text-[#4A4A4A]"><Kb name="coffee" size={40} /> 没有需要你必读的内容。和你沾边的变化放进了日报。</div>}
      <ol className="sk-paper-list">
        {rows.map(iid => {
          const it = m.items.find(i => i.id === iid)!
          const e = b.entries.find(x => x.item === iid)
          const c = ITEM_TYPES[it.type]
          const r4 = e?.reasons.includes('R4')
          const vis = visibility(it, pid)
          const mine = it.type === 'action' && (it.owner === pid || it.suggestedOwner === pid)
          const ok = !!confirmed[iid]
          const { t0, seg } = quoteSpan(it)
          return (
            <li key={iid}>
              <button className="sk-check" onClick={() => mine && actions.confirm(iid, pid)} aria-label="确认" title={mine ? '勾选即确认' : ok ? `${personById(confirmed[iid]).name} 已确认` : ''}>
                <svg width="22" height="22" viewBox="0 0 22 22">
                  <Rough shape={{ kind: 'rect', x: 2, y: 2, w: 18, h: 18 }} opts={{ stroke: INK, strokeWidth: 1.4, roughness: 1.2 }} draw={0} />
                  {ok && <Rough shape={{ kind: 'path', d: 'M5,11 l5,6 l10,-15' }} opts={{ stroke: '#2F9E44', strokeWidth: 2.4, roughness: 0.6 }} draw={0.25} />}
                </svg>
              </button>
              <div className="min-w-0">
                <div className="sk-paper-t"><span style={{ color: c.color }}>{c.label}</span>{vis === 'redacted' ? it.redacted : it.title}{it.sensitivity === 'restricted' && <Lock size={13} className="sk-lock" />}</div>
                {e && <p>{e.forYou}</p>}
                {e && <small className={r4 ? 'r4' : ''}>为什么发给你：{e.why}（{e.reasons.map(r => REASONS[r]).join('、')}）</small>}
                {b.host && <small>发给：{recipientsOf(m, iid).map(x => personById(x).name).join('、') || '只在账本里'}{ok ? ` · ${personById(confirmed[iid]).name}已确认` : ''}</small>}
                {vis === 'full' ? (
                  <button className="sk-src" onClick={() => { onClose(); goSource(m.id, Math.max(0, t0 - 0.4), it.id) }} title="回到录像里的这一秒">
                    <i>▶</i>“{it.quote}”<em>— {personById(seg.speaker).name} {mmss(t0)}</em>
                  </button>
                ) : (
                  <small className="mt-1.5 inline-flex items-center gap-1"><Lock size={12} /> 原话含受限信息，你看到的是脱敏版</small>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="sk-paper-foot"><Kb name="paperPlane" size={22} /> 由投递官发到飞书 · 勾选就是“确认” · 点原话回到录像</div>
    </>
  )
}
