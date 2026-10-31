import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, ChevronRight, Eye, Send } from 'lucide-react'
import { ME, personById } from '@/data/model'
import { itemById, meetingById } from '@/data/meetings'
import { itemTime, mmss } from '@/data/derive'
import { goSource, href } from '@/lib/router'
import { actions, useStore, type FeedEvent } from '@/lib/store'
import { Face, TypePill } from '@/components/common/bits'

export interface Crumb { label: string; to?: string }

/** 每页顶栏：面包屑 + 页面动作 + 回流提醒。搜索只在侧栏（Ctrl K），这里不再重复 */
export function TopBar({ crumbs, children }: { crumbs: Crumb[]; children?: ReactNode }) {
  return (
    <header className="glass-topbar flex h-14 flex-none items-center gap-3 border-b px-5">
      <nav className="text-ink-3 flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight size={14} className="text-ink-4 flex-none" />}
            {c.to ? <a href={href(c.to)} className="hover:text-ink truncate transition-colors">{c.label}</a> : <span className="text-ink truncate font-medium">{c.label}</span>}
          </Fragment>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <FeedBell />
      </div>
    </header>
  )
}

const VERB: Record<FeedEvent['kind'], string> = {
  confirm: '确认了', ask: '追问', assign: '指派', not_me: '退回了', answer: '回复', sent: '', read: '',
}

/** 回流动态：确认、追问、阅读回到发布者这里 */
function FeedBell() {
  const [open, setOpen] = useState(false)
  const events = useStore(s => s.events)
  const fresh = events.filter(e => e.fresh && e.person !== ME).length
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    const id = setTimeout(actions.seen, 2500)
    return () => { window.removeEventListener('click', close); clearTimeout(id) }
  }, [open])
  return (
    <div className="relative">
      <button className="text-ink-2 relative grid size-8 place-items-center rounded-lg hover:bg-black/5" title="回流动态" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        <Bell size={17} />
        <AnimatePresence>
          {fresh > 0 && (
            <motion.span key={fresh} className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white" initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              {fresh}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-10 right-0 z-40 w-[380px] origin-top-right rounded-2xl border bg-white p-1.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,.18)]"
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-baseline gap-2 px-2.5 pt-2 pb-1.5"><b className="text-[14px]">回流动态</b><span className="text-ink-3 text-[12px]">收到者的确认、追问、阅读都回到账本</span></div>
            <div className="max-h-[420px] overflow-y-auto">
              {events.slice(0, 14).map(e => <FeedRow key={e.id} e={e} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FeedRow({ e }: { e: FeedEvent }) {
  const it = e.item ? itemById(e.item) : null
  const m = meetingById(e.meeting)!
  return (
    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', backgroundColor: e.fresh ? '#F5F8FF' : 'rgba(255,255,255,0)' }} className="overflow-hidden rounded-xl">
      <div className="flex gap-2.5 px-2.5 py-2.5">
        <Face p={e.person} size={28} />
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          <div>
            <b className="font-semibold">{personById(e.person).name}</b>{' '}
            {e.kind === 'sent' ? <span className="text-ink-2"><Send size={12} className="mr-1 inline" />{e.text}</span>
              : e.kind === 'read' ? <span className="text-ink-2"><Eye size={12} className="mr-1 inline" />{e.text}</span>
              : e.kind === 'ask' ? <span className="text-ink-2">追问：“{e.text}”</span>
              : e.kind === 'assign' || e.kind === 'answer' ? <span className="text-ink-2">{e.text}</span>
              : <span className="text-ink-2">{VERB[e.kind]}</span>}
            {it && e.kind !== 'ask' && e.kind !== 'read' && <span className="text-ink-2"> <TypePill item={it} className="mx-0.5 align-[1px]" /> {it.title}</span>}
          </div>
          <div className="text-ink-3 mt-1 flex items-center gap-1.5 text-[11.5px]">
            {e.fresh && <span className="live-dot" />}
            <span>{e.when}</span><span>·</span>
            <a className="hover:text-ink truncate" href={href(`/m/${m.id}`)}>{m.title}</a>
            {it && <button className="text-primary ml-auto flex-none hover:underline" onClick={() => goSource(it.meeting, Math.max(0, itemTime(it) - 0.4), it.id)}>原话 {mmss(itemTime(it))}</button>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
