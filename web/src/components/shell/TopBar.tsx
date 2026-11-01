import { Fragment, type ReactNode } from 'react'
import { ChevronRight, Languages, Menu } from 'lucide-react'
import { href } from '@/lib/router'
import { openNav } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { L, isEn, setLang } from '@/lib/i18n'
import { EvolvePill } from './Evolve'

export interface Crumb { label: string; to?: string }

/** 每页顶栏：面包屑 + 页面动作；evolve 时最右边是“自进化中”（只在会议知识库），移上去看知识库每天学到了什么 */
export function TopBar({ crumbs, children, center, compact = false, evolve = false }: { crumbs: Crumb[]; children?: ReactNode; center?: ReactNode; compact?: boolean; evolve?: boolean }) {
  return (
    <header className="glass-topbar flex h-14 flex-none items-center gap-3 border-b px-5 max-md:gap-2 max-md:px-3">
      <button className="text-ink-2 hover:text-ink -ml-1 grid size-9 flex-none place-items-center rounded-lg transition-colors hover:bg-black/5 md:hidden" onClick={openNav} aria-label={L('打开导航', 'Open navigation')}>
        <Menu size={19} />
      </button>
      <nav aria-label={L('页面路径', 'Breadcrumb')} className={cn('text-ink-3 flex min-w-0 items-center gap-1.5 text-sm', compact && 'max-w-[36%] max-md:max-w-none')}>
        {crumbs.map((c, i) => {
          // 手机上只留最后一级
          const hide = i < crumbs.length - 1 && 'max-md:hidden'
          return (
            <Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className={cn('text-ink-4 flex-none', i === crumbs.length - 1 && 'max-md:hidden')} />}
              {c.to ? <a href={href(c.to)} className={cn('hover:text-ink truncate transition-colors', hide)}>{c.label}</a> : <span className={cn('text-ink truncate font-medium', hide)}>{c.label}</span>}
            </Fragment>
          )
        })}
      </nav>
      {center && <div className="min-w-0 flex-1">{center}</div>}
      <div className="ml-auto flex flex-none items-center gap-2">
        {children}
        <button
          className="text-ink-2 hover:text-ink inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium transition-colors hover:bg-black/5"
          onClick={() => setLang(isEn ? 'zh' : 'en')}
          title={isEn ? '切换到中文' : 'Switch to English'}
          aria-label={isEn ? '切换到中文' : 'Switch to English'}
        >
          <Languages size={15} />{isEn ? '中文' : 'EN'}
        </button>
        {evolve && <span className="max-md:hidden"><EvolvePill /></span>}
      </div>
    </header>
  )
}
