// 会议知识库：所有会议的账本、逐字稿和资料（PDF / Word / Markdown / 截图）汇在一起，可以问、可以筛；
// 每个回答和条目都能回到原话那一秒。账本按会议折叠，筛选收进下拉，点一条弹出详情（原话、负责人、发给了谁）。
// 每天的自进化挪到了顶栏右上角的“自进化中”。
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { ArrowUp } from 'lucide'
import { ChevronDown, ChevronRight, ExternalLink, ImageOff, Lock, Play, Search, X } from 'lucide-react'
import { ITEM_TYPES, ME, PROJECTS, personById, projectById, type ItemType, type PersonId, type ProjectId } from '@/data/model'
import { ALL_ITEMS, MEETINGS, meetingById, type Item, type Meeting } from '@/data/meetings'
import { itemTime, mmss, quoteSpan, visibility } from '@/data/derive'
import { EXTRAS, type MeetingFile } from '@/data/extras'
import { goSource, href, useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Empty, Face, Kb, RankTag, TypePill } from '@/components/common/bits'
import { rich, richLen, useStream } from '@/components/common/stream'
import { FileIcon } from '@/components/common/FileIcon'
import { DotLoader, DotText } from '@/components/common/DotMatrix'
import { Modal, ModalClose, Pop, PopRow } from '@/components/common/Pop'

const QA: { q: string; a: string }[] = [
  { q: '竞品的一票否决和我们差在哪？', a: '差在**评审机制**。小米：所有环节业务评估后还要单独过安委会评估 [[xm_09]]，安全有**一票否决权** [[xm_10]]。我们：10/28 安全周会上宋岚说安委会只做事后通报，**评审里没有否决权** [[sf_01]]，她准备在下月经营会上提方案，让安全评审变成一道关 [[sf_02]]。' },
  { q: '“同档最安全”我们该怎么回应？', a: '这是对方按价位段直接比较的定位 [[xm_06]]。门店这周三成进店客户主动问安全 [[rt_01]]，所以要先有统一说法：门店安全话术卡由江晚出内容，**11/5 前印到门店** [[rt_05]]。注意对方“应该是行业内首个”没给出处 [[xm_18]]，物料里不要直接引用。' },
  { q: '车主培训和积分，我们和对方差多少？', a: '培训差一个数量级：对方 2025 年线下高阶驾驶安全培训 **484 场、10620 人** [[xm_17]]；我们今年 60 多场，**场地是瓶颈** [[ow_04]]。积分思路相近：对方新车主 90 天打卡得 4000 积分 [[xm_19]]；我们驾驶评分打开率只有 6% [[ow_01]]，决定和积分挂钩试点 [[ow_02]]，方案 11/10 前给韩总 [[ow_05]]。' },
  { q: '座椅夹手之前提过吗？', a: '提过。10/28 安全周会上魏然说电动座椅回位时**夹到了小孩的手**，开发阶段没有这个工况 [[sf_03]]，宋岚让他 **11/7 前**补进开发阶段安全检查清单 [[sf_04]]。小米直播里丁志也拿座椅调节夹手举例 [[xm_14]]，这条已经推给了魏然。' },
]

type Answer = { id: number; q: string; a: string }

const BY_DATE = [...MEETINGS].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
const TOPICS = (() => {
  const c = new Map<string, number>()
  ALL_ITEMS.forEach(i => c.set(i.topic, (c.get(i.topic) ?? 0) + 1))
  return [...c.entries()].sort((a, b) => b[1] - a[1])
})()

export function Knowledge() {
  const route = useRoute()
  const [draft, setDraft] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [type, setType] = useState<ItemType | null>(null)
  const [project, setProject] = useState<ProjectId | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(() => new Set([BY_DATE[0].id]))
  const [detail, setDetail] = useState<Item | null>(null)
  const [docked, setDocked] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const heroForm = useRef<HTMLFormElement>(null)
  const heroInput = useRef<HTMLInputElement>(null)
  const dockInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const root = scroller.current
    const form = heroForm.current
    if (!root || !form) return
    const observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting && entry.boundingClientRect.top < entry.rootBounds!.top), { root })
    observer.observe(form)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const previous = docked ? heroInput.current : dockInput.current
    const next = docked ? dockInput.current : heroInput.current
    if (document.activeElement === previous) {
      const start = previous?.selectionStart ?? null
      const end = previous?.selectionEnd ?? null
      next?.focus({ preventScroll: true })
      next?.setSelectionRange(start, end)
    }
  }, [docked])

  const ask = (q: string) => {
    const hit = QA.find(x => x.q === q) ?? QA.find(x => q.includes(x.q.slice(0, 4)))
    setAnswers(a => [{ id: Date.now(), q, a: hit?.a ?? '知识库里还找不到能回答这个问题的原话。可以试试下面这些问题。' }, ...a].slice(0, 3))
    setDraft('')
    scroller.current?.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  // 从别的页面带着问题跳过来（?q=…）；同一个地址只问一次
  const asked = useRef('')
  useEffect(() => {
    const q = route.query.get('q')
    if (q && asked.current !== route.raw) {
      asked.current = route.raw
      ask(q)
    }
  }, [route.raw]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim()
  const filtering = !!(type || project || topic || q)
  const items = useMemo(() => ALL_ITEMS.filter(it =>
    (!type || it.type === type) &&
    (!project || meetingById(it.meeting)!.project === project) &&
    (!topic || it.topic === topic) &&
    (!q || `${it.title}${it.quote}${it.topic}${it.detail ?? ''}`.includes(q)),
  ), [type, project, topic, q])
  const groups = BY_DATE.map(m => ({ m, list: items.filter(i => i.meeting === m.id).sort((a, b) => itemTime(a) - itemTime(b)) })).filter(g => g.list.length)
  // 一筛选就把命中的会议都展开；清掉筛选回到只开最近一场
  useEffect(() => {
    setOpen(new Set(filtering ? groups.map(g => g.m.id) : [BY_DATE[0].id]))
  }, [type, project, topic, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOpen = groups.length > 0 && groups.every(g => open.has(g.m.id))
  const files = MEETINGS.flatMap(m => EXTRAS[m.id].files.map(f => ({ f, m })))
  const clear = () => { setType(null); setProject(null); setTopic(null); setQuery('') }

  return (
    <>
      <TopBar crumbs={docked ? [] : [{ label: '会议知识库' }]} center={
        <div className={cn('kb-dock', docked && 'is-docked')} inert={!docked} aria-hidden={!docked}>
          <span className="kb-dock-title" aria-label="问问所有会议"><DotText text="问问所有会议" rows={16} pitch={1.6} /></span>
          <form className="kb-dock-search" onSubmit={e => { e.preventDefault(); if (draft.trim()) ask(draft.trim()) }}>
            <Search size={15} className="text-ink-3 flex-none" />
            <input ref={dockInput} aria-label="搜索所有会议" value={draft} onChange={e => setDraft(e.target.value)} placeholder="问问所有会议…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
            <button aria-label="提交顶部提问" disabled={!draft.trim()} className="sg-onyx grid size-7 flex-none place-items-center rounded-full disabled:opacity-30"><MorphIcon icon={ArrowUp} size={14} /></button>
          </form>
        </div>
      } />
      <div ref={scroller} data-scroll="knowledge" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-6">
          <div className="glass-inquiry rounded-3xl border px-6 pt-6 pb-5">
            <div>
              <h1 className="sr-only">问问所有会议</h1>
              <DotText text="问问所有会议" rows={16} pitch={5.2} />
              <p className="text-ink-3 mt-3 text-[13px]">{MEETINGS.length} 场会 · {ALL_ITEMS.length} 条账本 · {files.length} 份资料 · 每个回答都附原话，点一下回到录像那一秒</p>
            </div>
            <form ref={heroForm} className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,.08),0_6px_20px_-8px_rgba(0,0,0,.12)]" onSubmit={e => { e.preventDefault(); if (draft.trim()) ask(draft.trim()) }}>
              <span className="sg-raised ml-0.5 grid size-9 flex-none place-items-center rounded-xl text-[var(--plum)]"><Kb name="magnifyingGlass" size={20} /></span>
              <input ref={heroInput} tabIndex={docked ? -1 : 0} aria-label="向会议知识库提问" value={draft} onChange={e => setDraft(e.target.value)} placeholder="例如：竞品的一票否决和我们差在哪？" className="placeholder:text-ink-3 h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
              <button className={cn('grid size-9 place-items-center rounded-full text-white transition-colors', draft.trim() ? 'sg-onyx' : 'bg-[#D7D7D7]')} aria-label="提问"><MorphIcon icon={ArrowUp} size={17} strokeWidth={2.4} /></button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {QA.map(x => <button key={x.q} onClick={() => ask(x.q)} className="kb-tile text-ink-2 rounded-full border bg-white px-3 py-1 text-[13px]">{x.q}</button>)}
            </div>
            <AnimatePresence initial={false}>
              {answers.map((a, i) => <AnswerCard key={a.id} a={a} dim={i > 0} />)}
            </AnimatePresence>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0">
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <h2 className="text-[16px] font-semibold">账本</h2>
                <span className="text-ink-3 text-[12.5px]">所有会议的条目，点一条看原话和发给了谁</span>
                <Access />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="text-ink-3 absolute top-1/2 left-3 -translate-y-1/2" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="筛选条目或原话" className="h-[34px] w-56 rounded-xl border border-white bg-white/70 pr-2 pl-8 text-[13px] shadow-[0_0_0_1px_rgb(95_62_84/8%)] outline-none focus:bg-white focus:shadow-[0_0_0_1px_rgb(95_62_84/26%)]" />
                </div>
                <Pop
                  active={!!type}
                  onClear={() => setType(null)}
                  label={type ? <><i className="size-2 flex-none rounded-full" style={{ background: ITEM_TYPES[type].color }} />{ITEM_TYPES[type].label}</> : '类型'}
                  width={200}
                >
                  {close => (
                    <>
                      <PopRow on={!type} count={ALL_ITEMS.length} onClick={() => { setType(null); close() }}>全部类型</PopRow>
                      {(Object.keys(ITEM_TYPES) as ItemType[]).map(k => (
                        <PopRow key={k} on={type === k} count={ALL_ITEMS.filter(i => i.type === k).length} onClick={() => { setType(k); close() }}>
                          <i className="size-2 flex-none rounded-full" style={{ background: ITEM_TYPES[k].color }} />{ITEM_TYPES[k].label}
                        </PopRow>
                      ))}
                    </>
                  )}
                </Pop>
                <Pop
                  active={!!project}
                  onClear={() => setProject(null)}
                  label={project ? <><i className="size-2 flex-none rounded-full" style={{ background: projectById(project).color }} />{projectById(project).name}</> : '项目'}
                  width={230}
                >
                  {close => (
                    <>
                      <PopRow on={!project} count={MEETINGS.length + ' 场'} onClick={() => { setProject(null); close() }}>全部项目</PopRow>
                      {PROJECTS.map(p => (
                        <PopRow key={p.id} on={project === p.id} count={MEETINGS.filter(m => m.project === p.id).length + ' 场'} onClick={() => { setProject(p.id); close() }}>
                          <span className="flex-none" style={{ color: p.color }}><Kb name={p.icon} size={18} /></span>{p.name}
                        </PopRow>
                      ))}
                    </>
                  )}
                </Pop>
                <Pop active={!!topic} onClear={() => setTopic(null)} label={topic ? `# ${topic}` : '话题'} width={340}>
                  {close => (
                    <div className="p-2">
                      <div className="text-ink-3 mb-2 flex items-center gap-1.5 text-[12px]"><Kb name="signpost" size={16} />按话题看，越大的讲得越多</div>
                      <div className="flex flex-wrap gap-1.5">
                        {TOPICS.map(([tp, n]) => (
                          <button key={tp} onClick={() => { setTopic(tp); close() }} className={cn('kb-tile rounded-full border px-2.5 py-0.5', topic === tp ? 'sg-onyx border-transparent' : 'bg-white/70')} style={{ fontSize: 11.5 + n * 0.8 }}>
                            {tp} <span className={topic === tp ? 'text-white/60' : 'text-ink-4'}>{n}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Pop>
                {filtering && <button className="text-ink-3 hover:text-ink inline-flex h-[34px] items-center gap-1 px-1.5 text-[12.5px]" onClick={clear}><X size={13} />清除筛选</button>}
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-ink-3 text-[12.5px] tabular-nums">{items.length} 条 · {groups.length} 场会</span>
                  {groups.length > 1 && (
                    <button className="text-ink-2 hover:text-ink inline-flex items-center gap-1 text-[12.5px]" onClick={() => setOpen(new Set(allOpen ? [] : groups.map(g => g.m.id)))}>
                      <ChevronDown size={14} className={cn('transition-transform', allOpen && 'rotate-180')} />{allOpen ? '全部收起' : '全部展开'}
                    </button>
                  )}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {!groups.length && <Empty icon="magnifyingGlass" title="没有匹配的条目" sub="换个关键词，或者清掉筛选。" />}
                {groups.map(({ m, list }) => <LedgerGroup key={m.id} m={m} list={list} open={open.has(m.id)} onToggle={() => toggle(m.id)} onPick={setDetail} />)}
              </div>
            </section>

            <Library files={files} />
          </div>
        </div>
      </div>
      <Modal open={!!detail} onClose={() => setDetail(null)} label="条目详情" className="pc-sheet w-[min(580px,calc(100vw-32px))] rounded-[26px] p-5">
        {detail && <ItemDetail it={detail} onTopic={tp => { setDetail(null); setTopic(tp) }} />}
      </Modal>
    </>
  )
}

/** 权限说明：收进账本标题旁边的一个小按钮 */
function Access() {
  const restricted = ALL_ITEMS.filter(i => i.sensitivity === 'restricted' && visibility(i, ME) === 'full')
  return (
    <Pop label={<><Lock size={12} />按权限显示</>} width={300} triggerClassName="h-7 rounded-full text-[12px]" title="知识库怎么按权限显示">
      {() => (
        <div className="p-2.5 text-[12.5px] leading-relaxed">
          <p className="text-ink-2">受限条目对名单外的人只显示脱敏版。你现在是 <b>{personById(ME).name}</b>，在 {restricted.length} 条受限条目的名单里：</p>
          <ul className="mt-2 flex flex-col gap-1">
            {restricted.map(i => <li key={i.id} className="sg-well flex items-center gap-1.5 rounded-lg px-2 py-1"><Lock size={11} className="flex-none text-rose-600" /><span className="truncate">{i.title}</span></li>)}
          </ul>
        </div>
      )}
    </Pop>
  )
}

// ---------------- 账本：一场会一块，点开才展开 ----------------

function LedgerGroup({ m, list, open, onToggle, onPick }: { m: Meeting; list: Item[]; open: boolean; onToggle: () => void; onPick: (it: Item) => void }) {
  const p = projectById(m.project)
  const types = (Object.keys(ITEM_TYPES) as ItemType[]).map(k => ({ k, n: list.filter(i => i.type === k).length })).filter(x => x.n)
  return (
    <section className={cn('sg-card overflow-hidden rounded-[20px] transition-shadow', open && 'shadow-[inset_0_1px_0_#fff,0_0_0_.5px_rgb(95_62_84/12%),0_18px_36px_-24px_rgb(40_24_36/45%)]')}>
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/60" onClick={onToggle} aria-expanded={open}>
        <span className="grid size-10 flex-none place-items-center rounded-xl" style={{ background: p.soft, color: p.color }}><Kb name={p.icon} size={24} /></span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[14.5px]">{m.title}</b>
          <span className="text-ink-3 block truncate text-[12px]">{p.name} · {cnDate(m.date)} · {m.publisher === ME ? '我' : personById(m.publisher).name} 发布</span>
        </span>
        <span className="hidden w-[132px] flex-none sm:block" title={types.map(x => `${ITEM_TYPES[x.k].label} ${x.n}`).join(' · ')}>
          <span className="flex h-1.5 gap-[2px] overflow-hidden rounded-full">
            {types.map(x => <i key={x.k} className="h-full" style={{ flex: x.n, background: ITEM_TYPES[x.k].color }} />)}
          </span>
          <span className="text-ink-3 mt-1 flex gap-2 text-[11px]">
            {types.slice(0, 3).map(x => <span key={x.k} className="flex items-center gap-1"><i className="size-1.5 rounded-full" style={{ background: ITEM_TYPES[x.k].color }} />{ITEM_TYPES[x.k].label}{x.n}</span>)}
          </span>
        </span>
        <span className="text-ink-2 w-10 flex-none text-right text-[13px] font-medium tabular-nums">{list.length}<span className="text-ink-3 ml-0.5 text-[11px] font-normal">条</span></span>
        <span className={cn('grid size-7 flex-none place-items-center rounded-full transition-transform', open ? 'sg-onyx rotate-180' : 'sg-raised text-ink-2')}><ChevronDown size={15} /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="border-t border-[rgb(95_62_84/7%)]">
              {list.map((it, i) => <KbRow key={it.id} it={it} i={i} onPick={() => onPick(it)} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function KbRow({ it, i, onPick }: { it: Item; i: number; onPick: () => void }) {
  const confirmed = useStore(s => s.confirmed)
  const owners = useStore(s => s.owners)
  const owner = owners[it.id] ?? it.owner
  const ok = !!confirmed[it.id]
  const vis = visibility(it, ME)
  const { t0, seg } = quoteSpan(it)
  return (
    <motion.div
      className="kb-row flex cursor-pointer items-center gap-3 border-b border-[rgb(95_62_84/6%)] px-4 py-2.5 last:border-0"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 12) * 0.018 }}
      onClick={onPick}
    >
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:underline" aria-haspopup="dialog">
        <TypePill item={it} />
        <span className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium">
          <span className="truncate">{vis === 'redacted' ? it.redacted : it.title}</span>
          {it.sensitivity === 'restricted' && <Lock size={12} className="flex-none text-rose-600" />}
          {it.flags?.map(f => <span key={f} className="flex-none rounded bg-amber-50 px-1 text-[11px] font-normal text-amber-700">{f}</span>)}
        </span>
      </button>
      <span className="text-ink-2 hidden flex-none items-center gap-3 text-[12.5px] md:flex">
        {owner && <span className="inline-flex items-center gap-1"><Face p={owner} size={18} />{personById(owner).name}</span>}
        {it.due && <span className="tabular-nums">{it.due}</span>}
        {it.type === 'action' && <span className={ok ? 'text-emerald-600' : 'text-ink-3'}>{ok ? '✓ 已确认' : '待确认'}</span>}
      </span>
      {vis === 'full' && (
        <button
          className="text-ink-3 hover:text-primary flex flex-none items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[11.5px] transition-colors hover:bg-[#EEF3FF]"
          title={`回到录像：${personById(seg.speaker).name} ${mmss(t0)}`}
          onClick={e => { e.stopPropagation(); goSource(it.meeting, Math.max(0, t0 - 0.4), it.id) }}
        >
          <Play size={10} fill="currentColor" />{mmss(t0)}
        </button>
      )}
      <ChevronRight size={15} className="kb-row-go text-ink-3 flex-none" />
    </motion.div>
  )
}

// ---------------- 条目详情弹窗：原话、负责人、发给了谁 ----------------

function ItemDetail({ it, onTopic }: { it: Item; onTopic: (t: string) => void }) {
  const confirmed = useStore(s => s.confirmed)
  const owners = useStore(s => s.owners)
  const m = meetingById(it.meeting)!
  const p = projectById(m.project)
  const vis = visibility(it, ME)
  const { t0, seg } = quoteSpan(it)
  const speaker = personById(seg.speaker)
  const owner = owners[it.id] ?? it.owner
  const ok = confirmed[it.id]
  const sent = [...new Set(m.routes.filter(r => r.item === it.id).map(r => r.person))].map(pid => ({ pid, reasons: [...new Set(m.routes.filter(r => r.item === it.id && r.person === pid).flatMap(r => r.reasons))] }))
  const go = () => goSource(it.meeting, Math.max(0, t0 - 0.4), it.id)

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <TypePill item={it} />
        <a href={href(`/m/${m.id}`)} className="text-ink-3 hover:text-ink flex min-w-0 items-center gap-1.5 text-[12.5px]">
          <i className="size-1.5 flex-none rounded-full" style={{ background: p.color }} /><span className="truncate">{m.title} · {cnDate(m.date)}</span>
        </a>
        <ModalClose className="ml-auto" />
      </div>
      <h3 className="mt-3 text-[20px] leading-snug font-semibold tracking-tight">
        {vis === 'redacted' ? it.redacted : it.title}
        {it.sensitivity === 'restricted' && <Lock size={15} className="ml-1.5 inline align-[-1px] text-rose-600" />}
      </h3>
      {!!it.flags?.length && <div className="mt-1.5 flex gap-1.5">{it.flags.map(f => <span key={f} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11.5px] text-amber-700">{f}</span>)}</div>}
      {it.detail && vis === 'full' && <p className="text-ink-2 mt-2 text-[13.5px] leading-relaxed">{it.detail}</p>}

      {vis === 'full' ? (
        <div className="sg-dark mt-4 rounded-[20px] p-4">
          <div className="flex items-center gap-2.5">
            <Face p={speaker} size={30} />
            <span className="min-w-0 leading-tight"><b className="block text-[13.5px]">{speaker.name}</b><span className="block truncate text-[11.5px] text-white/50">{speaker.role}</span></span>
            <span className="ml-auto font-mono text-[12px] text-white/50">{mmss(t0)}</span>
          </div>
          <p className="mt-3 text-[16px] leading-relaxed text-white/95">“{it.quote}”</p>
          <button className="sg-white-btn mt-3.5 inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium" onClick={go}>
            <Play size={12} fill="currentColor" />回到录像这一秒
          </button>
        </div>
      ) : (
        <div className="sg-well mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-[13px]"><Lock size={14} className="text-rose-600" />原话含受限信息，你看到的是脱敏版</div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-[12.5px]">
        <Fact label="负责人">{owner ? <span className="flex items-center gap-1.5"><Face p={owner} size={20} /><b className="font-medium">{personById(owner).name}</b></span> : <span className="text-ink-3">—</span>}</Fact>
        <Fact label="截止">{it.due ?? <span className="text-ink-3">—</span>}</Fact>
        <Fact label="话题"><button className="hover:text-[var(--plum)] hover:underline" onClick={() => onTopic(it.topic)}># {it.topic}</button></Fact>
      </div>
      {it.type === 'action' && <p className={cn('mt-2 text-[12.5px]', ok ? 'text-emerald-600' : 'text-ink-3')}>{ok ? `✓ ${personById(ok).name} 已确认负责` : '负责人还没确认'}</p>}

      <div className="mt-4">
        <div className="text-ink-3 mb-2 flex items-center gap-1.5 text-[12px]"><Kb name="route" size={16} />{sent.length ? `会映把这条发给了 ${sent.length} 个人` : '只在账本里，没有推给任何人'}</div>
        <div className="flex flex-col gap-1.5">
          {sent.map(({ pid, reasons }) => <SentRow key={pid} pid={pid} reasons={reasons} />)}
        </div>
      </div>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sg-well rounded-xl px-3 py-2">
      <div className="text-ink-3 text-[11px]">{label}</div>
      <div className="mt-0.5 truncate">{children}</div>
    </div>
  )
}

function SentRow({ pid, reasons }: { pid: PersonId; reasons: string[] }) {
  const p = personById(pid)
  return (
    <div className="sg-raised flex items-center gap-2.5 rounded-xl py-1.5 pr-2 pl-1.5">
      <Face p={p} size={26} />
      <b className="text-[13px] font-medium">{p.name}</b>
      <RankTag p={p} />
      <span className="text-ink-3 min-w-0 truncate text-[12px]">{p.team}</span>
      <span className="ml-auto flex flex-none gap-1">{reasons.map(r => <span key={r} className={cn('rounded-full px-2 py-px text-[11px]', r === 'R4' ? 'bg-ink text-white' : 'sg-well text-ink-2')}>{REASON_SHORT[r] ?? r}</span>)}</span>
    </div>
  )
}

const REASON_SHORT: Record<string, string> = { R1: '被点名', R2: '角色', R3: '负责', R4: '依赖', R5: '订阅', R6: '管理者' }

// ---------------- 资料：PDF、Word、Markdown、截图 ----------------

/** 截图：加载失败时给一个安静的占位，不露出裂图和文件名 */
function Shot({ src, name, className }: { src?: string; name: string; className?: string }) {
  const [bad, setBad] = useState(!src)
  if (bad) return <span className="text-ink-4 grid size-full place-items-center"><ImageOff size={22} /></span>
  return <img src={src} alt={name} onError={() => setBad(true)} className={cn('size-full object-cover transition-transform duration-500 group-hover:scale-105', className)} />
}

const shotLabel = (name: string) => name.replace(/^直播截图_/, '').replace(/\.jpg$/, '').replace('_', ' ')

function Library({ files }: { files: { f: MeetingFile; m: Meeting }[] }) {
  const docs = files.filter(x => x.f.kind !== 'img')
  const imgs = files.filter(x => x.f.kind === 'img')
  const [shot, setShot] = useState<MeetingFile | null>(null)
  const [more, setMore] = useState(false)
  const shown = more ? docs : docs.slice(0, 4)
  return (
    <aside className="glass-panel min-w-0 rounded-[22px] border p-4 xl:sticky xl:top-2">
      <div className="flex items-center gap-2"><Kb name="document" size={22} /><h2 className="text-[15px] font-semibold">资料</h2><span className="text-ink-3 text-[12px]">{files.length} 份 · 和账本一起检索</span></div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {imgs.map(({ f }) => (
          <button key={f.name} onClick={() => setShot(f)} className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-[#F1F2F5]" title={`看大图：${shotLabel(f.name)}`}>
            <Shot src={f.url} name={f.name} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pt-5 pb-1 text-left text-[10.5px] leading-tight text-white">{shotLabel(f.name)}</span>
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex flex-col">
        <AnimatePresence initial={false}>
          {shown.map(({ f, m }) => (
            <motion.a
              key={m.id + f.name}
              layout
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              href={f.previewUrl ?? f.url} target="_blank" rel="noreferrer"
              className={cn('group flex items-center gap-2.5 overflow-hidden rounded-xl px-1.5 py-1.5 hover:bg-white/70', !f.url && 'pointer-events-none')}
            >
              <FileIcon kind={f.kind} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium">{f.name}</span>
                <span className="text-ink-3 block truncate text-[11px]">{m.title.replace(/ · .*/, '')} · {personById(f.owner).name} · {f.size}</span>
              </span>
              {f.url ? <ExternalLink size={12} className="text-ink-4 group-hover:text-ink flex-none" /> : <span className="text-ink-4 flex-none text-[10.5px]">仅索引</span>}
            </motion.a>
          ))}
        </AnimatePresence>
        {docs.length > 4 && (
          <button className="text-ink-2 hover:text-ink mt-1 inline-flex items-center gap-1 self-start rounded-full px-1.5 py-1 text-[12px]" onClick={() => setMore(v => !v)}>
            <ChevronDown size={13} className={cn('transition-transform', more && 'rotate-180')} />{more ? '收起' : `还有 ${docs.length - 4} 份`}
          </button>
        )}
      </div>
      <Modal open={!!shot} onClose={() => setShot(null)} label="截图大图" className="w-[min(560px,calc(100vw-32px))]">
        {shot && (
          <figure className="overflow-hidden rounded-[22px] bg-black shadow-2xl">
            <div className="max-h-[78svh] overflow-hidden"><Shot src={shot.url} name={shot.name} className="h-auto object-contain group-hover:scale-100" /></div>
            <figcaption className="flex items-center gap-2 px-4 py-3 text-[12.5px] text-white/80">
              <span className="min-w-0 flex-1 truncate">{shotLabel(shot.name)} · {personById(shot.owner).name} 截于 {shot.date}</span>
              <ModalClose className="!bg-white/10 !text-white !shadow-none" />
            </figcaption>
          </figure>
        )}
      </Modal>
    </aside>
  )
}

// ---------------- 回答 ----------------

function AnswerCard({ a, dim }: { a: Answer; dim: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 650)
    return () => clearTimeout(id)
  }, [])
  const n = useStream(ready, false, 70)
  const len = richLen(a.a)
  return (
    <motion.div layout className={cn('sg-card mt-4 rounded-2xl p-4 transition-opacity', dim && 'opacity-60 hover:opacity-100')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="text-ink-3 text-[12.5px]">问：{a.q}</div>
      <div className="mt-1.5 text-[15px] leading-[1.8]">
        {!ready ? <span className="inline-flex items-center gap-2.5"><DotLoader cols={5} rows={3} className="text-[var(--plum)]" /><span className="shimmer-text">正在翻 {MEETINGS.length} 场会的账本、录像和资料</span></span> : <>{rich(a.a, n, () => true)}{n < len && <span className="cursor-dot" />}</>}
      </div>
    </motion.div>
  )
}
