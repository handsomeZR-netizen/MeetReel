import { Fragment, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { ME } from '@/data/model'
import { href } from '@/lib/router'
import { useStore } from '@/lib/store'
import { openSearch } from '@/lib/ui'
import { Kbd } from '@/components/ui/misc'

export interface Crumb { label: string; to?: string }

/** 每页顶栏：面包屑 + 搜索 + 回流提醒 */
export function TopBar({ crumbs, children }: { crumbs: Crumb[]; children?: ReactNode }) {
  const fresh = useStore(s => s.events.filter(e => e.fresh && e.person !== ME).length)
  return (
    <header className="flex h-14 flex-none items-center gap-3 border-b px-5">
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
        <button onClick={openSearch} className="text-ink-3 hover:border-ink-4 flex h-8 w-56 items-center gap-2 rounded-lg border px-2.5 text-[13px] whitespace-nowrap transition-colors max-lg:hidden">
          <Search size={14} className="flex-none" /> 搜会议、条目、原话<Kbd className="ml-auto flex-none">Ctrl K</Kbd>
        </button>
        <a href={href('/', { feed: 1 })} className="text-ink-2 relative grid size-8 place-items-center rounded-lg hover:bg-black/5" title="回流动态">
          <Bell size={17} />
          <AnimatePresence>
            {fresh > 0 && (
              <motion.span key={fresh} className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white" initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                {fresh}
              </motion.span>
            )}
          </AnimatePresence>
        </a>
      </div>
    </header>
  )
}
