import { CalendarCheck, FileText, Library, Network, SquarePen, SquarePlay } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { ALL_ITEMS, MEETINGS } from '@/data/meetings'
import { RANKS, STAFF, personById, projectById } from '@/data/model'
import { itemTime, mmss } from '@/data/derive'
import { RUN_ID } from '@/data/run'
import { go, goSource } from '@/lib/router'
import { cnDate } from '@/lib/utils'
import { Face, TypePill } from '@/components/common/bits'
import { L } from '@/lib/i18n'

const PAGES = [
  { label: L('与我有关', 'For me'), icon: CalendarCheck, to: '/' },
  { label: L('新建会映', 'New reel'), icon: SquarePen, to: '/new' },
  { label: L('每人 30 秒', '30s per person'), icon: SquarePlay, to: '/reel' },
  { label: L('会议知识库', 'Knowledge base'), icon: Library, to: '/kb' },
  { label: L('组织与角色', 'Org & roles'), icon: Network, to: '/org' },
]

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const run = (f: () => void) => { onOpenChange(false); f() }
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={L('搜索会议', 'Search meetings')} description={L('搜索会议、条目、原话或人', 'Search meetings, items, quotes or people')}>
      <CommandInput placeholder={L('搜会议、条目、原话或人，例如“压测”', 'Search meetings, items, quotes or people — e.g. “veto”')} />
      <CommandList className="max-h-[440px]">
        <CommandEmpty>{L('没有找到。', 'No results.')}</CommandEmpty>
        <CommandGroup heading={L('会议', 'Meetings')}>
          {MEETINGS.map(m => (
            <CommandItem key={m.id} value={`${L('会议', 'meeting')} ${m.title} ${projectById(m.project).name}`} onSelect={() => run(() => go(`/m/${m.id}`))}>
              <span className="size-2 rounded-full" style={{ background: projectById(m.project).color }} />
              {m.title}
              <span className="text-muted-foreground text-xs">{projectById(m.project).name}</span>
              <CommandShortcut>{cnDate(m.date)}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={L('账本条目', 'Ledger items')}>
          {ALL_ITEMS.map(it => (
            <CommandItem key={it.id} value={`${L('条目', 'item')} ${it.id} ${it.title} ${it.quote} ${it.topic}`} onSelect={() => run(() => goSource(it.meeting, Math.max(0, itemTime(it) - 0.4), it.id))}>
              <TypePill item={it} />
              <span className="truncate">{it.title}</span>
              <CommandShortcut>{mmss(itemTime(it))}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={L('逐字稿', 'Transcript')}>
          {MEETINGS.flatMap(m => m.segments.map(s => (
            <CommandItem key={m.id + s.id} value={`${L('原话', 'quote')} ${personById(s.speaker).name} ${s.text} ${m.title}`} onSelect={() => run(() => goSource(m.id, s.start))}>
              <Face p={s.speaker} size={20} />
              <span className="truncate">{s.text}</span>
              <CommandShortcut className="tracking-normal">{L(m.title.slice(0, 6), m.title.split(' ').slice(0, 2).join(' '))} {mmss(s.start)}</CommandShortcut>
            </CommandItem>
          )))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={L('人', 'People')}>
          {STAFF.map(p => (
            <CommandItem key={p.id} value={`${L('人', 'person')} ${p.name} ${p.role} ${p.team} ${RANKS[p.rank].label}`} onSelect={() => run(() => go('/', { as: p.id }))}>
              <Face p={p} size={20} />{p.name}<span className="text-muted-foreground text-xs">{RANKS[p.rank].level} {RANKS[p.rank].label} · {p.role}</span>
              <CommandShortcut className="tracking-normal">{L('看 TA 收到的', 'See what they got')}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={L('跳转', 'Go to')}>
          {PAGES.map(({ label, icon: I, to }) => (
            <CommandItem key={to} value={`${L('页面', 'page')} ${label}`} onSelect={() => run(() => go(to))}><I /> {label}</CommandItem>
          ))}
          <CommandItem value={L('页面 逐字稿 原文 小米 直播', 'page transcript xiaomi livestream')} onSelect={() => run(() => go(`/m/${RUN_ID}`))}><FileText /> {L('打开小米安全专场直播的逐字稿', 'Open the Xiaomi safety livestream transcript')}</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
