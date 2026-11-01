// 组织与角色：一张会动的组织图。三种看法 —— 信息流向（这周的会怎么从发布者流到每个人）、
// 依赖（A 负责的东西变了，依赖它的 B 也会收到）、汇报线（职级决定简报怎么写）。
// 移到一个人上，和 TA 连着的线亮起来、点在线上流；点一下钉住，右边列出 TA 和谁连着、为什么，点名字顺着线走到下一个人。
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Link2, Network, SquarePlay, Waypoints, X } from 'lucide-react'
import { PEOPLE, PROJECTS, RANKS, STAFF, personById, projectById, type Person, type PersonId, type Rank } from '@/data/model'
import { MEETINGS, meetingById } from '@/data/meetings'
import { href } from '@/lib/router'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Face, FaceStack, Kb, RankTag } from '@/components/common/bits'
import { ViewSwitch } from '@/components/common/ViewSwitch'
import { reelHref } from '@/components/reel/spec'
import { L } from '@/lib/i18n'

export function Org() {
  return (
    <>
      <TopBar crumbs={[{ label: L('组织与角色', 'Org & roles') }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-6 py-6 max-md:gap-5 max-md:px-4 max-md:py-4">
          <header>
            <h1 className="text-[24px] font-semibold tracking-tight">{L('组织与角色', 'Org & roles')}</h1>
            <p className="text-ink-3 mt-1.5 max-w-[820px] text-[13.5px]">{L('会映按这张图判断一条信息该流向谁：', 'MeetReel uses this map to decide where each piece of information goes: ')}<b className="text-ink-2 font-medium">{L('关注档案', 'interest profiles')}</b>{L('（负责 / 依赖 / 订阅）决定发不发，', ' (owns / depends on / follows) decide whether to send, and ')}<b className="text-ink-2 font-medium">{L('职级', 'level')}</b>{L('决定简报怎么写。移到一个人上看 TA 和谁连着，点一下钉住。', ' decides how the brief is written. Hover a person to see their connections; click to pin.')}</p>
          </header>
          <OrgGraph />
          <Projects />
          <Guests />
        </div>
      </div>
    </>
  )
}

// ---------------- 图的数据：人怎么排、线怎么连 ----------------

type Lens = 'flow' | 'dep' | 'report'
type Rect = { x: number; y: number; w: number; h: number }

interface Edge {
  id: string
  kind: Lens
  from: PersonId
  to: PersonId
  color: string
  w: number
  /** 依赖的那件事 */
  label?: string
  meeting?: string
  /** 流过去的条数 */
  n?: number
}

const TOP = STAFF.find(p => !p.reportsTo)!
/** 每个部门一列：负责人在上，组员缩进挂在下面 */
const COLS = [...new Set(STAFF.filter(p => p.reportsTo).map(p => p.team))].map(team => {
  const people = STAFF.filter(p => p.team === team)
  const head = people.find(p => p.reportsTo === TOP.id) ?? people[0]
  return { team, head: head.id, reports: people.filter(p => p !== head).map(p => p.id) }
})

const PLUM = '#5F3E54'
const ROSE = '#E11D48'
const short = (title: string) => title.replace(/ · .*/, '')

const REPORT_EDGES: Edge[] = STAFF.filter(p => p.reportsTo).map(p => ({ id: `r:${p.id}`, kind: 'report', from: p.reportsTo!, to: p.id, color: PLUM, w: 1.6 }))

// 依赖：B 的档案里写着依赖某件事，A 的档案里写着负责它 → A 变了要告诉 B（R4）
const DEP_EDGES: Edge[] = STAFF.flatMap(b => b.profile.dependsOn.flatMap(thing =>
  STAFF.filter(a => a.profile.owns.includes(thing)).map(a => ({ id: `d:${a.id}:${b.id}:${thing}`, kind: 'dep' as const, from: a.id, to: b.id, color: ROSE, w: 1.8, label: thing })),
))
const ORPHAN_DEPS = STAFF.flatMap(b => b.profile.dependsOn.filter(thing => !STAFF.some(a => a.profile.owns.includes(thing))).map(thing => ({ pid: b.id, thing })))

// 信息流：每场会从发布者流到每个收到者，线的粗细按条数
const FLOW_EDGES: Edge[] = MEETINGS.flatMap(m => {
  const color = projectById(m.project).color
  const by = new Map<PersonId, Set<string>>()
  m.routes.forEach(r => {
    if (r.person === m.publisher || personById(r.person).external) return
    by.set(r.person, (by.get(r.person) ?? new Set()).add(r.item))
  })
  return [...by].map(([to, s]) => ({ id: `f:${m.id}:${to}`, kind: 'flow' as const, from: m.publisher, to, color, w: 1.2 + Math.min(s.size, 6) * 0.55, meeting: m.id, n: s.size }))
})

const LENS: Record<Lens, { label: string; hint: string; icon: typeof Waypoints }> = {
  flow: { label: L('信息流向', 'Info flow'), icon: Waypoints, hint: L('这周的会，条目从发布者流到每个收到者；线越粗条数越多', 'This week’s meetings: items flow from publisher to each recipient; thicker lines mean more items') },
  dep: { label: L('依赖', 'Dependencies'), icon: Link2, hint: L('A 负责的东西变了，依赖它的 B 没参会也会收到（R4）', 'When something A owns changes, B who depends on it gets it even without attending (R4)') },
  report: { label: L('汇报线', 'Reporting'), icon: Network, hint: L('职级决定简报怎么写：高管看决议和风险，成员只看自己的待办', 'Level shapes the brief: executives see decisions and risks, members only their own to-dos') },
}

/** 两个人之间的线：汇报走树形，依赖从头顶拱过去，信息流从一个人中心弯到另一个人中心 */
function geometry(e: Edge, a: Rect, b: Rect) {
  const ax = a.x + a.w / 2, bx = b.x + b.w / 2
  const sameCol = Math.abs(ax - bx) < 60
  if (e.kind === 'report') {
    if (sameCol) {
      const sx = a.x + 18, sy = a.y + a.h, ty = b.y + b.h / 2
      return { d: `M${sx},${sy} L${sx},${ty - 10} Q${sx},${ty} ${sx + 10},${ty} L${b.x},${ty}`, mid: { x: sx, y: (sy + ty) / 2 } }
    }
    const sy = a.y + a.h, ty = b.y, my = (sy + ty) / 2
    return { d: `M${ax},${sy} C${ax},${my} ${bx},${my} ${bx},${ty}`, mid: { x: (ax + bx) / 2, y: my } }
  }
  if (e.kind === 'dep') {
    if (sameCol) {
      const sx = a.x + a.w, sy = a.y + a.h / 2, tx = b.x + b.w, ty = b.y + b.h / 2
      return { d: `M${sx},${sy} C${sx + 58},${sy} ${tx + 58},${ty} ${tx},${ty}`, mid: { x: Math.max(sx, tx) + 44, y: (sy + ty) / 2 } }
    }
    const h = Math.min(84, 28 + Math.abs(bx - ax) * 0.11)
    return { d: `M${ax},${a.y} C${ax},${a.y - h} ${bx},${b.y - h} ${bx},${b.y}`, mid: { x: (ax + bx) / 2, y: (a.y + b.y) / 2 - h * 0.75 } }
  }
  const p = { x: ax, y: a.y + a.h / 2 }, q = { x: bx, y: b.y + b.h / 2 }
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1
  const k = Math.min(160, Math.max(70, len * 0.32))
  const c = { x: (p.x + q.x) / 2 + (dy / len) * k, y: (p.y + q.y) / 2 - (dx / len) * k }
  return { d: `M${p.x},${p.y} Q${c.x},${c.y} ${q.x},${q.y}`, mid: { x: 0.25 * p.x + 0.5 * c.x + 0.25 * q.x, y: 0.25 * p.y + 0.5 * c.y + 0.25 * q.y } }
}

const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------------- 组织图 ----------------

function OrgGraph() {
  const [lens, setLens] = useState<Lens>('flow')
  const [meeting, setMeeting] = useState<string | null>(null)
  const [pinned, setPinned] = useState<PersonId | null>(null)
  const [hover, setHover] = useState<PersonId | null>(null)
  const dispatched = useStore(s => s.dispatched)
  const stage = useRef<HTMLDivElement>(null)
  const nodes = useRef<Partial<Record<PersonId, HTMLElement | null>>>({})
  const [rects, setRects] = useState<Partial<Record<PersonId, Rect>>>({})
  const calm = useMemo(still, [])

  useLayoutEffect(() => {
    const box = stage.current
    if (!box) return
    const measure = () => {
      const o = box.getBoundingClientRect()
      const next: Partial<Record<PersonId, Rect>> = {}
      for (const [id, el] of Object.entries(nodes.current)) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        next[id as PersonId] = { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }
      }
      setRects(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [])

  const edges = lens === 'report' ? REPORT_EDGES : lens === 'dep' ? DEP_EDGES : FLOW_EDGES.filter(e => !meeting || e.meeting === meeting)
  const focus = hover ?? pinned
  const near = new Set(focus ? edges.filter(e => e.from === focus || e.to === focus).flatMap(e => [e.from, e.to]) : [])
  const inMeeting = lens === 'flow' && meeting ? new Set(edges.flatMap(e => [e.from, e.to])) : null
  const stateOf = (pid: PersonId) =>
    focus ? (pid === focus ? 'focus' : near.has(pid) ? 'near' : 'dim') : inMeeting && !inMeeting.has(pid) ? 'dim' : ''
  const ready = Object.keys(rects).length > 0
  const pick = (pid: PersonId) => setPinned(p => (p === pid ? null : pid))
  const node = (pid: PersonId, className?: string) => (
    <OrgNode
      key={pid}
      pid={pid}
      state={stateOf(pid)}
      lens={lens}
      edges={edges}
      className={className}
      ref={el => { nodes.current[pid] = el }}
      onEnter={() => setHover(pid)}
      onLeave={() => setHover(h => (h === pid ? null : h))}
      onClick={() => pick(pid)}
    />
  )

  return (
    <section className="sg-card overflow-hidden rounded-[26px]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[rgb(95_62_84/7%)] px-4 py-3">
        <ViewSwitch
          id="org-lens"
          value={lens}
          items={(Object.keys(LENS) as Lens[]).map(k => ({ k, label: LENS[k].label, icon: LENS[k].icon, hint: LENS[k].hint, onClick: () => setLens(k) }))}
        />
      </div>
      <AnimatePresence initial={false}>
        {lens === 'flow' && (
          <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
            <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
              <span className="text-ink-3 mr-1 text-[12px]">{L('这周', 'This week')}</span>
              <MeetingChip on={!meeting} onClick={() => setMeeting(null)}>{L(`全部 ${MEETINGS.length} 场`, `All ${MEETINGS.length}`)}</MeetingChip>
              {MEETINGS.map(m => (
                <MeetingChip key={m.id} on={meeting === m.id} color={projectById(m.project).color} onClick={() => setMeeting(x => (x === m.id ? null : m.id))}>
                  {short(m.title)}{!dispatched[m.id] && <span className="ml-1 text-[10.5px] text-amber-600">{L('待分发', 'to send')}</span>}
                </MeetingChip>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="org-stage overflow-x-auto p-4">
          <div ref={stage} className="relative min-w-[720px] pb-2" onClick={e => { if (e.target === e.currentTarget) setPinned(null) }}>
            <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
              {/* 汇报线当底子，别的看法里淡淡地垫着 */}
              {lens !== 'report' && ready && REPORT_EDGES.map(e => {
                const a = rects[e.from], b = rects[e.to]
                return a && b ? <path key={e.id} d={geometry(e, a, b).d} stroke="rgb(95 62 84 / 9%)" strokeWidth={1.2} fill="none" /> : null
              })}
              {ready && edges.map((e, i) => {
                const a = rects[e.from], b = rects[e.to]
                if (!a || !b) return null
                const { d } = geometry(e, a, b)
                const lit = !focus || e.from === focus || e.to === focus
                return (
                  <g key={`${lens}:${meeting}:${e.id}`} style={{ opacity: lit ? 1 : 0.07, transition: 'opacity .25s' }}>
                    <motion.path
                      d={d} stroke={e.color} strokeOpacity={focus && lit ? 0.85 : 0.45} strokeWidth={focus && lit ? e.w + 0.8 : e.w} fill="none" strokeLinecap="round"
                      initial={calm ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: Math.min(i, 16) * 0.035, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                    {!calm && lit && <Particles key={d} d={d} color={e.color} count={e.kind === 'flow' ? Math.min(3, e.n ?? 1) : 1} seed={i} size={e.kind === 'flow' ? 3.2 : 2.8} />}
                  </g>
                )
              })}
            </svg>

            {/* 依赖的那件事，标在拱的顶上 */}
            {lens === 'dep' && ready && edges.map((e, i) => {
              const a = rects[e.from], b = rects[e.to]
              // 同一个人的同一件事拱向几个人时，只标一次
              if (!a || !b || edges.findIndex(x => x.from === e.from && x.label === e.label) !== i) return null
              const { mid } = geometry(e, a, b)
              const lit = !focus || e.from === focus || e.to === focus
              return (
                <motion.span key={e.id} className="org-dep-label" style={{ left: mid.x, top: mid.y, opacity: lit ? 1 : 0.15 }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: lit ? 1 : 0.15 }} transition={{ delay: 0.35 }}>
                  <Link2 size={10} />{e.label}
                </motion.span>
              )
            })}

            <div className="relative z-10 flex justify-center"><div className="w-[200px]">{node(TOP.id)}</div></div>
            <div className="relative z-10 mt-[96px] grid grid-cols-5 gap-3">
              {COLS.map(col => (
                <div key={col.team} className="flex min-w-0 flex-col gap-2.5">
                  <div className="text-ink-3 -mb-1 flex items-center gap-1.5 pl-1 text-[11.5px] font-medium"><i className="size-1.5 rounded-full bg-[var(--plum-3)]" />{col.team}</div>
                  {node(col.head)}
                  {col.reports.length > 0 && <div className="flex flex-col gap-2.5 pl-7">{col.reports.map(r => node(r))}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="border-t border-[rgb(95_62_84/7%)] bg-[rgb(255_255_255/45%)] p-4 lg:border-t-0 lg:border-l">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pinned ?? hover ?? 'none'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
              {pinned ?? hover
                ? <Relations pid={(pinned ?? hover)!} pinned={!!pinned} onPerson={setPinned} onMeeting={id => { setLens('flow'); setMeeting(id) }} onClose={() => setPinned(null)} />
                : <Overview lens={lens} />}
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>
    </section>
  )
}

/** 线上流动的光点：按路径长度定速度，几颗错开出发 */
function Particles({ d, color, count, seed, size }: { d: string; color: string; count: number; seed: number; size: number }) {
  const path = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(200)
  useLayoutEffect(() => { if (path.current) setLen(path.current.getTotalLength()) }, [d])
  const dur = Math.min(4.2, Math.max(1.4, len / 150))
  return (
    <g style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
      <path ref={path} d={d} fill="none" stroke="none" />
      {Array.from({ length: count }, (_, j) => (
        <circle key={j} r={size} fill={color}>
          <animateMotion dur={`${dur}s`} begin={`${-((j / count) + (seed % 7) / 7) * dur}s`} repeatCount="indefinite" path={d} calcMode="linear" />
        </circle>
      ))}
    </g>
  )
}

function MeetingChip({ on, color, onClick, children }: { on: boolean; color?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors', on ? 'sg-onyx' : 'sg-raised text-ink-2 hover:text-ink')}>
      {color && <i className="size-2 rounded-full" style={{ background: color, boxShadow: on ? `0 0 6px ${color}` : undefined }} />}
      {children}
    </button>
  )
}

function OrgNode({ pid, state, lens, edges, className, ref, onEnter, onLeave, onClick }: {
  pid: PersonId; state: string; lens: Lens; edges: Edge[]; className?: string; ref: (el: HTMLButtonElement | null) => void
  onEnter: () => void; onLeave: () => void; onClick: () => void
}) {
  const p = personById(pid)
  const led = PROJECTS.filter(x => x.leader === pid)
  const sent = lens === 'flow' ? edges.filter(e => e.from === pid) : []
  const got = lens === 'flow' ? edges.filter(e => e.to === pid) : []
  const sentN = MEETINGS.filter(m => sent.some(e => e.meeting === m.id)).reduce((a, m) => a + m.items.length, 0)
  const gotN = got.reduce((a, e) => a + (e.n ?? 0), 0)
  const reports = lens === 'report' ? STAFF.filter(x => x.reportsTo === pid).length : 0
  return (
    <button
      ref={ref}
      className={cn('org-node w-full', state, className)}
      style={{ '--c': RANKS[p.rank].color } as CSSProperties}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      aria-pressed={state === 'focus'}
    >
      <Face p={p} size={34} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1">
          <b className="truncate text-[13.5px]">{p.name}</b>
          <RankTag p={p} short />
          {led.length > 0 && <span title={L(`${led.map(x => x.name).join('、')} 项目组 Leader`, `Leader of ${led.map(x => x.name).join(', ')}`)}><Crown size={12} className="flex-none text-amber-500" /></span>}
        </span>
        <span className="text-ink-3 block truncate text-[11.5px]">{p.group ?? p.role}</span>
      </span>
      <span className="absolute -top-2 -right-1.5 flex gap-1">
        {sentN > 0 && <span className="org-badge" style={{ background: edges.find(e => e.from === pid)!.color }} title={L('这周发出的条目', 'Items sent this week')}>{L('发', 'out')} {sentN}</span>}
        {gotN > 0 && <span className="org-badge bg-[var(--onyx)]" title={got.map(e => `${short(meetingById(e.meeting!)!.title)} ${e.n}${L(' 条', '')}`).join(' · ')}>+{gotN}</span>}
        {reports > 0 && <span className="org-badge bg-[var(--plum)]">{L('带', 'leads')} {reports}</span>}
      </span>
    </button>
  )
}

// ---------------- 右边：TA 和谁连着 ----------------

function Overview({ lens }: { lens: Lens }) {
  const pushes = FLOW_EDGES.reduce((a, e) => a + (e.n ?? 0), 0)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2"><Kb name="route" size={22} /><b className="text-[15px]">{L('点一个人，看 TA 和谁连着', 'Click a person to see their connections')}</b></div>
        <p className="text-ink-3 mt-1.5 text-[12.5px] leading-relaxed">{LENS[lens].hint}{L('。', '.')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat n={STAFF.length} label={L('位同事', 'colleagues')} />
        <Stat n={MEETINGS.length} label={L('场会 · 这周', 'meetings this week')} />
        <Stat n={pushes} label={L('次按人推送', 'per-person pushes')} />
        <Stat n={DEP_EDGES.length} label={L('条依赖关系', 'dependencies')} />
      </div>
      <div className="sg-well rounded-2xl p-3 text-[12px] leading-relaxed">
        <div className="text-ink-2 mb-1.5 font-medium">{L('图例', 'Legend')}</div>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2"><Line color={PLUM} />{L('汇报：谁带谁，决定简报写给哪个职级', 'Reporting: who leads whom, sets which level a brief is written for')}</span>
          <span className="flex items-center gap-2"><Line color={ROSE} />{L('依赖：负责的东西一变，依赖的人跟着收到', 'Dependency: when what someone owns changes, those depending on it are told')}</span>
          <span className="flex items-center gap-2"><span className="flex gap-0.5">{PROJECTS.map(p => <i key={p.id} className="size-2 rounded-full" style={{ background: p.color }} />)}</span>{L('信息流：颜色是会议所属的项目', 'Info flow: color = the meeting’s project')}</span>
        </div>
      </div>
      <div className="text-ink-3 flex flex-wrap gap-1.5 text-[11.5px]">
        {(['exec', 'head', 'lead', 'staff'] as Rank[]).map(r => <span key={r} className="rounded-md px-1.5 leading-5" style={{ color: RANKS[r].color, background: RANKS[r].soft }} title={RANKS[r].brief}>{RANKS[r].level} {RANKS[r].label}</span>)}
      </div>
    </div>
  )
}

const Stat = ({ n, label }: { n: number; label: string }) => (
  <div className="sg-raised rounded-xl px-3 py-2"><b className="text-[20px] font-semibold tabular-nums">{n}</b><span className="text-ink-3 ml-1 text-[11.5px]">{label}</span></div>
)
const Line = ({ color }: { color: string }) => <i className="h-[2px] w-5 flex-none rounded-full" style={{ background: color }} />

function Relations({ pid, pinned, onPerson, onMeeting, onClose }: { pid: PersonId; pinned: boolean; onPerson: (p: PersonId) => void; onMeeting: (id: string) => void; onClose: () => void }) {
  const p = personById(pid)
  const boss = p.reportsTo ? personById(p.reportsTo) : null
  const team = STAFF.filter(x => x.reportsTo === pid)
  const relyOn = DEP_EDGES.filter(e => e.to === pid)
  const reliedBy = DEP_EDGES.filter(e => e.from === pid)
  const orphans = ORPHAN_DEPS.filter(x => x.pid === pid)
  const published = MEETINGS.filter(m => m.publisher === pid)
  const received = FLOW_EDGES.filter(e => e.to === pid)
  const chips = [
    ...p.profile.owns.map(x => ({ k: L('负责', 'Owns'), x, cls: 'sg-well text-ink-2' })),
    ...p.profile.dependsOn.map(x => ({ k: L('依赖', 'Depends'), x, cls: 'bg-rose-50/80 text-rose-700 shadow-[inset_0_0_0_1px_rgb(225_29_72/12%)]' })),
    ...p.profile.interests.map(x => ({ k: L('订阅', 'Follows'), x, cls: 'bg-[rgb(95_62_84/8%)] text-[var(--plum)] shadow-[inset_0_0_0_1px_rgb(95_62_84/12%)]' })),
  ]

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start gap-3">
        <Face p={p} size={44} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex flex-wrap items-center gap-1.5"><b className="text-[16px]">{p.name}</b><RankTag p={p} /></div>
          <div className="text-ink-3 mt-1 text-[12px]">{p.team}{p.group ? ` · ${p.group}` : ''} · {p.role}</div>
        </div>
        {pinned ? <button className="sg-raised sg-icon-btn size-7 flex-none" onClick={onClose} aria-label={L('取消钉住', 'Unpin')}><X size={14} /></button> : <span className="text-ink-4 flex-none pt-1 text-[11px]">{L('点一下钉住', 'Click to pin')}</span>}
      </div>
      <div className="flex flex-wrap gap-1 text-[11px]">
        {chips.map(c => <span key={c.k + c.x} className={cn('rounded-full px-2 py-px', c.cls)}>{c.k} {c.x}</span>)}
      </div>

      <Rel title={L('这周的信息流', 'This week’s info flow')} color={PLUM}>
        {published.map(m => (
          <RelRow key={m.id} onClick={() => onMeeting(m.id)}>
            <i className="size-2 flex-none rounded-full" style={{ background: projectById(m.project).color }} />
            <span className="min-w-0 flex-1 truncate">{L(`发布「${short(m.title)}」`, `Published “${short(m.title)}”`)}</span>
            <span className="text-ink-3 flex-none">→ {L(`${FLOW_EDGES.filter(e => e.meeting === m.id).length} 人 · ${m.items.length} 条`, `${FLOW_EDGES.filter(e => e.meeting === m.id).length} people · ${m.items.length} items`)}</span>
          </RelRow>
        ))}
        {received.map(e => {
          const m = meetingById(e.meeting!)!
          return (
            <RelRow key={e.id} onClick={() => onPerson(e.from)}>
              <Face p={e.from} size={20} />
              <span className="min-w-0 flex-1 truncate">{personById(e.from).name} · {L(`「${short(m.title)}」`, `“${short(m.title)}”`)}</span>
              <span className="flex-none font-medium" style={{ color: e.color }}>+{e.n}{L(' 条', '')}</span>
            </RelRow>
          )
        })}
        {!published.length && !received.length && <Empty>{L('这周没有流到 TA 的条目，不打扰', 'Nothing flowed to them this week — no pings')}</Empty>}
      </Rel>

      <Rel title={L('依赖', 'Dependencies')} color={ROSE}>
        {relyOn.map(e => (
          <RelRow key={e.id} onClick={() => onPerson(e.from)}>
            <Face p={e.from} size={20} />
            <span className="min-w-0 flex-1 truncate">{L(`依赖 ${personById(e.from).name} 负责的「${e.label}」`, `Depends on “${e.label}”, owned by ${personById(e.from).name}`)}</span>
          </RelRow>
        ))}
        {reliedBy.map(e => (
          <RelRow key={e.id} onClick={() => onPerson(e.to)}>
            <Face p={e.to} size={20} />
            <span className="min-w-0 flex-1 truncate">{L(`${personById(e.to).name} 依赖 TA 的「${e.label}」`, `${personById(e.to).name} depends on their “${e.label}”`)}</span>
          </RelRow>
        ))}
        {orphans.map(o => <Empty key={o.thing}>{L(`依赖「${o.thing}」，还没有人在档案里认领`, `Depends on “${o.thing}”, which nobody has claimed yet`)}</Empty>)}
        {!relyOn.length && !reliedBy.length && !orphans.length && <Empty>{L('没有跨人的依赖', 'No cross-person dependencies')}</Empty>}
      </Rel>

      <Rel title={L('汇报线', 'Reporting')} color={PLUM}>
        {boss && (
          <RelRow onClick={() => onPerson(boss.id)}>
            <Face p={boss} size={20} /><span className="min-w-0 flex-1 truncate">{L('汇报给', 'Reports to')} {boss.name}</span><RankTag p={boss} short />
          </RelRow>
        )}
        {team.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1 py-1 text-[12px]">
            <span className="text-ink-3">{L('带', 'Leads')}</span>
            {team.map(x => <button key={x.id} onClick={() => onPerson(x.id)} className="sg-raised flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 hover:-translate-y-px"><Face p={x} size={18} />{x.name}</button>)}
          </div>
        )}
        <p className="text-ink-3 px-1 text-[11.5px]">{L('简报写法：', 'Brief style: ')}{RANKS[p.rank].brief}</p>
      </Rel>

      <div className="flex flex-wrap gap-2 pt-1">
        <a href={href('/', { as: pid })} className="sg-raised inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium hover:-translate-y-px">{L('以 TA 的身份看', 'View as them')}</a>
        <a href={reelHref(pid)} className="sg-onyx inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium hover:-translate-y-px"><SquarePlay size={13} />{L('TA 的 30 秒', 'Their 30 s')}</a>
      </div>
    </div>
  )
}

function Rel({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-ink-3 mb-1 flex items-center gap-1.5 text-[11.5px] font-medium"><Line color={color} />{title}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

const RelRow = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button onClick={onClick} className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/80">{children}</button>
)
const Empty = ({ children }: { children: ReactNode }) => <p className="text-ink-3 px-1.5 py-1 text-[12px]">{children}</p>

// ---------------- 项目组 / 外部发言人 ----------------

function Projects() {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">{L('项目组', 'Projects')}</h2><span className="text-ink-3 text-[12.5px]">{L('项目 Leader 默认是这个项目里会议的发布者', 'The project leader publishes the project’s meetings by default')}</span></div>
      <div className="sg-card overflow-hidden rounded-[20px]">
        {PROJECTS.map(p => (
          <div key={p.id} className="pc-row flex flex-wrap items-center gap-4 px-4 py-3">
            <span className="flex w-[180px] items-center gap-2" style={{ color: p.color }}><Kb name={p.icon} size={24} /><b className="text-ink text-[14px]">{p.name}</b></span>
            <span className="flex items-center gap-2 text-[13px]"><Crown size={14} className="text-amber-600" /><Face p={p.leader} size={24} /><b className="font-medium">{personById(p.leader).name}</b><RankTag p={p.leader} /></span>
            <span className="text-ink-3 ml-auto flex items-center gap-2 text-[12.5px]">{L(`${p.members.length} 位成员`, `${p.members.length} members`)}<FaceStack ids={p.members.filter(x => x !== p.leader)} size={22} max={8} /></span>
            <span className="text-ink-3 w-full text-[12px] sm:w-auto">{L(`${MEETINGS.filter(m => m.project === p.id).length} 场会`, `${MEETINGS.filter(m => m.project === p.id).length} meetings`)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Guests() {
  const guests: Person[] = PEOPLE.filter(x => x.external)
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">{L('外部发言人', 'External speakers')}</h2><span className="text-ink-3 text-[12.5px]">{L('发布会、直播里的人：只引用原话，不推送、不派任务，身份只记录直播里自己说的或被介绍的', 'People from launches and livestreams: quoted only, never notified or assigned; identities are only what they said or were introduced as on stream')}</span></div>
      <div className="flex flex-wrap gap-2">
        {guests.map(x => (
          <span key={x.id} className="sg-well flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[13px]"><Face p={x} size={26} /><b className="font-medium">{x.name}</b><span className="text-ink-3 text-[12px]">{x.role}</span></span>
        ))}
      </div>
      <p className="text-ink-3 mt-4 text-[12px]">{L(`共 ${STAFF.length} 位同事。每个人可以在自己的简报里改订阅，改动会回到这里。`, `${STAFF.length} colleagues. Anyone can change what they follow from their own brief, and it flows back here.`)}</p>
    </section>
  )
}
