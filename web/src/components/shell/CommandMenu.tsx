import { CalendarCheck, FileText, LayoutTemplate, Library, SquarePen } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { ALL_ITEMS, MEETINGS } from '@/data/meetings'
import { RANKS, STAFF, personById, projectById } from '@/data/model'
import { itemTime, mmss } from '@/data/derive'
import { RUN_ID } from '@/data/run'
import { go, goSource } from '@/lib/router'
import { cnDate } from '@/lib/utils'
import { Face, TypePill } from '@/components/common/bits'

const PAGES = [
  { label: '与我有关', icon: CalendarCheck, to: '/' },
  { label: '新建会映', icon: SquarePen, to: '/new' },
  { label: '会议知识库', icon: Library, to: '/kb' },
  { label: '模板中心', icon: LayoutTemplate, to: '/templates' },
]

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const run = (f: () => void) => { onOpenChange(false); f() }
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="搜索会议" description="搜索会议、条目、原话或人">
      <CommandInput placeholder="搜会议、条目、原话或人，例如“压测”" />
      <CommandList className="max-h-[440px]">
        <CommandEmpty>没有找到。</CommandEmpty>
        <CommandGroup heading="会议">
          {MEETINGS.map(m => (
            <CommandItem key={m.id} value={`会议 ${m.title} ${projectById(m.project).name}`} onSelect={() => run(() => go(`/m/${m.id}`))}>
              <span className="size-2 rounded-full" style={{ background: projectById(m.project).color }} />
              {m.title}
              <span className="text-muted-foreground text-xs">{projectById(m.project).name}</span>
              <CommandShortcut>{cnDate(m.date)}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="账本条目">
          {ALL_ITEMS.map(it => (
            <CommandItem key={it.id} value={`条目 ${it.id} ${it.title} ${it.quote} ${it.topic}`} onSelect={() => run(() => goSource(it.meeting, Math.max(0, itemTime(it) - 0.4), it.id))}>
              <TypePill item={it} />
              <span className="truncate">{it.title}</span>
              <CommandShortcut>{mmss(itemTime(it))}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="逐字稿">
          {MEETINGS.flatMap(m => m.segments.map(s => (
            <CommandItem key={m.id + s.id} value={`原话 ${personById(s.speaker).name} ${s.text} ${m.title}`} onSelect={() => run(() => goSource(m.id, s.start))}>
              <Face p={s.speaker} size={20} />
              <span className="truncate">{s.text}</span>
              <CommandShortcut className="tracking-normal">{m.title.slice(0, 6)} {mmss(s.start)}</CommandShortcut>
            </CommandItem>
          )))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="人">
          {STAFF.map(p => (
            <CommandItem key={p.id} value={`人 ${p.name} ${p.role} ${p.team} ${RANKS[p.rank].label}`} onSelect={() => run(() => go('/', { as: p.id }))}>
              <Face p={p} size={20} />{p.name}<span className="text-muted-foreground text-xs">{RANKS[p.rank].level} {RANKS[p.rank].label} · {p.role}</span>
              <CommandShortcut className="tracking-normal">看 TA 收到的</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="跳转">
          {PAGES.map(({ label, icon: I, to }) => (
            <CommandItem key={to} value={`页面 ${label}`} onSelect={() => run(() => go(to))}><I /> {label}</CommandItem>
          ))}
          <CommandItem value="页面 逐字稿 原文 小米 直播" onSelect={() => run(() => go(`/m/${RUN_ID}`))}><FileText /> 打开小米安全专场直播的逐字稿</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
