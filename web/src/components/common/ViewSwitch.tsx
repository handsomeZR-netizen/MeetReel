// 页面顶上的大分段切换（与我有关：日程 / 会议）：
// 凹槽里一块凸起的玻璃滑过去，右边跟一句说明这一页看什么。
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ViewItem {
  k: string
  label: string
  icon: LucideIcon
  hint: string
  href?: string
  onClick?: () => void
  badge?: ReactNode
}

export function ViewSwitch({ id, items, value, className }: { id: string; items: ViewItem[]; value: string; className?: string }) {
  return (
    <nav className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      <div className="sg-well flex max-w-full rounded-[16px] p-1">
        {items.map(t => {
          const on = value === t.k
          const I = t.icon
          const cls = cn('relative flex h-10 items-center gap-2 rounded-[12px] pr-4 pl-3.5 text-[14.5px] whitespace-nowrap transition-colors max-md:h-9 max-md:gap-1.5 max-md:pr-3 max-md:pl-2.5 max-md:text-[13.5px]', on ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink-2')
          const inner = (
            <>
              {on && <motion.span layoutId={id} className="sg-raised absolute inset-0 rounded-[12px]" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
              <I size={17} strokeWidth={on ? 2.2 : 1.9} className={cn('relative', on && 'text-[var(--plum)]', items.length > 2 && 'max-md:hidden')} />
              <span className="relative">{t.label}</span>
              {t.badge}
            </>
          )
          return t.href != null
            ? <a key={t.k} href={t.href} className={cls}>{inner}</a>
            : <button key={t.k} onClick={t.onClick} className={cls}>{inner}</button>
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={value} className="text-ink-3 text-[13px]" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {items.find(t => t.k === value)?.hint}
        </motion.span>
      </AnimatePresence>
    </nav>
  )
}
