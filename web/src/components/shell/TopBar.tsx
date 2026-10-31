import { Fragment, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { href } from '@/lib/router'
import { EvolvePill } from './Evolve'

export interface Crumb { label: string; to?: string }

/** 每页顶栏：面包屑 + 页面动作；最右边是“自进化中”，移上去看知识库每天学到了什么 */
export function TopBar({ crumbs, children, center, compact = false }: { crumbs: Crumb[]; children?: ReactNode; center?: ReactNode; compact?: boolean }) {
  return (
    <header className="glass-topbar flex h-14 flex-none items-center gap-3 border-b px-5">
      <nav aria-label="页面路径" className={`text-ink-3 flex min-w-0 items-center gap-1.5 text-sm ${compact ? 'max-w-[36%]' : ''}`}>
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight size={14} className="text-ink-4 flex-none" />}
            {c.to ? <a href={href(c.to)} className="hover:text-ink truncate transition-colors">{c.label}</a> : <span className="text-ink truncate font-medium">{c.label}</span>}
          </Fragment>
        ))}
      </nav>
      {center && <div className="min-w-0 flex-1">{center}</div>}
      <div className="ml-auto flex flex-none items-center gap-2">
        {children}
        <EvolvePill />
      </div>
    </header>
  )
}
