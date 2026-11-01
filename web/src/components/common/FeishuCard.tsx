// 收件人在飞书里看到的那张卡片。按收件人做权限过滤：受限条目没权限的人只看到脱敏版、看不到原话。
import { useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Check, Circle } from 'lucide'
import { BellOff, Lock, MessageCircleQuestion, Play, UserX } from 'lucide-react'
import { ITEM_TYPES, RANKS, REASON_SHORT, personById, type PersonId } from '@/data/model'
import { meetingById } from '@/data/meetings'
import { briefFor, mmss, quoteSpan, recipientsOf, visibility } from '@/data/derive'
import { goSource } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { Face, FaceStack } from './bits'
import { L } from '@/lib/i18n'

export function FeishuCard({ meeting, pid, className }: { meeting: string; pid: PersonId; className?: string }) {
  const m = meetingById(meeting)!
  const p = personById(pid)
  const b = briefFor(meeting, pid)
  const quiet = !b.host && !b.entries.length
  const confirmed = useStore(s => s.confirmed)
  const owners = useStore(s => s.owners)
  const [acted, setActed] = useState<Record<string, 'no' | 'ask'>>({})
  const [asked, setAsked] = useState<Record<string, string>>({})
  const rows = b.host ? m.items.map(i => i.id) : b.entries.map(e => e.item)

  return (
    <div className={cn('fs', className)}>
      <div className="fs-head">
        <span>{L('会映 · 会议简报', 'MeetReel · Meeting brief')}</span>
        <small>{m.title} · {cnDate(m.date)} · {L(`${personById(m.publisher).name} 发布`, `from ${personById(m.publisher).name}`)}</small>
      </div>
      <div className="fs-body">
        <div className="flex items-center gap-2.5">
          <Face p={p} size={36} muted={quiet} />
          <div className="leading-tight">
            <b className="text-[15px]">{p.name}</b>
            <div className="text-[12px] text-[#646A73]">{b.host ? L('发布者版', 'Publisher version') : `${RANKS[p.rank].level} ${RANKS[p.rank].label} · ${p.role}`}{quiet ? '' : L(` · 约 ${b.readSeconds} 秒读完`, ` · ~${b.readSeconds}s read`)}</div>
          </div>
        </div>
        <p className="my-3 text-[15px] leading-relaxed font-semibold text-[#1F2329]">{b.headline}</p>
        {quiet && <div className="flex items-center gap-2 rounded-lg bg-[#F5F6F7] p-4 text-[13.5px] text-[#646A73]"><BellOff size={18} /> {L('这场会没有需要你必读的内容，不打扰。', 'Nothing in this meeting is a must-read for you — no ping.')}</div>}
        {rows.map(iid => {
          const it = m.items.find(i => i.id === iid)!
          const e = b.entries.find(x => x.item === iid)
          const c = ITEM_TYPES[it.type]
          const vis = visibility(it, pid)
          const owner = owners[iid] ?? it.owner
          const mine = it.type === 'action' && (owner === pid || (!owner && it.suggestedOwner === pid))
          const ok = confirmed[iid]
          const { t0, seg } = quoteSpan(it)
          return (
            <div key={iid} className="fs-entry">
              <div className="flex items-center gap-1.5">
                <span className="type-pill" style={{ '--c': c.color, '--soft': c.soft } as CSSProperties}>{c.label}</span>
                <b className="text-[14px] text-[#1F2329]">{vis === 'redacted' ? it.redacted : it.title}</b>
                {it.sensitivity === 'restricted' && <Lock size={12} className="text-rose-700" />}
              </div>
              {e && <p className="my-1.5 text-[14px] leading-relaxed text-[#1F2329]">{e.forYou}</p>}
              {e && (
                <div className="flex flex-wrap items-center gap-1 text-[12.5px] text-[#646A73]">
                  {L('为什么发给你：', 'Why you: ')}{e.why}
                  {e.reasons.map(r => <span key={r} className={cn('rounded-full px-2 text-[11.5px] leading-5', r === 'R4' ? 'bg-[#1F2329] text-white' : 'bg-[#F2F3F5]')}>{REASON_SHORT[r]}</span>)}
                </div>
              )}
              {b.host && (
                <div className="mt-1.5 flex items-center gap-2 text-[12px] text-[#646A73]">
                  {L('发给', 'Sent to')} <FaceStack ids={recipientsOf(m, iid)} size={18} ring={id => (confirmed[iid] === id ? '#34C724' : undefined)} />
                  {!recipientsOf(m, iid).length && L('只在账本里', 'Ledger only')}
                  {ok && <span className="text-[#34C724]">· {L(`${personById(ok).name} 已确认`, `${personById(ok).name} confirmed`)}</span>}
                </div>
              )}
              {vis === 'full' ? (
                <button className="fs-q" onClick={() => goSource(m.id, Math.max(0, t0 - 0.4), it.id)} title={L('回到录像里的这一秒', 'Jump to this moment in the recording')}>
                  <span className="play"><Play size={9} fill="currentColor" /></span>
                  <span className="truncate">“{it.quote}”</span>
                  <small>{personById(seg.speaker).name} {mmss(t0)}</small>
                </button>
              ) : (
                <div className="fs-q text-[#8F959E]"><Lock size={13} /> {L('原话含受限信息，仅名单内可见', 'Quote contains restricted info — allow-list only')}</div>
              )}
              {e && mine && (
                <div className="fs-acts">
                  <button className={cn('pri', ok && 'on')} onClick={() => actions.confirm(iid, pid)}>
                    <MorphIcon icon={ok ? Check : Circle} size={13} strokeWidth={2.4} /> {ok ? L('已确认', 'Confirmed') : it.owner ? L('确认', 'Confirm') : L('我来负责', 'I’ll own it')}
                  </button>
                  <button onClick={() => setActed(s => ({ ...s, [iid]: 'no' }))}><UserX size={13} /> {acted[iid] === 'no' ? L('已告知发布者', 'Publisher notified') : L('不是我', 'Not me')}</button>
                  <button onClick={() => setActed(s => ({ ...s, [iid]: 'ask' }))}><MessageCircleQuestion size={13} /> {L('追问', 'Ask')}</button>
                </div>
              )}
              <AnimatePresence>
                {acted[iid] === 'ask' && (
                  <motion.form
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    onSubmit={ev => {
                      ev.preventDefault()
                      const q = new FormData(ev.currentTarget).get('q') as string
                      if (q.trim()) setAsked(s => ({ ...s, [iid]: q.trim() }))
                    }}
                  >
                    {asked[iid] ? (
                      <div className="mt-2 rounded-lg bg-[#F0F5FF] px-3 py-2 text-[12.5px] text-[#1F2329]">
                        {L('已转给问答官：', 'Sent to the Q&A agent: ')}“{asked[iid]}”{L('。会上没说到的，会转问发布者，回答会回到这里。', '. Anything the meeting didn’t cover goes to the publisher, and the answer comes back here.')}
                      </div>
                    ) : (
                      <input name="q" autoFocus placeholder={L('例如：这个数字的出处是什么？回车发送', 'e.g. Where does this number come from? Press Enter')} className="mt-2 w-full rounded-lg border border-[#C9D8FF] bg-[#FBFCFF] px-3 py-2 text-[13px] outline-none" />
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
