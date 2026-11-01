// 每人 30 秒：一场会不是每个人都要看完。会映对照每个人负责、依赖、订阅的事筛一遍，给需要的人各剪一条只讲 TA 的 30 秒。
// 左边是送达图：会议是源头，一条条线连到各部门的人，每个人旁边一小块点阵标出 20 条里哪几条是 TA 的；
// 右边播选中那个人的片子，下面每一条都写着“为什么是你”，播到哪条亮哪条。风格只是皮肤，收在右上角的下拉里。
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Clapperboard } from 'lucide-react'
import { ME, STAFF, personById, type PersonId } from '@/data/model'
import { RUN_ID } from '@/data/run'
import { itemTime } from '@/data/derive'
import { go, href, useRoute } from '@/lib/router'
import { cn, cnDate } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Face, Kb, LeaderTag, RankTag, TypePill } from '@/components/common/bits'
import { Pop, PopRow } from '@/components/common/Pop'
import { ACT, REEL_STYLES, beatWindow, defaultStyle, reelSpec, tc, type ReelSpec, type ReelStyle } from '@/components/reel/spec'
import { Stage, useReelClock, type ReelClock } from '@/components/reel/kit'
import { ReelFrame, ReelPlayer } from '@/components/reel/Player'
import { L } from '@/lib/i18n'

/** 只有画面、铺满窗口：录屏导出、单帧截图用（#/reel?frame&s=pop&t=12） */
export function ReelFrameOnly() {
  const route = useRoute()
  const as = (route.query.get('as') as PersonId | null) ?? ME
  const style = (route.query.get('s') as ReelStyle | null) ?? defaultStyle(as)
  const at = route.query.get('t')
  const clock = useReelClock({ autoPlay: true, loop: true, start: at ? Number(at) : undefined })
  return (
    <div className="grid h-svh place-items-center bg-black">
      <div className="w-full" style={{ maxWidth: 'calc(100svh * 16 / 9)' }}>
        <Stage onClick={clock.toggle}><ReelFrame spec={reelSpec(as, RUN_ID)} style={style} t={clock.t} /></Stage>
      </div>
    </div>
  )
}

// 部门顺序：管理层在最上面，其余按组织页的顺序
// 和 model.ts 里的 team 一致
const TEAMS = L(['管理层', '安全部', '市场部', '用户运营部', '交付中心', '销售部'], ['Leadership', 'Safety', 'Marketing', 'User Operations', 'Delivery Center', 'Sales'])

export function Reels() {
  const route = useRoute()
  const as = (route.query.get('as') as PersonId | null) ?? ME
  const style = (route.query.get('s') as ReelStyle | null) ?? defaultStyle(as)
  const at = route.query.get('t')
  const clock = useReelClock({ autoPlay: true, loop: true, start: at != null && !Number.isNaN(Number(at)) ? Number(at) : undefined })
  const specs = useMemo(() => Object.fromEntries(STAFF.map(p => [p.id, reelSpec(p.id, RUN_ID)])) as Record<PersonId, ReelSpec>, [])
  const spec = specs[as] ?? reelSpec(as, RUN_ID)
  const me = spec.person
  const beat = spec.beats.findIndex((_, i) => { const [a, b] = beatWindow(i, spec.beats.length); return clock.t >= a && clock.t < b })
  const pick = (pid: PersonId) => { go('/reel', { as: pid === ME ? undefined : pid }); clock.seek(0); clock.play() }
  const setStyle = (s: ReelStyle) => go('/reel', { as: as === ME ? undefined : as, s: s === defaultStyle(as) ? undefined : s })

  return (
    <>
      <TopBar crumbs={[{ label: L('每人 30 秒', '30s per person') }, { label: me.name }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-6 py-6 max-md:px-4 max-md:py-4">
          <header className="max-w-[760px]">
            <h1 className="text-[24px] font-semibold tracking-tight">{L('每人 30 秒', '30 seconds per person')}</h1>
            <p className="text-ink-3 mt-1.5 text-[13.5px] leading-relaxed">
              {L(`一场会讲了 ${spec.total} 条，不是每个人都要看完。会映对照每个人`, `A meeting covers ${spec.total} items, and not everyone needs all of them. MeetReel filters by what each person `)}<b className="text-ink-2 font-medium">{L('负责、依赖、订阅', 'owns, depends on and follows')}</b>{L('的事筛一遍，给需要的人各剪一条只讲 TA 的 30 秒，推到飞书；沾不上边的人不打扰。', ', cuts a 30-second reel just about them for each person who needs one, and pushes it to Lark. Everyone else isn’t pinged.')}
            </p>
          </header>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <DeliveryMap specs={specs} as={as} beatItem={beat >= 0 ? spec.beats[beat].entry.item.id : null} onPick={pick} />

            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Face p={me} size={44} ring="#5F3E54" />
                <div className="min-w-0 flex-1 max-md:basis-[220px]">
                  <div className="flex flex-wrap items-center gap-1.5"><b className="text-[18px] tracking-tight">{L(`${me.name} 的 30 秒`, `${me.name}’s 30 seconds`)}</b><RankTag p={me} /><LeaderTag pid={me.id} /></div>
                  <div className="text-ink-3 mt-0.5 text-[12.5px]">
                    {me.team}{me.group ? ` · ${me.group}` : ''} · {me.role} ·{' '}
                    {spec.kept.length ? L(<>从 {spec.total} 条里留下 <b className="text-ink">{spec.kept.length}</b> 条，不用看完整场，约省下 {spec.savedMin} 分钟</>, <>Keeps <b className="text-ink">{spec.kept.length}</b> of {spec.total} items — no need to watch it all, saves about {spec.savedMin} min</>) : L('这场没有和 TA 有关的，不打扰', 'Nothing here concerns them — no ping')}
                  </div>
                </div>
                <Pop
                  align="right"
                  width={280}
                  label={<><Clapperboard size={14} className="flex-none" /><span className="text-ink-3">{L('画面', 'Look')}</span>{REEL_STYLES.find(x => x.id === style)!.label}</>}
                >
                  {close => (
                    <>
                      <div className="text-ink-3 px-2.5 pt-1.5 pb-1 text-[11.5px]">{L('同一份分镜换一层皮；默认按职级挑', 'Same storyboard, different skin; the default follows the person’s level')}</div>
                      {REEL_STYLES.map(st => (
                        <PopRow key={st.id} on={style === st.id} onClick={() => { setStyle(st.id); close() }} count={st.id === defaultStyle(as) ? L('默认', 'Default') : undefined}>
                          <span className="min-w-0">
                            <span className="block">{st.label}</span>
                            <span className="text-ink-3 block truncate text-[11.5px] font-normal">{st.hint}</span>
                          </span>
                        </PopRow>
                      ))}
                    </>
                  )}
                </Pop>
              </div>

              <ReelPlayer spec={spec} style={style} clock={clock} className="w-full" />

              <Beats spec={spec} clock={clock} beat={beat} />
              <WhereItWent spec={spec} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------- 送达图：会议 → 各部门的人 ----------------

const ORDER = (s: ReelSpec) => [...s.meeting.items].sort((a, b) => itemTime(a) - itemTime(b)).map(i => i.id)

/** 一场会的条目排成一小块点阵：属于这个人的亮着，正在讲的那条发白光 */
function ItemDots({ order, kept, hot, cell, gap, on, off, glow }: { order: string[]; kept: string[]; hot?: string | null; cell: number; gap: number; on: string; off: string; glow?: string }) {
  const cols = Math.ceil(order.length / 2)
  return (
    <span className="grid flex-none" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap }} aria-hidden>
      {order.map(id => {
        const k = kept.includes(id)
        const h = hot === id
        return (
          <i
            key={id}
            className="block rounded-[2px] transition-[background-color,box-shadow,transform] duration-300"
            style={{ width: cell, height: cell, background: h ? '#fff' : k ? on : off, boxShadow: h ? `0 0 8px 1px ${glow ?? on}` : undefined, transform: h ? 'scale(1.15)' : undefined }}
          />
        )
      })}
    </span>
  )
}

const DeliveryMap = memo(function DeliveryMap({ specs, as, beatItem, onPick }: { specs: Record<PersonId, ReelSpec>; as: PersonId; beatItem: string | null; onPick: (p: PersonId) => void }) {
  const cur = specs[as]
  const m = cur.meeting
  const order = useMemo(() => ORDER(cur), [cur])
  const list = useRef<HTMLDivElement>(null)
  const rows = useRef<Partial<Record<PersonId, HTMLButtonElement | null>>>({})
  const [lines, setLines] = useState({ lit: 0, end: 0 })
  const teams = TEAMS.map(t => ({ t, people: STAFF.filter(p => p.team === t) })).filter(x => x.people.length)
  const reached = STAFF.filter(p => specs[p.id].kept.length).length

  // 主干从源头画到最后一个人；亮的那段只到选中的人
  useLayoutEffect(() => {
    const box = list.current
    if (!box) return
    const mid = (el?: HTMLElement | null) => (el ? el.offsetTop + el.offsetHeight / 2 : 0)
    const measure = () => {
      const last = STAFF.filter(p => TEAMS.includes(p.team)).at(-1)
      setLines({ lit: mid(rows.current[as]), end: mid(last && rows.current[last.id]) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [as])

  return (
    <section className="sg-card rounded-[24px] p-3 max-xl:order-2 xl:sticky xl:top-2">
      <a href={href(`/m/${m.id}`)} className="sg-dark group flex gap-3 rounded-[18px] p-3" title={L('回放这场会', 'Replay this meeting')}>
        {m.video && <img src={m.video.poster} alt="" className="h-[74px] w-[42px] flex-none rounded-lg object-cover opacity-90 transition-transform group-hover:scale-105" draggable={false} />}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-white/45">{L('源头', 'Source')} · {cnDate(m.date)} · {L(`${personById(m.publisher).name} 发布`, `from ${personById(m.publisher).name}`)}</span>
          <b className="mt-0.5 block truncate text-[14px] text-white">{m.title}</b>
          <span className="mt-2 flex items-center gap-2.5">
            <ItemDots order={order} kept={cur.kept} hot={beatItem} cell={8} gap={3} on="#BBA3D6" off="rgb(255 255 255 / 12%)" />
            <span className="text-[11px] leading-tight text-white/55"><b className="font-mono text-[13px] text-white">{cur.kept.length}</b>/{cur.total}<br />{L(`给${as === ME ? '你' : personById(as).name}`, `for ${as === ME ? 'you' : personById(as).name}`)}</span>
          </span>
        </span>
      </a>

      <div className="text-ink-3 mt-3 flex items-center gap-1.5 px-1 text-[12px]">
        <Kb name="paperPlane" size={16} />{L(`送到 ${reached} 个人 · ${STAFF.length - reached} 人不打扰`, `Sent to ${reached} · ${STAFF.length - reached} not pinged`)}
      </div>

      <div ref={list} className="relative mt-1 pl-8">
        <span className="absolute top-0 left-[15px] w-[2px] rounded-full bg-[rgb(95_62_84/11%)]" style={{ height: lines.end }} />
        <span className="reel-flow-v absolute top-0 left-[15px] w-[2px] rounded-full transition-[height] duration-500" style={{ height: lines.lit }} />
        {teams.map(({ t, people }) => (
          <div key={t} className="pt-2">
            <div className="text-ink-3 pb-1 pl-2 text-[11.5px] font-medium">{t}</div>
            {people.map(p => {
              const s = specs[p.id]
              const on = p.id === as
              const quiet = !s.kept.length
              return (
                <div key={p.id} className="relative">
                  <span className={cn('absolute top-1/2 -left-[17px] h-[2px] w-[17px]', on ? 'reel-flow-h' : quiet ? 'reel-branch-quiet' : 'bg-[rgb(95_62_84/11%)]')} />
                  <button
                    ref={el => { rows.current[p.id] = el }}
                    onClick={() => onPick(p.id)}
                    className={cn('reel-node flex w-full items-center gap-2.5 rounded-2xl py-1.5 pr-2.5 pl-1.5 text-left', on && 'on', quiet && 'quiet')}
                    aria-pressed={on}
                  >
                    <Face p={p} size={32} muted={quiet} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="flex items-center gap-1.5"><b className="text-[13.5px]">{p.name}</b><RankTag p={p} short /></span>
                      <span className="text-ink-3 block truncate text-[11.5px]">{p.role}</span>
                    </span>
                    {quiet
                      ? <span className="text-ink-4 flex-none text-[11.5px]">{L('不打扰', 'No ping')}</span>
                      : <ItemDots order={order} kept={s.kept} cell={4} gap={1.5} on={on ? '#5F3E54' : '#8C7689'} off="rgb(95 62 84 / 10%)" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {on && <Profile pid={p.id} />}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
})

/** 选中的人展开一格：会映就是按这几样认出“这条和 TA 有关” */
function Profile({ pid }: { pid: PersonId }) {
  const p = personById(pid)
  const chips = [
    ...p.profile.owns.slice(0, 3).map(x => ({ k: L('负责', 'Owns'), x, cls: 'sg-well text-ink-2' })),
    ...p.profile.dependsOn.slice(0, 2).map(x => ({ k: L('依赖', 'Depends'), x, cls: 'bg-rose-50/80 text-rose-700 shadow-[inset_0_0_0_1px_rgb(225_29_72/12%)]' })),
    ...p.profile.interests.slice(0, 2).map(x => ({ k: L('订阅', 'Follows'), x, cls: 'bg-[rgb(95_62_84/8%)] text-[var(--plum)] shadow-[inset_0_0_0_1px_rgb(95_62_84/12%)]' })),
  ]
  return (
    <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}>
      <div className="flex flex-wrap gap-1 px-2 pt-1.5 pb-2.5 text-[11px]">
        {chips.map(c => <span key={c.k + c.x} className={cn('rounded-full px-2 py-px', c.cls)}>{c.k} {c.x}</span>)}
        {!chips.length && <span className="text-ink-3">{L('还没有关注档案', 'No interest profile yet')}</span>}
      </div>
    </motion.div>
  )
}

// ---------------- 片子里的每一条：为什么是你，播到哪条亮哪条 ----------------

function Beats({ spec, clock, beat }: { spec: ReelSpec; clock: ReelClock; beat: number }) {
  const n = spec.beats.length
  const nextOn = clock.t >= ACT.next[0] && clock.t < ACT.next[1]
  if (!n && !spec.next) return null
  const seek = (t: number) => { clock.seek(t + 0.05); clock.play() }
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2"><h2 className="text-[15px] font-semibold">{L('片子里讲的', 'In the reel')}</h2><span className="text-ink-3 text-[12.5px]">{L(`每一条都连着 ${spec.person.name} 手上的事，点一下跳到那一段`, `Each one ties to something ${spec.person.name} is working on — click to jump to that moment`)}</span></div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {spec.beats.map((b, i) => {
          const [a, z] = beatWindow(i, n)
          const on = beat === i
          return (
            <button key={b.entry.item.id} className={cn('reel-beat relative overflow-hidden rounded-[18px] p-3 text-left', on && 'on')} onClick={() => seek(a)}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold opacity-60">0{i + 1}</span>
                <TypePill item={b.entry.item} />
                {b.entry.tier === 'must' && <span className="rounded-md bg-rose-50 px-1 text-[10.5px] leading-4 text-rose-700">{L('必读', 'Must-read')}</span>}
                <span className="ml-auto font-mono text-[10.5px] opacity-50">{tc(a)}</span>
              </div>
              <b className="mt-2 line-clamp-2 block text-[13.5px] leading-snug">{b.entry.forYou}</b>
              <p className="reel-why mt-1.5 line-clamp-3 text-[12px] leading-snug">{L('为什么是你：', 'Why you: ')}{b.entry.why}</p>
              <p className="reel-why mt-1.5 truncate text-[11.5px]">{L('原话', 'Quote')} · {b.speaker.name} {tc(b.at)}</p>
              {on && <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#E9B8DA]" style={{ transform: `scaleX(${(clock.t - a) / (z - a)})` }} />}
            </button>
          )
        })}
        {spec.next && (
          <button className={cn('reel-beat next relative overflow-hidden rounded-[18px] p-3 text-left', nextOn && 'on')} onClick={() => seek(ACT.next[0])}>
            <div className="flex items-center gap-2">
              <Kb name="calendar" size={18} />
              <span className="text-[12px] font-semibold">{L('接下来', 'Next up')}</span>
              <span className="ml-auto rounded-md bg-amber-50 px-1.5 text-[11px] leading-[18px] text-amber-700">{spec.next.dueLabel}</span>
            </div>
            <b className="mt-2 line-clamp-2 block text-[13.5px] leading-snug">{spec.next.item.title}</b>
            <p className="reel-why mt-1.5 line-clamp-3 text-[12px] leading-snug">{spec.next.link}</p>
            <p className="reel-why mt-1.5 truncate text-[11.5px]">{L('来自', 'From')} {spec.next.meeting.title.replace(/ · .*/, '')}</p>
            {nextOn && <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#E9B8DA]" style={{ transform: `scaleX(${(clock.t - ACT.next[0]) / (ACT.next[1] - ACT.next[0])})` }} />}
          </button>
        )}
      </div>
    </section>
  )
}

/** 20 条都去哪了：留给 TA 的、片子没讲但在简报里的、划掉的 */
function WhereItWent({ spec }: { spec: ReelSpec }) {
  const [open, setOpen] = useState(false)
  const inReel = spec.beats.map(b => b.entry.item.id)
  const items = [...spec.meeting.items].sort((a, b) => itemTime(a) - itemTime(b))
  const kept = items.filter(i => spec.kept.includes(i.id))
  const cut = items.filter(i => !spec.kept.includes(i.id))
  return (
    <section className="sg-card overflow-hidden rounded-[20px]">
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/60" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <Kb name="stamp" size={22} />
        <span className="min-w-0 flex-1">
          <b className="block text-[14px]">{L(`${spec.total} 条都去哪了`, `Where all ${spec.total} items went`)}</b>
          <span className="text-ink-3 block text-[12px]">{L(`留给 ${spec.person.name} ${kept.length} 条${spec.more ? `（片子讲 ${inReel.length} 条，另外 ${spec.more} 条在飞书简报里）` : ''} · 划掉 ${cut.length} 条`, `${kept.length} kept for ${spec.person.name}${spec.more ? ` (${inReel.length} in the reel, ${spec.more} more in the Lark brief)` : ''} · ${cut.length} cut`)}</span>
        </span>
        <span className={cn('grid size-7 flex-none place-items-center rounded-full transition-transform', open ? 'sg-onyx rotate-180' : 'sg-raised text-ink-2')}><ChevronDown size={15} /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-[rgb(95_62_84/7%)] p-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[12.5px] font-medium">{L('留给 TA 的', 'Kept for them')}</div>
                <ul className="flex flex-col gap-1">
                  {kept.map(it => (
                    <li key={it.id} className="sg-raised flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12.5px]">
                      <TypePill item={it} /><span className="min-w-0 flex-1 truncate">{it.title}</span>
                      <span className="text-ink-3 flex-none text-[11px]">{inReel.includes(it.id) ? L('片子里', 'in reel') : L('简报里', 'in brief')}</span>
                    </li>
                  ))}
                  {!kept.length && <li className="text-ink-3 text-[12.5px]">{L(`一条都没有，这场不打扰 ${spec.person.name}。`, `None — ${spec.person.name} isn’t pinged this time.`)}</li>}
                </ul>
              </div>
              <div>
                <div className="text-ink-3 mb-2 text-[12.5px] font-medium">{L('划掉的 · 和 TA 负责、依赖、订阅的都对不上', 'Cut · doesn’t match anything they own, depend on or follow')}</div>
                <ul className="flex flex-col gap-1">
                  {cut.map(it => (
                    <li key={it.id} className="sg-well flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12.5px] opacity-70">
                      <TypePill item={it} /><span className="min-w-0 flex-1 truncate line-through decoration-[rgb(95_62_84/35%)]">{it.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
