import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  CalendarCheck, LayoutTemplate, Library, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, SquarePen, Users, Waypoints,
} from 'lucide-react'
import { MEETINGS } from '@/data/meetings'
import { ME, personById } from '@/data/model'
import { href, useRoute } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { Logo } from '@/components/common/bits'

const NAV = [
  { key: 'new', label: '新建会议', icon: SquarePen, to: '/new' },
  { key: 'search', label: '搜索会议', icon: Search, to: null, kbd: 'Ctrl K' },
  { key: 'home', label: '我的会议', icon: CalendarCheck, to: '/' },
  { key: 'shared', label: '共享给我', icon: Users, to: '/shared' },
  { key: 'dispatch', label: '智能分发', icon: Waypoints, to: '/dispatch' },
  { key: 'kb', label: '会议知识库', icon: Library, to: '/kb' },
  { key: 'templates', label: '模板中心', icon: LayoutTemplate, to: '/templates' },
] as const

// 品牌 Logo：scripts/transparent_logo.py 生成到 assets/brand/ 之后自动换上，没有时用内置的 M 标
const brandFiles = import.meta.glob<string>('../../assets/brand/*.png', { eager: true, import: 'default' })
const BRAND = {
  full: Object.entries(brandFiles).find(([k]) => k.endsWith('/logo.png'))?.[1],
  mark: Object.entries(brandFiles).find(([k]) => k.endsWith('/logo-mark.png'))?.[1],
}

function activeKey(path: string[]) {
  const [p0] = path
  if (!p0 || p0 === 'm') return 'home'
  return p0
}

export function Sidebar({ collapsed, onCollapse, onSearch }: { collapsed: boolean; onCollapse: (v: boolean) => void; onSearch: () => void }) {
  const { path } = useRoute()
  const dispatched = useStore(s => s.dispatched)
  const fresh = useStore(s => s.events.filter(e => e.fresh && e.person !== ME).length)
  const [menu, setMenu] = useState(false)
  const on = activeKey(path)
  const openMeeting = path[0] === 'm' || path[0] === 'dispatch' ? path[1] : null
  const me = personById(ME)
  const recent = [...MEETINGS].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const pending = MEETINGS.filter(m => !dispatched[m.id]).length

  return (
    <motion.aside
      className="bg-sidebar relative flex h-full flex-none flex-col overflow-hidden"
      animate={{ width: collapsed ? 68 : 252 }}
      transition={{ type: 'spring', stiffness: 380, damping: 40 }}
    >
      <div className={cn('flex h-full flex-col py-4', collapsed ? 'px-3' : 'px-3.5')}>
        <a href={href('/')} className={cn('mb-4 flex h-14 items-center gap-2.5', collapsed ? 'justify-center px-0' : 'px-2')} aria-label="会映 MeetReel">
          {BRAND.full && BRAND.mark ? (
            <img src={collapsed ? BRAND.mark : BRAND.full} alt="会映 MeetReel" className={cn('block w-auto select-none', collapsed ? 'h-9' : 'h-[52px]')} draggable={false} />
          ) : (
            <>
              <span className="flex-none"><Logo size={30} /></span>
              {!collapsed && <span className="text-[19px] font-bold tracking-tight whitespace-nowrap">会映 <span className="font-semibold">MeetReel</span></span>}
            </>
          )}
        </a>

        <nav className="flex flex-col gap-1">
          {NAV.map(n => {
            const I = n.icon
            const active = on === n.key
            const badge = n.key === 'dispatch' && pending ? pending : n.key === 'shared' && fresh ? fresh : null
            const inner = (
              <>
                {active && <motion.span layoutId="nav-pill" className="bg-sidebar-accent absolute inset-0 rounded-xl" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className={cn('relative grid flex-none place-items-center', active ? 'text-primary' : 'text-[#4E5969]')}><I size={19} strokeWidth={active ? 2.2 : 1.8} /></span>
                {!collapsed && <span className={cn('relative flex-1 truncate text-[14.5px]', active ? 'text-ink font-semibold' : 'text-[#1F2329]')}>{n.label}</span>}
                {!collapsed && 'kbd' in n && <kbd className="text-ink-4 relative font-sans text-[11px]">{n.kbd}</kbd>}
                {badge != null && (
                  <span className={cn('relative grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-semibold text-white', n.key === 'dispatch' ? 'bg-amber-500' : 'bg-rose-500', collapsed && 'absolute top-1 right-1 h-4 min-w-4 text-[10px]')}>{badge}</span>
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
                    <div className="text-ink-3 mt-1 pl-[18px] text-[12.5px] tabular-nums">{cnDate(m.date)} {m.time}</div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
        {collapsed && <div className="flex-1" />}

        <div className="relative mt-2">
          <AnimatePresence>
            {menu && (
              <motion.div
                className="absolute bottom-[calc(100%+6px)] left-0 z-20 w-56 rounded-xl border bg-white p-1.5 shadow-lg"
                initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                <button className="hover:bg-muted flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm" onClick={() => { actions.reset(); setMenu(false); location.hash = '#/' }}>
                  <RotateCcw size={15} /> 重置演示数据
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            className={cn('flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-black/[.035]', collapsed && 'justify-center p-1.5')}
            onClick={() => setMenu(v => !v)}
          >
            <span className="grid size-11 flex-none place-items-center rounded-xl bg-[#E3EBFD] text-[17px] font-semibold text-[#2F64F2]">{me.name[0]}</span>
            {!collapsed && (
              <span className="min-w-0 leading-tight">
                <b className="block text-[15px] font-semibold">{me.name}</b>
                <span className="text-ink-3 text-[12.5px]">{me.team} | 团队版</span>
              </span>
            )}
          </button>
          <button className="text-ink-3 hover:text-ink mt-2 ml-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={() => onCollapse(!collapsed)} aria-label={collapsed ? '展开侧栏' : '收起侧栏'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
