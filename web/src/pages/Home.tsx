// 与我有关（原“我的日程”）：会议和待办放在同一张日历上（默认），右边是收件箱和未排期。
// 切到“会议”：我发布的（我上传、我确认后才发出去）、发给我的（别人发布、路由给我的简报）、全部会议按项目归档。
// 发布者和收到者是同一个人的两面，身份切换在右上角。
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Clapperboard, Clock3, MessageCircleQuestion, Play, SquarePen, UserCheck, Waypoints } from 'lucide-react'
import { ME, PROJECTS, RANKS, STAFF, personById, projectById, term, type PersonId, type Rank } from '@/data/model'
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
import { ViewSwitch } from '@/components/common/ViewSwitch'
import { L } from '@/lib/i18n'

const TODAY = '2026-10-31'
const hello = () => {
  const h = new Date().getHours()
  return h < 11 ? L('上午好', 'Good morning') : h < 13 ? L('中午好', 'Good afternoon') : h < 18 ? L('下午好', 'Good afternoon') : L('晚上好', 'Good evening')
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
      <TopBar crumbs={[{ label: L('与我有关', 'For me'), to: '/' }, ...(as !== ME ? [{ label: L(`以 ${me.name} 的身份预览`, `Previewing as ${me.name}`) }] : [])]}>
        <Button size="sm" onClick={() => go('/new')}><SquarePen /> {L('新建会映', 'New reel')}</Button>
      </TopBar>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-6 py-6 max-md:gap-5 max-md:px-4 max-md:py-4">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] font-semibold tracking-tight">{as === ME ? L(`${hello()}，${me.name}`, `${hello()}, ${me.name}`) : L(`${me.name} 的会议`, `${me.name}’s meetings`)}</h1>
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
                <SectionHead role={L('发布者', 'Publisher')} title={L('我发布的', 'Published by me')} sub={L('你上传、你确认之后，会映才按人发出去', 'MeetReel only sends per person after you upload and confirm')} />
                {outbox.length ? (
                  <div className="flex flex-col gap-4">{outbox.map(m => <PublishedCard key={m.id} m={m} />)}</div>
                ) : (
                  <div className="text-ink-3 rounded-2xl border border-dashed px-5 py-6 text-[13.5px]">{L(`${me.name} 最近没有发布会议。`, `${me.name} hasn’t published any meetings recently.`)}</div>
                )}
              </section>

              <section>
                <SectionHead role={L('收到者', 'Recipient')} title={L('发给我的', 'Sent to me')} sub={L(`${inbox.length} 份简报 · 每份只含和你有关的条目，写明为什么发给你`, `${inbox.length} briefs · each holds only what concerns you, and says why`)} />
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
                            foot={<>{L(`${pub.name} 发布`, `From ${pub.name}`)} · {RANKS[pub.rank].label} · {L('点开看 →', 'Open →')}</>}
                            onClick={() => go('/shared', { as, b: m.id })}
                          >
                            <p>{b.headline}</p>
                          </Sticky>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-ink-3 rounded-2xl border border-dashed px-5 py-6 text-[13.5px]">{L(`还没有别人发给 ${me.name} 的简报。`, `Nobody has sent ${me.name} a brief yet.`)}</div>
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
      {role && <span className="text-ink-2 rounded-md bg-[#F2F3F5] px-1.5 py-px text-[11.5px]">{L(`${role}视角`, `${role} view`)}</span>}
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
      <button className="sg-raised flex h-9 items-center gap-2 rounded-full pr-3 pl-1 text-[13px] transition-transform hover:-translate-y-px" onClick={() => setOpen(o => !o)}>
        <Face p={as} size={24} /><span className="text-ink-3">{L('以', 'Viewing as')}</span><b className="font-semibold">{personById(as).name}</b><span className="text-ink-3">{L('的身份看', '')}</span>
        <ChevronDown size={14} className="text-ink-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="pc-sheet absolute top-11 right-0 z-30 w-[340px] rounded-[22px] p-2"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
          >
            <div className="text-ink-3 px-2 pt-1 pb-2 text-[12px]">{L('切换身份预览：权限闸和简报都按这个人生效', 'Preview as someone else: permissions and briefs apply as that person')}</div>
            {RANK_ORDER.map(r => {
              const list = STAFF.filter(x => x.rank === r)
              return (
                <div key={r} className="mb-1">
                  <div className="text-ink-3 flex items-center gap-1.5 px-2 py-1 text-[11.5px]"><b className="font-mono">{RANKS[r].level}</b>{RANKS[r].label}</div>
                  {list.map(x => (
                    <button key={x.id} className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/80', x.id === as && 'sg-raised')} onClick={() => { setOpen(false); go('/', x.id === ME ? {} : { as: x.id }) }}>
                      <Face p={x} size={24} />
                      <span className="min-w-0 flex-1 truncate text-[13px]"><b className="font-medium">{x.name}</b><span className="text-ink-3 ml-1.5 text-[12px]">{x.team} · {x.role}</span></span>
                      <LeaderTag pid={x.id} className="max-w-[110px] truncate" />
                      {x.id === ME && <span className="text-ink-3 text-[11px]">{L('我', 'me')}</span>}
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
          <a href={href(`/m/${m.id}`)} className="group relative block h-[212px] w-[120px] flex-none overflow-hidden rounded-2xl bg-black" title={L('回放', 'Replay')}>
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
            <span className="text-ink-2 rounded-full bg-[#F2F3F5] px-2 py-0.5">{m.kind}{m.external ? L(' · 外部', ' · external') : ''}</span>
            {dispatched
              ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={13} /> {L('已分发', 'Sent')}</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700"><span className="live-dot" /> {L('已转写 · 等你分发', 'Transcribed · ready to send')}</span>}
          </div>
          <a href={href(`/m/${m.id}`)} className="mt-2 text-[20px] leading-snug font-semibold tracking-tight hover:underline">{m.title}</a>
          <p className="text-ink-2 mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed">{m.summary}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
            <span className="flex items-center gap-2"><span className="text-ink-3">{L('发布者', 'Publisher')}</span><Face p={m.publisher} size={22} /><b className="font-medium">{personById(m.publisher).name}</b><RankTag p={m.publisher} /></span>
            <ArrowRight size={14} className="text-ink-4" />
            <span className="flex items-center gap-2"><span className="text-ink-3">{L(`收到者 ${receivers.length} 人`, `${receivers.length} recipients`)}</span><FaceStack ids={receivers} size={22} max={8} /></span>
            <span className="text-ink-3">{byRank.map(x => L(`${x.n} 位${RANKS[x.r].label}`, `${x.n} ${RANKS[x.r].label}${x.n > 1 ? 's' : ''}`)).join(' · ')}</span>
          </div>
          {m.external && !dispatched && (
            <p className="text-ink-3 mt-2 text-[12.5px]">{L('直播里没人点到我们任何人的名。会映按每个人负责的事、订阅的话题和管理者规则判断谁该知道，发出去之前先给你看。', 'Nobody on our side was named in the stream. MeetReel decides who should know from what each person owns, the topics they follow and manager rules — and shows you before sending.')}</p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {dispatched ? (
              <>
                <Button variant="outline" onClick={() => go(`/m/${m.id}`, { tab: 'dist' })}>{L('看分发结果', 'See results')}</Button>
                <Button variant="ghost" onClick={() => go(`/m/${m.id}`)}><Play /> {L('回放与溯源', 'Replay & sources')}</Button>
              </>
            ) : (
              <>
                <Button onClick={() => go(`/dispatch/${m.id}`, { run: 1 })}><Waypoints /> {L('开始智能分发', 'Start dispatch')}</Button>
                <Button variant="outline" onClick={() => go(`/m/${m.id}`)}><Play /> {L('先看回放', 'Watch first')}</Button>
              </>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {dispatched && (
          <motion.div className="sk-board border-t px-5 pt-3 pb-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <div className="flex items-center gap-2"><Kb name="mailbox" size={24} /><b className="font-hand text-[19px]">{L('每人一份简报', 'One brief per person')} · {run ? L('已投递飞书', 'delivered to Lark') : L(`${cnDate(m.date)} 已投递`, `delivered ${cnDate(m.date)}`)}</b></div>
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
  const link = (v?: string) => href('/', { as: as === ME ? undefined : as, v })
  return (
    <ViewSwitch
      id="home-view"
      className="-mt-2"
      value={view}
      items={[
        { k: 'cal', label: L('日程', 'Calendar'), icon: CalendarDays, hint: L('会议和待办放在一张日历上', 'Meetings and to-dos on one calendar'), href: link() },
        {
          k: 'meet', label: L('会议', 'Meetings'), icon: Clapperboard, hint: L('我发布的、发给我的、全部会议', 'Published by me, sent to me, all meetings'), href: link('meet'),
          badge: waiting > 0 && <span className="relative grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white" title={L(`${waiting} 场等你分发`, `${waiting} waiting for you to dispatch`)}>{waiting}</span>,
        },
      ]}
    />
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
    const reply = REPLY[e.item!] ?? L('已转给林夏核实', 'Passed to Lin Xia to verify')
    rows.push({
      key: `ask${e.id}`, tone: 2, kind: L('追问', 'Question'), icon: <MessageCircleQuestion size={14} />, title: `${personById(e.person).name}${L('：', ': ')}${e.text}`, item: e.item,
      act: <button className="sk-mini-btn" onClick={() => actions.answer(e.id, reply)}>{reply.length > L(10, 24) ? L('回复', 'Reply') : reply}</button>,
    })
  }
  if (as === ME && dispatched[RUN_ID] && !owners.xm_18) {
    rows.push({
      key: 'verify', tone: 4, kind: term('待核实'), icon: <UserCheck size={14} />, title: L('“行业内首个万人级培训”没给出处，物料引用前要核实', '“First in the industry to train 10,000 people” has no source — verify before our materials cite it'), item: 'xm_18',
      act: <button className="sk-mini-btn" onClick={() => actions.assign('xm_18', 'linxia')}>{L('交给组员林夏', 'Hand to Lin Xia')}</button>,
    })
  }
  if (as === ME && dispatched[RUN_ID] && owners.xm_18) {
    rows.push({ key: 'verify2', tone: 3, kind: confirmed.xm_18 ? L('已接手', 'Taken') : L('已指派', 'Assigned'), icon: <UserCheck size={14} />, title: L(`林夏${confirmed.xm_18 ? '确认负责' : '待确认'}：核实“行业首个”的出处`, `Lin Xia ${confirmed.xm_18 ? 'owns it' : 'hasn’t confirmed'}: verify the source of “first in the industry”`), item: 'xm_18' })
  }
  for (const m of MEETINGS) {
    // 确认过的待办已经上了日历，收件箱里只留还没表态的
    for (const it of m.items.filter(i => i.type === 'action' && (owners[i.id] ?? i.owner) === as && dispatched[m.id] && !done[i.id] && !confirmed[i.id])) {
      rows.push({
        key: it.id, tone: 1, kind: L('待我确认', 'Needs my OK'), icon: <Clock3 size={14} />,
        title: it.title, sub: `${it.due ? L(`${it.due} 截止 · `, `Due ${it.due} · `) : it.flags?.includes(term('缺截止')) ? L('还没定截止 · ', 'No due date yet · ') : ''}${m.title}`, item: it.id,
        act: <button className="sk-mini-btn" onClick={() => actions.confirm(it.id, as)}>{L('我来负责', 'I’ll own it')}</button>,
      })
    }
  }
  if (as === ME) {
    rows.push({
      key: 'gap', tone: 5, kind: L('跨会议发现', 'Cross-meeting'), icon: <Kb name="brain" size={15} />, title: L('竞品安全评审有一票否决权，我们的安委会还没有', 'The competitor’s safety review has a veto; our committee doesn’t yet'), sub: L('小米直播 × 10/28 安全周会', 'Xiaomi stream × 10/28 safety weekly'),
      act: <button className="sk-mini-btn" onClick={() => go('/kb', { q: L('竞品的一票否决和我们差在哪？', 'How does their safety veto compare with ours?') })}>{L('看依据', 'See why')}</button>,
    })
  }

  return (
    <aside className="min-w-0">
      <SectionHead title={L('收件箱', 'Inbox')} sub={L(`${rows.length} 件 · 需要你先表态`, `${rows.length} · waiting on you`)} />
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
        {!rows.length && <div className="text-ink-3 rounded-2xl border border-dashed px-4 py-5 text-[13px]">{L('收件箱清空了。', 'Inbox zero.')}</div>}
      </div>
    </aside>
  )
}

const meetingPublisher = (id: string) => MEETINGS.find(m => m.id === id)!.publisher

const REPLY: Record<string, string> = {
  ow_06: L('11/3 先发门店一版草稿', 'Draft goes to stores on 11/3'),
  xm_01: L('直播里没说期限，已让林夏去门店核实', 'The stream gave no end date — Lin Xia is checking with stores'),
  xm_19: L('直播只说了 4000 积分，没说折算，已转林夏查规则', 'They only said 4,000 points, no conversion — Lin Xia is checking the rules'),
}

// ---------------- 全部会议：按项目，标明 Leader ----------------

function AllMeetings() {
  const dispatched = useStore(s => s.dispatched)
  const confirmed = useStore(s => s.confirmed)
  const custom = useStore(s => s.projects)
  const projects = [...PROJECTS, ...custom]
  return (
    <section>
      <SectionHead title={L('全部会议', 'All meetings')} sub={L('按项目归档；点一行打开回放，原话、逐字稿、录像互相定位', 'Filed by project; click a row to open the replay — quotes, transcript and video stay in sync')} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
        {projects.map(p => {
          const ms = MEETINGS.filter(m => m.project === p.id).sort((a, b) => b.date.localeCompare(a.date))
          return (
            <div key={p.id} className="glass-panel rounded-2xl border">
              <div className="flex items-center gap-2.5 border-b px-4 py-3">
                <span style={{ color: p.color }}><Kb name={p.icon} size={26} /></span>
                <div className="min-w-0 flex-1">
                  <b className="text-[14.5px]">{p.name}</b>
                  <div className="text-ink-3 truncate text-[12px]">{p.desc}</div>
                </div>
                <span className="flex flex-none items-center gap-1.5 text-[12px]" title={L('项目组 Leader', 'Project leader')}><Face p={p.leader} size={22} /><span className="text-ink-2">{personById(p.leader).name}</span><span className="rounded-md bg-amber-50 px-1.5 text-[11px] leading-[18px] text-amber-700">Leader</span></span>
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
                      <span className="text-ink-3 block truncate text-[12px]">{L(`${personById(m.publisher).name} 发布 → ${n} 人收到${acts.length ? ` · 待办确认 ${ok}/${acts.length}` : ''}`, `${personById(m.publisher).name} → ${n} recipients${acts.length ? ` · to-dos confirmed ${ok}/${acts.length}` : ''}`)}</span>
                    </span>
                    {dispatched[m.id]
                      ? <ArrowRight size={14} className="text-ink-4 group-hover:text-ink flex-none" />
                      : <span className="flex-none rounded-md bg-amber-50 px-1.5 py-0.5 text-[11.5px] text-amber-700">{L('待分发', 'To send')}</span>}
                  </a>
                )
              }) : <div className="text-ink-3 px-4 py-4 text-[12.5px]">{L('还没有会议，新建会议时选这个项目。', 'No meetings yet — pick this project when creating one.')}</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
