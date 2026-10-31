import { motion } from 'motion/react'
import {
  CalendarCheck, ChevronLeft, ChevronRight, LayoutTemplate, Library, PanelLeftClose, PanelLeftOpen, Search, SquarePen,
} from 'lucide-react'
import { MEETINGS } from '@/data/meetings'
import { ME, personById } from '@/data/model'
import { href, useNav, useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { Logo } from '@/components/common/bits'
import { AccountMenu } from './Account'

// 新建会议和智能分发合成一个入口：上传 → 会映问你几件事 → 多智能体按人分发
const NAV = [
  { key: 'new', label: '新建会映', icon: SquarePen, to: '/new' },
  { key: 'search', label: '搜索会议', icon: Search, to: null, kbd: 'Ctrl K' },
  { key: 'home', label: '我的日程', icon: CalendarCheck, to: '/' },
  { key: 'kb', label: '会议知识库', icon: Library, to: '/kb' },
  { key: 'templates', label: '模板中心', icon: LayoutTemplate, to: '/templates' },
] as const

// 品牌 Logo：scripts/transparent_logo.py 生成到 assets/brand/ 之后自动换上，没有时用内置的 M 标
const brandFiles = import.meta.glob<string>('../../assets/brand/*.png', { eager: true, import: 'default' })
export const BRAND = {
  full: Object.entries(brandFiles).find(([k]) => k.endsWith('/logo.png'))?.[1],
  mark: Object.entries(brandFiles).find(([k]) => k.endsWith('/logo-mark.png'))?.[1],
}

function activeKey(path: string[]) {
  const [p0] = path
  // 共享给我已并进“我的会议”（发给我的）
  if (!p0 || p0 === 'm' || p0 === 'shared') return 'home'
  if (p0 === 'dispatch') return 'new'
  return p0
}

export function Sidebar({ collapsed, onCollapse, onSearch }: { collapsed: boolean; onCollapse: (v: boolean) => void; onSearch: () => void }) {
  const { path } = useRoute()
  const nav = useNav()
  const dispatched = useStore(s => s.dispatched)
  const on = activeKey(path)
  const openMeeting = path[0] === 'm' || path[0] === 'dispatch' ? path[1] : null
  const recent = [...MEETINGS].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const pending = MEETINGS.filter(m => !dispatched[m.id]).length
  const ib = 'text-ink-2 grid size-7 place-items-center rounded-lg transition-colors hover:bg-black/[.06] hover:text-ink disabled:text-ink-4 disabled:hover:bg-transparent'

  return (
    <motion.aside
      className="bg-sidebar relative flex h-full flex-none flex-col overflow-hidden"
      animate={{ width: collapsed ? 68 : 252 }}
      transition={{ type: 'spring', stiffness: 380, damping: 40 }}
    >
      <div className={cn('flex h-full flex-col py-4', collapsed ? 'px-3' : 'px-3.5')}>
        <div className={cn('mb-4 flex items-center', collapsed ? 'flex-col gap-2' : 'h-14 gap-1 pl-2')}>
          <a href={href('/')} className={cn('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')} aria-label="会映 MeetReel">
            {BRAND.full && BRAND.mark ? (
              <img src={collapsed ? BRAND.mark : BRAND.full} alt="会映 MeetReel" className={cn('block w-auto select-none', collapsed ? 'h-9' : 'h-[46px]')} draggable={false} />
            ) : (
              <>
                <span className="flex-none"><Logo size={30} /></span>
                {!collapsed && <span className="text-[19px] font-bold tracking-tight whitespace-nowrap">会映 <span className="font-semibold">MeetReel</span></span>}
              </>
            )}
          </a>
          <div className={cn('flex items-center gap-0.5', !collapsed && 'ml-auto')}>
            <button className={ib} onClick={() => onCollapse(!collapsed)} aria-label={collapsed ? '展开侧栏' : '收起侧栏'} title={collapsed ? '展开侧栏' : '收起侧栏'}>
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            {!collapsed && (
              <>
                <button className={ib} disabled={nav.idx <= 0} onClick={() => history.back()} aria-label="后退" title="后退"><ChevronLeft size={18} /></button>
                <button className={ib} disabled={nav.idx >= nav.max} onClick={() => history.forward()} aria-label="前进" title="前进"><ChevronRight size={18} /></button>
              </>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(n => {
            const I = n.icon
            const active = on === n.key
            const badge = n.key === 'new' && pending ? pending : null
            const inner = (
              <>
                {active && <motion.span layoutId="nav-pill" className="bg-sidebar-accent absolute inset-0 rounded-xl" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className={cn('relative grid flex-none place-items-center', active ? 'text-primary' : 'text-[#4E5969]')}><I size={19} strokeWidth={active ? 2.2 : 1.8} /></span>
                {!collapsed && <span className={cn('relative flex-1 truncate text-[14.5px]', active ? 'text-ink font-semibold' : 'text-[#1F2329]')}>{n.label}</span>}
                {!collapsed && 'kbd' in n && <kbd className="text-ink-4 relative font-sans text-[11px]">{n.kbd}</kbd>}
                {badge != null && (
                  <span className={cn('relative grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white', collapsed && 'absolute top-1 right-1 h-4 min-w-4 text-[10px]')} title={`${badge} 场等你分发`}>{badge}</span>
                )}
              </>
            )
            const cls = cn('relative flex h-11 items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-black/[.035]', collapsed && 'justify-center px-0')
            return n.to == null ? (
              <button key={n.key} className={cls} onClick={onSearch} title={n.label}>{inner}</button>
            ) : (
              <a key={n.key} href={href(n.to)} className={cls} title={n.label}>{inner}</a>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="mt-7 flex min-h-0 flex-1 flex-col">
            <div className="text-ink-3 px-3 pb-2 text-[13px]">最近会议</div>
            <div className="-mx-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1 pb-2">
              {recent.map(m => {
                const act = openMeeting === m.id
                return (
                  <a key={m.id} href={href(`/m/${m.id}`)} className={cn('group relative rounded-xl px-3 py-2.5 transition-colors', act ? 'bg-sidebar-accent' : 'hover:bg-black/[.035]')}>
                    <div className="flex items-center gap-2.5">
                      <span className={cn('flex-none', act ? 'bg-primary size-2 rounded-[3px]' : 'size-1.5 rounded-full bg-[#1F2329]')} />
                      <span className={cn('flex-1 truncate text-[14px]', act ? 'font-semibold' : 'font-medium text-[#1F2329]')}>{m.title}</span>
                      {!dispatched[m.id] && <span className="flex-none rounded-md bg-amber-100 px-1.5 py-px text-[10.5px] font-medium text-amber-700">待分发</span>}
                    </div>
                    <div className="text-ink-3 mt-1 pl-[18px] text-[12.5px] tabular-nums">{cnDate(m.date)}{m.time ? ` ${m.time}` : ''} · {m.publisher === ME ? '我发布' : `${personById(m.publisher).name} 发布`}</div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
        {collapsed && <div className="flex-1" />}

        <div className="mt-2 border-t border-black/[.05] pt-2">
          <AccountMenu collapsed={collapsed} />
        </div>
      </div>
    </motion.aside>
  )
}
