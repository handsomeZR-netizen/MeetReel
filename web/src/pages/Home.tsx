// 我的会议：主持人的工作台。按项目组织会议；右侧是“需要你处理”和回流动态。
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Eye, MessageCircleQuestion, Play, Send, SquarePen, UserCheck, Waypoints } from 'lucide-react'
import { ITEM_TYPES, ME, PROJECTS, personById, projectById, type ProjectId } from '@/data/model'
import { ALL_ITEMS, MEETINGS, itemById, meetingById, type Meeting } from '@/data/meetings'
import { itemTime, mmss } from '@/data/derive'
import { go, goSource, href, useRoute } from '@/lib/router'
import { actions, useStore, type FeedEvent } from '@/lib/store'
import { cn, cnDate, weekday } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/misc'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TopBar } from '@/components/shell/TopBar'
import { Face, FaceStack, Kb, SourceChip, TypePill } from '@/components/common/bits'

const TODAY = '2026-10-31'

export function Home() {
  const route = useRoute()
  const project = route.query.get('project') as ProjectId | null
  const dispatched = useStore(s => s.dispatched)
  const confirmed = useStore(s => s.confirmed)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (route.query.has('feed')) feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const id = setTimeout(actions.seen, 2500)
    return () => clearTimeout(id)
  }, [route.raw])

  const meetings = useMemo(() => [...MEETINGS].filter(m => !project || m.project === project).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [project])
  const thisWeek = MEETINGS.filter(m => m.date >= '2026-10-26').length
  const briefs = MEETINGS.filter(m => dispatched[m.id]).reduce((n, m) => n + new Set(m.routes.map(r => r.person)).size, 0)
  const informedAbsent = MEETINGS.filter(m => dispatched[m.id]).reduce((n, m) => n + new Set(m.routes.map(r => r.person).filter(p => !m.attendees.includes(p))).size, 0)
  const actionsAll = ALL_ITEMS.filter(i => i.type === 'action' && dispatched[i.meeting])
  const okAll = actionsAll.filter(i => confirmed[i.id]).length

  return (
    <>
      <TopBar crumbs={[{ label: '我的会议', to: '/' }, ...(project ? [{ label: projectById(project).name }] : [])]}>
        <Button size="sm" onClick={() => go('/new')}><SquarePen /> 新建会议</Button>
      </TopBar>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight">上午好，{personById(ME).name}</h1>
              <p className="text-ink-3 mt-1 text-[14px]">{cnDate(TODAY)} {weekday(TODAY)} · 本周 {thisWeek} 场会 · 会映已经替你把纪要按人发出去了</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon="calendar" label="本周会议" value={`${thisWeek}`} unit="场" foot="全部已转写，可回放溯源" />
            <Kpi icon="mailbox" label="已分发简报" value={`${briefs}`} unit="份" foot="每人只收和自己有关的" />
            <Kpi icon="team" label="没参会也没漏" value={`${informedAbsent}`} unit="人次" foot="缺席的人也收到了自己那份" />
            <Kpi icon="stamp" label="待办确认" value={`${okAll}/${actionsAll.length}`} foot="负责人在飞书里点“确认”">
              <Progress value={(okAll / Math.max(1, actionsAll.length)) * 100} className="mt-2 h-1.5" indicatorClassName="bg-emerald-500" />
            </Kpi>
          </div>

          <AnimatePresence>{!dispatched.d11 && <PendingBanner />}</AnimatePresence>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <section>
                <SectionHead title="项目" sub="会议按项目归档，账本和待办跟着项目走" />
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  {PROJECTS.map(p => {
                    const ms = MEETINGS.filter(m => m.project === p.id)
                    const acts = ms.flatMap(m => m.items).filter(i => i.type === 'action')
                    const ok = acts.filter(i => confirmed[i.id]).length
                    const risks = ms.flatMap(m => m.items).filter(i => i.type === 'risk').length
                    const on = project === p.id
                    return (
                      <a key={p.id} href={href('/', on ? {} : { project: p.id })} className={cn('kb-tile kb-wiggle flex flex-col rounded-2xl border bg-white p-4', on && 'border-ink')}>
                        <div className="flex items-start gap-3">
                          <span style={{ color: p.color }}><Kb name={p.icon} size={34} /></span>
                          <div className="min-w-0 flex-1">
                            <b className="block text-[15px] font-semibold">{p.name}</b>
                            <span className="text-ink-3 line-clamp-1 text-[12.5px]">{p.desc}</span>
                          </div>
                        </div>
                        <div className="text-ink-2 mt-3 flex items-center gap-3 text-[12.5px]">
                          <span>{ms.length} 场会</span><span>{acts.length} 条待办</span>{risks > 0 && <span className="text-rose-600">{risks} 个风险</span>}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"><span className="block h-full rounded-full transition-all" style={{ width: `${(ok / Math.max(1, acts.length)) * 100}%`, background: p.color }} /></span>
                          <span className="text-ink-3 text-[11.5px] tabular-nums">{ok}/{acts.length}</span>
                        </div>
                        <div className="mt-3"><FaceStack ids={p.members} size={22} max={6} /></div>
                      </a>
                    )
                  })}
                </div>
              </section>

              <section>
                <SectionHead title={project ? `${projectById(project).name} · 会议` : '全部会议'} sub="点一行打开回放；原话、逐字稿、录像互相定位">
                  {project && <a href={href('/')} className="text-primary text-[13px]">看全部</a>}
                </SectionHead>
                <div className="overflow-hidden rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="pl-4">会议</TableHead><TableHead>时间</TableHead><TableHead>相关人</TableHead>
                        <TableHead>账本</TableHead><TableHead>分发</TableHead><TableHead className="pr-4 text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetings.map(m => <MeetingRow key={m.id} m={m} />)}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              <NeedsYou />
              <div ref={feedRef}><Feed /></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 className="text-[16px] font-semibold">{title}</h2>
      {sub && <span className="text-ink-3 text-[12.5px]">{sub}</span>}
      <span className="ml-auto">{children}</span>
    </div>
  )
}

function Kpi({ icon, label, value, unit, foot, children }: { icon: Parameters<typeof Kb>[0]['name']; label: string; value: string; unit?: string; foot: string; children?: ReactNode }) {
  return (
    <div className="kb-tile kb-wiggle rounded-2xl border bg-gradient-to-t from-[#F6F8FE] to-white p-4">
      <div className="flex items-start justify-between">
        <span className="text-ink-3 text-[13px]">{label}</span>
        <span className="text-ink-2"><Kb name={icon} size={28} /></span>
      </div>
      <div className="mt-1 text-[28px] leading-tight font-semibold tabular-nums">{value}{unit && <span className="text-ink-3 ml-1 text-[14px] font-normal">{unit}</span>}</div>
      {children}
      <div className="text-ink-3 mt-1.5 text-[12.5px]">{foot}</div>
    </div>
  )
}

function PendingBanner() {
  const m = meetingById('d11')!
  return (
    <motion.div
      className="flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-[#D6E2FD] bg-gradient-to-r from-[#EEF3FF] via-white to-white px-5 py-4"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: -24 }}
    >
      <span className="text-primary kb-wiggle on"><Kb name="meeting" size={46} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="live-dot" /><b className="text-[15.5px]">{m.title} 刚结束</b><span className="text-ink-3 text-[12.5px]">{cnDate(m.date)} {m.time}</span></div>
        <p className="text-ink-2 mt-0.5 text-[13.5px]">已转写 {m.segments.length} 段发言 · 参会 {m.attendees.length} 人、相关 {m.related.length} 人 · 5 个人没来，但有事需要他们知道</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => go(`/m/${m.id}`)}><Play /> 先看回放</Button>
        <Button onClick={() => go(`/dispatch/${m.id}`, { run: 1 })}><Waypoints /> 开始智能分发</Button>
      </div>
    </motion.div>
  )
}

function MeetingRow({ m }: { m: Meeting }) {
  const dispatched = useStore(s => s.dispatched[m.id])
  const confirmed = useStore(s => s.confirmed)
  const p = projectById(m.project)
  const counts = (['decision', 'action', 'change', 'risk'] as const).map(k => ({ k, n: m.items.filter(i => i.type === k).length })).filter(x => x.n)
  const acts = m.items.filter(i => i.type === 'action')
  const ok = acts.filter(i => confirmed[i.id]).length
  const people = new Set(m.routes.map(r => r.person)).size
  return (
    <TableRow className="group cursor-pointer" onClick={() => go(`/m/${m.id}`)}>
      <TableCell className="py-3 pl-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 flex-none place-items-center rounded-xl" style={{ background: p.soft, color: p.color }}><Kb name={p.icon} size={20} /></span>
          <div className="min-w-0">
            <div className="truncate font-medium">{m.title}</div>
            <div className="text-ink-3 text-xs">{p.name} · {m.source} {mmss(m.duration)}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-ink-2 tabular-nums">{cnDate(m.date)} <span className="text-ink-3">{m.time}</span></TableCell>
      <TableCell><FaceStack ids={m.related} size={22} max={5} ring={pid => (m.attendees.includes(pid) ? '#22C55E' : undefined)} /></TableCell>
      <TableCell>
        <div className="flex gap-2.5 text-xs">
          {counts.map(c => <span key={c.k} className="inline-flex items-center gap-1"><i className="size-1.5 rounded-full" style={{ background: ITEM_TYPES[c.k].color }} />{ITEM_TYPES[c.k].label} {c.n}</span>)}
        </div>
      </TableCell>
      <TableCell>
        {dispatched ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={13} /> {people} 人</span>
            <span className="text-ink-3">确认 {ok}/{acts.length}</span>
          </div>
        ) : <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700"><Clock3 size={12} /> 待分发</span>}
      </TableCell>
      <TableCell className="pr-4 text-right">
        {dispatched
          ? <span className="text-ink-3 group-hover:text-ink inline-flex items-center gap-1 text-xs">回放 <ArrowRight size={13} /></span>
          : <Button size="sm" className="h-7" onClick={e => { e.stopPropagation(); go(`/dispatch/${m.id}`, { run: 1 }) }}><Waypoints /> 分发</Button>}
      </TableCell>
    </TableRow>
  )
}

function NeedsYou() {
  const dispatched = useStore(s => s.dispatched)
  const owners = useStore(s => s.owners)
  const confirmed = useStore(s => s.confirmed)
  const answered = useStore(s => s.answered)
  const asks = useStore(s => s.events.filter(e => e.kind === 'ask' && !answered[e.id]))
  const mine = ALL_ITEMS.filter(i => i.type === 'action' && i.owner === ME && i.meeting !== 'd11')
  const rows: ReactNode[] = []

  if (!dispatched.d11) {
    rows.push(
      <Row key="pending" icon={<Waypoints size={15} />} tone="amber" title="双 11 活动上线评审 待分发" sub="8 位相关人里 5 位没参会">
        <Button size="sm" className="h-7" onClick={() => go('/dispatch/d11', { run: 1 })}>去分发</Button>
      </Row>,
    )
  }
  if (dispatched.d11 && !owners.it_05) {
    rows.push(
      <Row key="owner" icon={<UserCheck size={15} />} tone="amber" title="客户端适配还没有负责人" sub="it_05 · 会上没定，建议赵一" item="it_05">
        <Button size="sm" className="h-7" onClick={() => actions.assign('it_05', 'zhaoyi')}>指派给赵一</Button>
      </Row>,
    )
  }
  for (const e of asks) {
    rows.push(
      <Row key={e.id} icon={<MessageCircleQuestion size={15} />} tone="blue" title={`${personById(e.person).name} 追问：${e.text}`} sub={e.item ? itemById(e.item).title : ''} item={e.item}>
        <Button size="sm" variant="outline" className="h-7" onClick={() => actions.answer(e.id, e.item?.startsWith('it_') ? '已转问孙悦（会上没说公告时间）' : '已转问林总')}>
          {e.item?.startsWith('it_') ? '转问孙悦' : '转问林总'}
        </Button>
      </Row>,
    )
  }
  rows.push(
    <Row key="conflict" icon={<AlertTriangle size={15} />} tone="rose" title="压测排期和 618 复盘的决定冲突" sub="618 定过“至少提前一周压测”，这次只提前 3 天">
      <Button size="sm" variant="outline" className="h-7" onClick={() => go('/kb', { q: '压测风险之前提过吗？' })}>看依据</Button>
    </Row>,
  )
  for (const it of mine.filter(i => !confirmed[i.id] || i.id === 'q4_04')) {
    rows.push(
      <Row key={it.id} icon={<Clock3 size={15} />} tone="gray" title={`你的待办：${it.title}`} sub={`${it.due ? `${it.due} 截止 · ` : ''}${meetingById(it.meeting)!.title}`} item={it.id} />,
    )
  }

  return (
    <section>
      <SectionHead title="需要你处理" sub={`${rows.length} 件`} />
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>{rows}</AnimatePresence>
      </div>
    </section>
  )
}

function Row({ icon, tone, title, sub, item, children }: { icon: ReactNode; tone: 'amber' | 'blue' | 'rose' | 'gray'; title: string; sub?: string; item?: string; children?: ReactNode }) {
  const toneCls = { amber: 'bg-amber-50 text-amber-600', blue: 'bg-[#EEF3FF] text-primary', rose: 'bg-rose-50 text-rose-600', gray: 'bg-muted text-ink-2' }[tone]
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} className="kb-tile rounded-2xl border bg-white p-3">
      <div className="flex items-start gap-2.5">
        <span className={cn('grid size-7 flex-none place-items-center rounded-lg', toneCls)}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] leading-snug font-medium">{title}</div>
          {sub && <div className="text-ink-3 mt-0.5 truncate text-[12px]">{sub}</div>}
          {item && <SourceChip item={itemById(item)} className="-ml-0.5 mt-1" />}
        </div>
        {children && <div className="flex-none">{children}</div>}
      </div>
    </motion.div>
  )
}

const VERB: Record<FeedEvent['kind'], string> = {
  confirm: '确认了', ask: '追问', assign: '指派', not_me: '退回了', answer: '回复', sent: '', read: '',
}

function Feed() {
  const events = useStore(s => s.events)
  return (
    <section>
      <SectionHead title="回流动态" sub="确认、追问、改派都会回到账本" />
      <div className="rounded-2xl border bg-white p-1.5">
        <AnimatePresence initial={false}>
          {events.slice(0, 12).map(e => {
            const it = e.item ? itemById(e.item) : null
            const m = meetingById(e.meeting)!
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, height: 0, backgroundColor: '#EEF3FF' }}
                animate={{ opacity: 1, height: 'auto', backgroundColor: e.fresh ? '#F5F8FF' : 'rgba(255,255,255,0)' }}
                transition={{ duration: 0.5 }}
                className="overflow-hidden rounded-xl"
              >
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
                      {it && e.kind !== 'ask' && <span className="text-ink-2"> <TypePill item={it} className="mx-0.5 align-[1px]" /> {it.title}</span>}
                    </div>
                    <div className="text-ink-3 mt-1 flex items-center gap-1.5 text-[11.5px]">
                      {e.fresh && <span className="live-dot" />}
                      <span>{e.when}</span><span>·</span>
                      <a className="hover:text-ink truncate" href={href(`/m/${m.id}`)} onClick={ev => ev.stopPropagation()}>{m.title}</a>
                      {it && <button className="text-primary ml-auto flex-none hover:underline" onClick={() => goSource(it.meeting, Math.max(0, itemTime(it) - 0.4), it.id)}>原话 {mmss(itemTime(it))}</button>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  )
}
