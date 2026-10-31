// 我的日程：会议和待办放在同一张日历上（默认），右边是收件箱和未排期。
// 切到“会议”：我发布的（我上传、我确认后才发出去）、发给我的（别人发布、路由给我的简报）、全部会议按项目归档。
// 发布者和收到者是同一个人的两面，身份切换在右上角。
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Clapperboard, Clock3, MessageCircleQuestion, Play, SquarePen, UserCheck, Waypoints } from 'lucide-react'
import { ME, PROJECTS, RANKS, STAFF, personById, projectById, type PersonId, type Rank } from '@/data/model'
import { MEETINGS, itemById, type Meeting } from '@/data/meetings'
import { inboxOf, isQuiet, outboxOf } from '@/data/derive'
import { RUN_ID } from '@/data/run'
import { go, href, useRoute } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { cn, cnDate, weekday } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TopBar } from '@/components/shell/TopBar'
import { Face, FaceStack, Kb, LeaderTag, RankTag, SourceChip } from '@/components/common/bits'
import { BriefPaper, NOTE_COLORS, Sticky, StickyNotes } from '@/components/sketch/Briefs'
import { Schedule } from '@/components/schedule/Schedule'

const TODAY = '2026-10-31'
const hello = () => {
  const h = new Date().getHours()
  return h < 11 ? '上午好' : h < 13 ? '中午好' : h < 18 ? '下午好' : '晚上好'
}

export function Home() {
  const route = useRoute()
  const as = (route.query.get('as') as PersonId | null) ?? ME
  const view = route.query.get('v') === 'meet' ? 'meet' : 'cal'
  const me = personById(as)
  const dispatched = useStore(s => s.dispatched)
  const outbox = outboxOf(as)
  const inbox = useMemo(
    () => inboxOf(as, id => !!dispatched[id]).sort((a, b) => (b.meeting.date + b.meeting.time).localeCompare(a.meeting.date + a.meeting.time)),
    [as, dispatched],
  )

  return (
    <>
      <TopBar crumbs={[{ label: '我的日程', to: '/' }, ...(as !== ME ? [{ label: `以 ${me.name} 的身份预览` }] : [])]}>
        <Button size="sm" onClick={() => go('/new')}><SquarePen /> 新建会映</Button>
      </TopBar>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-6 py-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] font-semibold tracking-tight">{as === ME ? `${hello()}，${me.name}` : `${me.name} 的会议`}</h1>
              <div className="text-ink-3 mt-1.5 flex flex-wrap items-center gap-1.5 text-[13.5px]">
                <span>{me.team}{me.group ? ` · ${me.group}` : ''} · {me.role}</span>
                <RankTag p={me} /><LeaderTag pid={as} />
                <span className="ml-1">· {cnDate(TODAY)} {weekday(TODAY)}</span>
              </div>
            </div>
            <ViewAs as={as} />
          </header>

          <ViewTabs as={as} view={view} />

          {view === 'cal' ? (
            <Schedule as={as} side={<ToDo as={as} />} />
          ) : (
          <>
            <div className="flex min-w-0 flex-col gap-7">
              <section>
                <SectionHead role="发布者" title="我发布的" sub="你上传、你确认之后，会映才按人发出去" />
                {outbox.length ? (
                  <div className="flex flex-col gap-4">{outbox.map(m => <PublishedCard key={m.id} m={m} />)}</div>
                ) : (
                  <div className="text-ink-3 rounded-2xl border border-dashed px-5 py-6 text-[13.5px]">{me.name} 最近没有发布会议。</div>
                )}
              </section>

              <section>
                <SectionHead role="收到者" title="发给我的" sub={`${inbox.length} 份简报 · 每份只含和你有关的条目，写明为什么发给你`} />
                {inbox.length ? (
                  <div className="sk-board rounded-2xl px-4 pb-3">
                    <div className="sk-stickies">
                      {inbox.map(({ meeting: m, brief: b }, i) => {
                        const pub = personById(m.publisher)
                        return (
                          <Sticky
                            key={m.id}
                            i={i + 2}
                            title={m.title.replace(/ · .*/, '')}
                            count={b.entries.length}
                            foot={<>{pub.name} 发布 · {RANKS[pub.rank].label} · 点开看 →</>}
                            onClick={() => go('/shared', { as, b: m.id })}
                          >
                            <p>{b.headline}</p>
                          </Sticky>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-ink-3 rounded-2xl border border-dashed px-5 py-6 text-[13.5px]">还没有别人发给 {me.name} 的简报。</div>
                )}
              </section>
            </div>

            <AllMeetings />
          </>
          )}
        </div>
      </div>
    </>
  )
}

function SectionHead({ role, title, sub, children }: { role?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-2">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {role && <span className="text-ink-2 rounded-md bg-[#F2F3F5] px-1.5 py-px text-[11.5px]">{role}视角</span>}
      {sub && <span className="text-ink-3 text-[12.5px]">{sub}</span>}
      <span className="ml-auto">{children}</span>
    </div>
  )
}

// ---------------- 身份切换：按职级分组，看清谁是谁 ----------------

const RANK_ORDER: Rank[] = ['exec', 'head', 'lead', 'staff']

function ViewAs({ as }: { as: PersonId }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button className="flex h-9 items-center gap-2 rounded-xl border bg-white pr-2.5 pl-1.5 text-[13px] hover:bg-black/[.02]" onClick={() => setOpen(o => !o)}>
        <Face p={as} size={24} /><span className="text-ink-3">以</span><b className="font-semibold">{personById(as).name}</b><span className="text-ink-3">的身份看</span>
        <ChevronDown size={14} className="text-ink-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-11 right-0 z-30 w-[340px] rounded-2xl border bg-white p-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,.18)]"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
          >
            <div className="text-ink-3 px-2 pt-1 pb-2 text-[12px]">切换身份预览：权限闸和简报都按这个人生效</div>
            {RANK_ORDER.map(r => {
              const list = STAFF.filter(x => x.rank === r)
              return (
                <div key={r} className="mb-1">
                  <div className="text-ink-3 flex items-center gap-1.5 px-2 py-1 text-[11.5px]"><b className="font-mono">{RANKS[r].level}</b>{RANKS[r].label}</div>
                  {list.map(x => (
                    <button key={x.id} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-black/[.04]', x.id === as && 'bg-[#EEF3FF]')} onClick={() => { setOpen(false); go('/', x.id === ME ? {} : { as: x.id }) }}>
                      <Face p={x} size={24} />
                      <span className="min-w-0 flex-1 truncate text-[13px]"><b className="font-medium">{x.name}</b><span className="text-ink-3 ml-1.5 text-[12px]">{x.team} · {x.role}</span></span>
                      <LeaderTag pid={x.id} className="max-w-[110px] truncate" />
                      {x.id === ME && <span className="text-ink-3 text-[11px]">我</span>}
                    </button>
                  ))}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------- 我发布的：视觉重点 ----------------

function PublishedCard({ m }: { m: Meeting }) {
  const dispatched = useStore(s => s.dispatched[m.id])
  const [paper, setPaper] = useState<PersonId | null>(null)
  const p = projectById(m.project)
  const receivers = m.related.filter(x => x !== m.publisher)
  const byRank = RANK_ORDER.map(r => ({ r, n: receivers.filter(x => personById(x).rank === r).length })).filter(x => x.n)
  const quiet = receivers.filter(x => isQuiet(m.id, x))
  const people = [m.publisher, ...receivers.filter(x => !quiet.includes(x)), ...quiet]
  const run = m.id === RUN_ID

  return (
    <motion.div layout className={cn('overflow-hidden rounded-3xl border bg-white', !dispatched && 'border-[#C9D8FF] shadow-[0_18px_40px_-28px_rgba(47,100,242,.6)]')}>
      <div className="flex gap-5 p-5 max-sm:flex-col">
        {m.video ? (
          <a href={href(`/m/${m.id}`)} className="group relative block h-[212px] w-[120px] flex-none overflow-hidden rounded-2xl bg-black" title="回放">
            <img src={m.video.poster} alt="" className="size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" draggable={false} />
            <span className="absolute inset-0 grid place-items-center"><span className="grid size-11 place-items-center rounded-full bg-white/90 text-black shadow-lg transition-transform group-hover:scale-110"><Play size={18} fill="currentColor" className="ml-0.5" /></span></span>
            <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white">09:49</span>
          </a>
        ) : (
          <span className="grid size-[88px] flex-none place-items-center rounded-2xl" style={{ background: p.soft, color: p.color }}><Kb name={p.icon} size={48} /></span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium" style={{ color: p.color, background: p.soft }}><span className="size-1.5 rounded-full" style={{ background: p.color }} />{p.name}</span>
            <span className="text-ink-2 rounded-full bg-[#F2F3F5] px-2 py-0.5">{m.kind}{m.external ? ' · 外部' : ''}</span>
            {dispatched
              ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={13} /> 已分发</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700"><span className="live-dot" /> 已转写 · 等你分发</span>}
          </div>
          <a href={href(`/m/${m.id}`)} className="mt-2 text-[20px] leading-snug font-semibold tracking-tight hover:underline">{m.title}</a>
          <p className="text-ink-2 mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed">{m.summary}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
            <span className="flex items-center gap-2"><span className="text-ink-3">发布者</span><Face p={m.publisher} size={22} /><b className="font-medium">{personById(m.publisher).name}</b><RankTag p={m.publisher} /></span>
            <ArrowRight size={14} className="text-ink-4" />
            <span className="flex items-center gap-2"><span className="text-ink-3">收到者 {receivers.length} 人</span><FaceStack ids={receivers} size={22} max={8} /></span>
            <span className="text-ink-3">{byRank.map(x => `${x.n} 位${RANKS[x.r].label}`).join(' · ')}</span>
          </div>
          {m.external && !dispatched && (
            <p className="text-ink-3 mt-2 text-[12.5px]">直播里没人点到我们任何人的名。会映按每个人负责的事、订阅的话题和管理者规则判断谁该知道，发出去之前先给你看。</p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {dispatched ? (
              <>
                <Button variant="outline" onClick={() => go(`/m/${m.id}`, { tab: 'dist' })}>看分发结果</Button>
                <Button variant="ghost" onClick={() => go(`/m/${m.id}`)}><Play /> 回放与溯源</Button>
              </>
            ) : (
              <>
                <Button onClick={() => go(`/dispatch/${m.id}`, { run: 1 })}><Waypoints /> 开始智能分发</Button>
                <Button variant="outline" onClick={() => go(`/m/${m.id}`)}><Play /> 先看回放</Button>
              </>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {dispatched && (
          <motion.div className="sk-board border-t px-5 pt-3 pb-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <div className="flex items-center gap-2"><Kb name="mailbox" size={24} /><b className="font-hand text-[19px]">每人一份简报 · {run ? '已投递飞书' : `${cnDate(m.date)} 已投递`}</b></div>
            <StickyNotes meeting={m.id} people={people} ready={() => true} onOpen={setPaper} />
          </motion.div>
        )}
      </AnimatePresence>
      <BriefPaper meeting={m.id} pid={paper} onClose={() => setPaper(null)} />
    </motion.div>
  )
}

// ---------------- 日程 / 会议 切换 ----------------

function ViewTabs({ as, view }: { as: PersonId; view: 'cal' | 'meet' }) {
  const dispatched = useStore(s => s.dispatched)
  const waiting = outboxOf(as).filter(m => !dispatched[m.id]).length
  const tabs = [
    { k: 'cal', label: '日程', icon: CalendarDays, hint: '会议和待办放在一张日历上' },
    { k: 'meet', label: '会议', icon: Clapperboard, hint: '我发布的、发给我的、全部会议' },
  ] as const
  return (
    <nav className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex rounded-[14px] bg-[#EEF0F4] p-1 shadow-[inset_0_1px_2px_rgba(16,24,40,.06)]">
        {tabs.map(t => {
          const on = view === t.k
          const I = t.icon
          return (
            <a
              key={t.k}
              href={href('/', { as: as === ME ? undefined : as, v: t.k === 'cal' ? undefined : t.k })}
              className={cn('relative flex h-10 items-center gap-2 rounded-[11px] pr-4 pl-3.5 text-[14.5px] transition-colors', on ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink-2')}
            >
              {on && <motion.span layoutId="home-view" className="absolute inset-0 rounded-[11px] bg-white shadow-[0_1px_2px_rgba(16,24,40,.08),0_6px_16px_-6px_rgba(16,24,40,.18)]" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
              <I size={17} strokeWidth={on ? 2.2 : 1.9} className={cn('relative', on && 'text-primary')} />
              <span className="relative">{t.label}</span>
              {t.k === 'meet' && waiting > 0 && (
                <span className="relative grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white" title={`${waiting} 场等你分发`}>{waiting}</span>
              )}
            </a>
          )
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={view} className="text-ink-3 text-[13px]" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {tabs.find(t => t.k === view)!.hint}
        </motion.span>
      </AnimatePresence>
    </nav>
  )
}

// ---------------- 收件箱：需要我先表态的事，一张张小便利贴 ----------------

interface Todo { key: string; tone: number; kind: string; icon: ReactNode; title: string; sub?: string; item?: string; act?: ReactNode }

function ToDo({ as }: { as: PersonId }) {
  const dispatched = useStore(s => s.dispatched)
  const owners = useStore(s => s.owners)
  const confirmed = useStore(s => s.confirmed)
  const answered = useStore(s => s.answered)
  const events = useStore(s => s.events)
  const done = useStore(s => s.done)
  const rows: Todo[] = []
  // 追问发给条目负责人；没有负责人的回到发布者
  const askedTo = (item: string, meeting: string) => owners[item] ?? itemById(item).owner ?? meetingPublisher(meeting)

  for (const e of events.filter(e => e.kind === 'ask' && !answered[e.id] && e.item && askedTo(e.item, e.meeting) === as)) {
    const reply = REPLY[e.item!] ?? '已转给林夏核实'
    rows.push({
      key: `ask${e.id}`, tone: 2, kind: '追问', icon: <MessageCircleQuestion size={14} />, title: `${personById(e.person).name}：${e.text}`, item: e.item,
      act: <button className="sk-mini-btn" onClick={() => actions.answer(e.id, reply)}>{reply.length > 10 ? '回复' : reply}</button>,
    })
  }
  if (as === ME && dispatched[RUN_ID] && !owners.xm_18) {
    rows.push({
      key: 'verify', tone: 4, kind: '待核实', icon: <UserCheck size={14} />, title: '“行业内首个万人级培训”没给出处，物料引用前要核实', item: 'xm_18',
      act: <button className="sk-mini-btn" onClick={() => actions.assign('xm_18', 'linxia')}>交给组员林夏</button>,
    })
  }
  if (as === ME && dispatched[RUN_ID] && owners.xm_18) {
    rows.push({ key: 'verify2', tone: 3, kind: confirmed.xm_18 ? '已接手' : '已指派', icon: <UserCheck size={14} />, title: `林夏${confirmed.xm_18 ? '确认负责' : '待确认'}：核实“行业首个”的出处`, item: 'xm_18' })
  }
  for (const m of MEETINGS) {
    // 确认过的待办已经上了日历，收件箱里只留还没表态的
    for (const it of m.items.filter(i => i.type === 'action' && (owners[i.id] ?? i.owner) === as && dispatched[m.id] && !done[i.id] && !confirmed[i.id])) {
      rows.push({
        key: it.id, tone: 1, kind: '待我确认', icon: <Clock3 size={14} />,
        title: it.title, sub: `${it.due ? `${it.due} 截止 · ` : it.flags?.includes('缺截止') ? '还没定截止 · ' : ''}${m.title}`, item: it.id,
        act: <button className="sk-mini-btn" onClick={() => actions.confirm(it.id, as)}>我来负责</button>,
      })
    }
  }
  if (as === ME) {
    rows.push({
      key: 'gap', tone: 5, kind: '跨会议发现', icon: <Kb name="brain" size={15} />, title: '竞品安全评审有一票否决权，我们的安委会还没有', sub: '小米直播 × 10/28 安全周会',
      act: <button className="sk-mini-btn" onClick={() => go('/kb', { q: '竞品的一票否决和我们差在哪？' })}>看依据</button>,
    })
  }

  return (
    <aside className="min-w-0">
      <SectionHead title="收件箱" sub={`${rows.length} 件 · 需要你先表态`} />
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.div
              key={r.key}
              layout
              className="sk-todo"
              style={{ background: NOTE_COLORS[r.tone % NOTE_COLORS.length], rotate: `${i % 2 ? 0.6 : -0.8}deg` }}
              initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 30, height: 0 }}
              whileHover={{ rotate: '0deg', y: -2 }}
            >
              <div className="flex items-center gap-1.5 text-[12px] opacity-70">{r.icon}<span>{r.kind}</span></div>
              <div className="mt-1 text-[15px] leading-snug">{r.title}</div>
              {r.sub && <div className="mt-0.5 text-[12.5px] opacity-60">{r.sub}</div>}
              <div className="mt-1.5 flex items-center gap-2">
                {r.item && <SourceChip item={itemById(r.item)} className="-ml-0.5 min-w-0 font-sans" />}
                {r.act && <span className="ml-auto flex-none">{r.act}</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!rows.length && <div className="text-ink-3 rounded-2xl border border-dashed px-4 py-5 text-[13px]">收件箱清空了。</div>}
      </div>
    </aside>
  )
}

const meetingPublisher = (id: string) => MEETINGS.find(m => m.id === id)!.publisher

const REPLY: Record<string, string> = {
  ow_06: '11/3 先发门店一版草稿',
  xm_01: '直播里没说期限，已让林夏去门店核实',
  xm_19: '直播只说了 4000 积分，没说折算，已转林夏查规则',
}

// ---------------- 全部会议：按项目，标明 Leader ----------------

function AllMeetings() {
  const dispatched = useStore(s => s.dispatched)
  const confirmed = useStore(s => s.confirmed)
  const custom = useStore(s => s.projects)
  const projects = [...PROJECTS, ...custom]
  return (
    <section>
      <SectionHead title="全部会议" sub="按项目归档；点一行打开回放，原话、逐字稿、录像互相定位" />
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map(p => {
          const ms = MEETINGS.filter(m => m.project === p.id).sort((a, b) => b.date.localeCompare(a.date))
          return (
            <div key={p.id} className="rounded-2xl border bg-white">
              <div className="flex items-center gap-2.5 border-b px-4 py-3">
                <span style={{ color: p.color }}><Kb name={p.icon} size={26} /></span>
                <div className="min-w-0 flex-1">
                  <b className="text-[14.5px]">{p.name}</b>
                  <div className="text-ink-3 truncate text-[12px]">{p.desc}</div>
                </div>
                <span className="flex flex-none items-center gap-1.5 text-[12px]" title="项目组 Leader"><Face p={p.leader} size={22} /><span className="text-ink-2">{personById(p.leader).name}</span><span className="rounded-md bg-amber-50 px-1.5 text-[11px] leading-[18px] text-amber-700">Leader</span></span>
              </div>
              {ms.length ? ms.map(m => {
                const acts = m.items.filter(i => i.type === 'action')
                const ok = acts.filter(i => confirmed[i.id]).length
                const n = new Set(m.routes.map(r => r.person)).size
                return (
                  <a key={m.id} href={href(`/m/${m.id}`)} className="group flex items-center gap-3 border-b px-4 py-2.5 last:border-0 hover:bg-black/[.015]">
                    <span className="text-ink-3 w-10 flex-none text-[12px] tabular-nums">{m.date.slice(5).replace('-', '/')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{m.title}</span>
                      <span className="text-ink-3 block truncate text-[12px]">{personById(m.publisher).name} 发布 → {n} 人收到{acts.length ? ` · 待办确认 ${ok}/${acts.length}` : ''}</span>
                    </span>
                    {dispatched[m.id]
                      ? <ArrowRight size={14} className="text-ink-4 group-hover:text-ink flex-none" />
                      : <span className="flex-none rounded-md bg-amber-50 px-1.5 py-0.5 text-[11.5px] text-amber-700">待分发</span>}
                  </a>
                )
              }) : <div className="text-ink-3 px-4 py-4 text-[12.5px]">还没有会议，新建会议时选这个项目。</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
