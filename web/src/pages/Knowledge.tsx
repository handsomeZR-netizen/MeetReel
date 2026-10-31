// 会议知识库：所有会议的账本、逐字稿和资料（PDF / Word / Markdown / 截图）汇在一起，可以问、可以筛；
// 每个回答和条目都能回到原话那一秒。右边的动画是知识库每天的自进化：新会议和资料切块入库，回流的确认、退回改写关注档案和路由规则。
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { ArrowUp } from 'lucide'
import { ExternalLink, FileText, ImageOff, Lock, Pause, Play, Repeat2, Search, Video } from 'lucide-react'
import { ITEM_TYPES, ME, PROJECTS, personById, projectById, type ItemType, type ProjectId } from '@/data/model'
import { ALL_ITEMS, MEETINGS, type Item } from '@/data/meetings'
import { itemTime, visibility } from '@/data/derive'
import { EXTRAS, type MeetingFile } from '@/data/extras'
import { useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Empty, Face, Kb, SourceChip, TypePill } from '@/components/common/bits'
import { rich, richLen, useStream } from '@/components/common/stream'
import { FileIcon } from '@/components/common/FileIcon'
import { DotLoader, DotText, easeOut, hash, square, useDotCanvas } from '@/components/common/DotMatrix'

const QA: { q: string; a: string }[] = [
  { q: '竞品的一票否决和我们差在哪？', a: '差在**评审机制**。小米：所有环节业务评估后还要单独过安委会评估 [[xm_09]]，安全有**一票否决权** [[xm_10]]。我们：10/28 安全周会上宋岚说安委会只做事后通报，**评审里没有否决权** [[sf_01]]，她准备在下月经营会上提方案，让安全评审变成一道关 [[sf_02]]。' },
  { q: '“同档最安全”我们该怎么回应？', a: '这是对方按价位段直接比较的定位 [[xm_06]]。门店这周三成进店客户主动问安全 [[rt_01]]，所以要先有统一说法：门店安全话术卡由江晚出内容，**11/5 前印到门店** [[rt_05]]。注意对方“应该是行业内首个”没给出处 [[xm_18]]，物料里不要直接引用。' },
  { q: '车主培训和积分，我们和对方差多少？', a: '培训差一个数量级：对方 2025 年线下高阶驾驶安全培训 **484 场、10620 人** [[xm_17]]；我们今年 60 多场，**场地是瓶颈** [[ow_04]]。积分思路相近：对方新车主 90 天打卡得 4000 积分 [[xm_19]]；我们驾驶评分打开率只有 6% [[ow_01]]，决定和积分挂钩试点 [[ow_02]]，方案 11/10 前给韩总 [[ow_05]]。' },
  { q: '座椅夹手之前提过吗？', a: '提过。10/28 安全周会上魏然说电动座椅回位时**夹到了小孩的手**，开发阶段没有这个工况 [[sf_03]]，宋岚让他 **11/7 前**补进开发阶段安全检查清单 [[sf_04]]。小米直播里丁志也拿座椅调节夹手举例 [[xm_14]]，这条已经推给了魏然。' },
]

type Answer = { id: number; q: string; a: string }

export function Knowledge() {
  const route = useRoute()
  const confirmed = useStore(s => s.confirmed)
  const owners = useStore(s => s.owners)
  const [draft, setDraft] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [type, setType] = useState<ItemType | null>(null)
  const [project, setProject] = useState<ProjectId | null>(null)
  const [query, setQuery] = useState('')
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

  const items = useMemo(() => ALL_ITEMS.filter(it =>
    (!type || it.type === type) &&
    (!project || MEETINGS.find(m => m.id === it.meeting)!.project === project) &&
    (!query.trim() || `${it.title}${it.quote}${it.topic}${it.detail ?? ''}`.includes(query.trim())),
  ), [type, project, query])
  const groups = MEETINGS.map(m => ({ m, items: items.filter(i => i.meeting === m.id).sort((a, b) => itemTime(a) - itemTime(b)) })).filter(g => g.items.length)
  const topics = useMemo(() => {
    const c = new Map<string, number>()
    ALL_ITEMS.forEach(i => c.set(i.topic, (c.get(i.topic) ?? 0) + 1))
    return [...c.entries()].sort((a, b) => b[1] - a[1])
  }, [])
  const files = MEETINGS.flatMap(m => EXTRAS[m.id].files.map(f => ({ f, m })))
  const restricted = ALL_ITEMS.filter(i => i.sensitivity === 'restricted' && visibility(i, ME) === 'full')

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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
            <Library files={files} />
            <Evolve />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">账本</h2><span className="text-ink-3 text-[12.5px]">所有会议的条目，按权限显示</span></div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="text-ink-3 absolute top-1/2 left-2.5 -translate-y-1/2" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="筛选条目或原话" className="focus:border-ring h-8 w-56 rounded-lg border bg-white pr-2 pl-8 text-[13px] outline-none" />
                </div>
                <Chip on={!type} onClick={() => setType(null)}>全部类型</Chip>
                {(Object.keys(ITEM_TYPES) as ItemType[]).map(k => (
                  <Chip key={k} on={type === k} onClick={() => setType(t => (t === k ? null : k))}><i className="size-1.5 rounded-full" style={{ background: ITEM_TYPES[k].color }} />{ITEM_TYPES[k].label}</Chip>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip on={!project} onClick={() => setProject(null)}>全部项目</Chip>
                {PROJECTS.map(p => <Chip key={p.id} on={project === p.id} onClick={() => setProject(x => (x === p.id ? null : p.id))}><i className="size-1.5 rounded-full" style={{ background: p.color }} />{p.name}</Chip>)}
              </div>

              <div className="mt-4 flex flex-col gap-5">
                {!groups.length && <Empty icon="magnifyingGlass" title="没有匹配的条目" sub="换个关键词，或者清掉筛选。" />}
                {groups.map(({ m, items: list }) => (
                  <section key={m.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: projectById(m.project).color }} />
                      <a href={`#/m/${m.id}`} className="text-[14.5px] font-semibold hover:underline">{m.title}</a>
                      <span className="text-ink-3 text-[12.5px]">{projectById(m.project).name} · {cnDate(m.date)} · {personById(m.publisher).name} 发布</span>
                    </div>
                    <div className="sg-card overflow-hidden rounded-2xl">
                      {list.map(it => <KbRow key={it.id} it={it} ok={!!confirmed[it.id]} owner={owners[it.id] ?? it.owner} />)}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="sg-card rounded-2xl p-4">
                <div className="flex items-center gap-2"><Kb name="signpost" size={22} /><b className="text-[14px]">话题</b></div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topics.map(([tp, n]) => (
                    <button key={tp} onClick={() => setQuery(tp)} className="kb-tile rounded-full border px-2.5 py-0.5" style={{ fontSize: 11.5 + n * 0.8 }}>{tp} <span className="text-ink-4">{n}</span></button>
                  ))}
                </div>
              </div>
              <div className="sg-well rounded-2xl p-4 text-[12.5px] leading-relaxed">
                <div className="flex items-center gap-2"><Lock size={14} /><b className="text-[13.5px]">权限</b></div>
                <p className="text-ink-2 mt-1.5">知识库按你的权限显示：受限条目对名单外的人只显示脱敏版。你现在是 <b>{personById(ME).name}</b>，在 {restricted.length} 条受限条目的名单里{restricted.length ? `（${restricted.map(i => i.title.slice(0, 10)).join('、')}…）` : ''}。</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------- 资料：PDF、Word、Markdown、截图 ----------------

/** 截图：加载失败时给一个安静的占位，不露出裂图和文件名 */
function Shot({ src, name }: { src?: string; name: string }) {
  const [bad, setBad] = useState(!src)
  if (bad) return <span className="text-ink-4 grid size-full place-items-center"><ImageOff size={22} /></span>
  return <img src={src} alt={name} onError={() => setBad(true)} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
}

function Library({ files }: { files: { f: MeetingFile; m: (typeof MEETINGS)[number] }[] }) {
  const docs = files.filter(x => x.f.kind !== 'img')
  const imgs = files.filter(x => x.f.kind === 'img')
  return (
    <section className="glass-panel min-w-0 rounded-2xl border p-4">
      <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">资料</h2><span className="text-ink-3 text-[12.5px]">会议附件和会后整理的文档，入库后和账本一起检索</span></div>
      <div className="grid grid-cols-3 gap-2">
        {imgs.map(({ f }) => (
          <a key={f.name} href={f.url} target="_blank" rel="noreferrer" className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-[#F1F2F5]">
            <Shot src={f.url} name={f.name} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-6 pb-1.5 text-[11.5px] text-white">{f.name.replace(/^直播截图_/, '').replace(/\.jpg$/, '').replace('_', ' ')}</span>
          </a>
        ))}
      </div>
      <div className="mt-3 flex flex-col">
        {docs.map(({ f, m }) => (
          <a key={m.id + f.name} href={f.previewUrl ?? f.url} target="_blank" rel="noreferrer" className={cn('group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-black/[.03]', !f.url && 'pointer-events-none')}>
            <FileIcon kind={f.kind} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{f.name}</span>
              <span className="text-ink-3 block truncate text-[11.5px]">{m.title.replace(/ · .*/, '')} · {personById(f.owner).name} · {f.date} · {f.size}</span>
            </span>
            {f.url ? <ExternalLink size={13} className="text-ink-4 group-hover:text-ink flex-none" /> : <span className="text-ink-4 flex-none text-[11px]">仅索引</span>}
          </a>
        ))}
      </div>
    </section>
  )
}

// ---------------- 每日自进化（RSI）：新资料切块入库 + 回流改写档案和规则 ----------------

// 簇的颜色用在深色屏上，取亮一档
type Cluster = { name: string; x: number; y: number; color: string }
const CLUSTERS: Cluster[] = [
  { name: '安全组织 · 评审', x: 0.33, y: 0.3, color: '#8B93FF' },
  { name: '开发安全', x: 0.8, y: 0.28, color: '#2DD4BF' },
  { name: '车主运营', x: 0.36, y: 0.71, color: '#F472B6' },
  { name: '门店 · 竞品卖点', x: 0.8, y: 0.71, color: '#FBBF24' },
  { name: '安全理念 · 目标', x: 0.58, y: 0.5, color: '#38BDF8' },
]

interface Day {
  date: string
  label: string
  sources: { kind: 'meet' | 'doc' | 'fb'; text: string }[]
  /** 新增向量块按簇分布 */
  add: number[]
  chunks: number
  hit: number
  learned: string
}

const DAYS: Day[] = [
  { date: '10/27', label: '周一', sources: [{ kind: 'doc', text: '历史纪要回填 · 32 份' }], add: [4, 4, 3, 3, 2], chunks: 1180, hit: 84, learned: '冷启动：按部门和职级初始化 10 份关注档案' },
  { date: '10/28', label: '周二', sources: [{ kind: 'meet', text: '安全周会 · 9 段' }, { kind: 'doc', text: '安委会常设方案.docx' }, { kind: 'fb', text: '魏然、许诺确认待办' }], add: [5, 3, 0, 0, 1], chunks: 1226, hit: 86, learned: '编制和预算类条目默认“受限”' },
  { date: '10/29', label: '周三', sources: [{ kind: 'meet', text: '车主运营月会 · 7 段' }, { kind: 'doc', text: '评分 × 积分试点方案.docx' }, { kind: 'fb', text: '高远：交付依赖积分方案' }], add: [0, 0, 5, 1, 0], chunks: 1264, hit: 87, learned: '高远的档案新增依赖「车主积分体系」（R4）' },
  { date: '10/30', label: '周四', sources: [{ kind: 'meet', text: '门店销售周会 · 6 段' }, { kind: 'doc', text: '权益对比表 v3.xlsx' }, { kind: 'fb', text: '江晚订阅「竞品卖点」' }], add: [0, 0, 1, 5, 1], chunks: 1295, hit: 89, learned: '“权益”“表盘”归到「购车权益」话题' },
  { date: '10/31', label: '周五', sources: [{ kind: 'meet', text: '小米安全专场直播 · 92 段' }, { kind: 'doc', text: 'PDF 纪要 · 对标表 · 拆解 MD · 3 张截图' }, { kind: 'fb', text: '审核官标出 1 处绝对化表述' }], add: [6, 4, 3, 3, 4], chunks: 1459, hit: 92, learned: '外部直播模板：关掉点名规则，绝对化表述一律“待核实”' },
]

const SRC = {
  meet: { label: '会议', icon: Video, color: '#5F3E54' },
  doc: { label: '资料', icon: FileText, color: '#64748B' },
  fb: { label: '回流', icon: Repeat2, color: '#059669' },
} as const

const LOOP = ['分发', '回流', '评测打分', '改写档案', '下一场更准']
const FEEDBACK_TOTAL = [0, 3, 5, 8, 13]

function Evolve() {
  const [day, setDay] = useState(0)
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setDay(d => (d + 1) % DAYS.length), 4200)
    return () => clearInterval(id)
  }, [auto])
  const d = DAYS[day]
  const prev = day ? DAYS[day - 1] : null

  return (
    <section className="glass-panel glass-evolve flex min-w-0 flex-col rounded-[22px] border p-4">
      <div className="flex items-center gap-2.5">
        <span className="sg-raised grid size-9 flex-none place-items-center rounded-xl text-[var(--plum)]"><Kb name="brain" size={22} /></span>
        <div className="min-w-0 leading-tight">
          <h2 className="text-[16px] font-semibold">每天自进化</h2>
          <p className="text-ink-3 truncate text-[12.5px]">新会议和资料入库，确认、退回、追问反过来改写档案和规则</p>
        </div>
        <button className="sg-raised sg-icon-btn ml-auto size-8 flex-none" onClick={() => setAuto(a => !a)} aria-label={auto ? '暂停' : '播放'}>{auto ? <Pause size={14} /> : <Play size={14} />}</button>
      </div>

      <div className="sg-well mt-3.5 grid grid-cols-5 gap-1 rounded-2xl p-1">
        {DAYS.map((x, i) => (
          <button key={x.date} onClick={() => { setDay(i); setAuto(false) }} className={cn('relative overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition-colors', i === day ? 'text-white' : 'hover:bg-white/60', i > day && 'text-ink-4')}>
            {i === day && <motion.span layoutId="evolve-day" className="sg-onyx absolute inset-0 rounded-xl" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <b className="relative block font-mono text-[12.5px] leading-tight">{x.date}</b>
            <span className={cn('relative text-[11px]', i === day ? 'text-white/60' : 'text-ink-3')}>{x.label}</span>
            {i === day && auto && <motion.i key={day} className="absolute inset-x-2.5 bottom-1 h-[2px] origin-left rounded-full bg-[#E9B8DA]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 4.2, ease: 'linear' }} />}
          </button>
        ))}
      </div>

      <div className="mt-3.5">
        <div className="text-ink-3 mb-2 flex items-center gap-2 text-[12px]">{d.date} 喂进来的<span className="h-px flex-1 bg-[rgb(95_62_84/10%)]" /></div>
        <div className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {d.sources.map((s, i) => {
              const k = SRC[s.kind]
              return (
                <motion.div key={d.date + i} layout className="flex items-center gap-2.5 text-[13px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.08 }}>
                  <span className="sg-raised grid size-6 flex-none place-items-center rounded-lg" style={{ color: k.color }}><k.icon size={12} strokeWidth={2.2} /></span>
                  <span className="min-w-0 flex-1 truncate">{s.text}</span>
                  <span className="text-ink-4 flex-none font-mono text-[10.5px]">{k.label}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <VectorField day={day} />

      <div className="glass-metrics mt-3.5 grid grid-cols-3 gap-2">
        <Metric label="向量块" value={d.chunks.toLocaleString()} delta={prev ? `+${d.chunks - prev.chunks}` : ''} />
        <Metric label="路由命中率" value={`${d.hit}%`} delta={prev ? `+${d.hit - prev.hit}` : ''} bar={d.hit} />
        <Metric label="本周回流" value={`${FEEDBACK_TOTAL[day]} 条`} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={d.date} className="sg-card mt-3 flex items-start gap-2.5 rounded-2xl px-3 py-2.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <span className="sg-onyx mt-px inline-flex flex-none items-center gap-1 rounded-full px-2 text-[11px] leading-[20px]"><Kb name="lightbulb" size={11} />学到</span>
          <span className="text-[13.5px] leading-snug">{d.learned}</span>
        </motion.div>
      </AnimatePresence>

      <ol className="sg-well mt-3 flex flex-wrap items-center gap-0.5 self-start rounded-full p-1 text-[11.5px]">
        {LOOP.map((s, i) => (
          <li key={s} className="flex items-center gap-0.5">
            <span className={cn('rounded-full px-2 py-0.5', i === LOOP.length - 1 ? 'sg-onyx font-medium' : 'text-ink-2')}>{s}</span>
            {i < LOOP.length - 1 && <span className="text-ink-4">›</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------- 向量空间：深色点阵屏 ----------------
// 每个块落在一格上：从簇中心往外按距离（加一点抖动）排队，先入库的占中间。
// 当天的新块从左边的入口列飞进来，落位时闪一下，周围的格子跟着染上簇的颜色。

const COLS = 64, ROWS = 24
const FIELD = (() => {
  const order = CLUSTERS.map((c, ci) => {
    const cx = c.x * COLS, cy = c.y * ROWS
    const list: { x: number; y: number; k: number }[] = []
    for (let y = 0; y < ROWS; y++) for (let x = 4; x < COLS; x++) {
      const dd = Math.hypot(x - cx, y - cy)
      if (dd < 6) list.push({ x, y, k: dd + hash(ci * 1000 + y * COLS + x) * 2.2 })
    }
    return list.sort((a, b) => a.k - b.k)
  })
  const taken = new Set<number>()
  const next = CLUSTERS.map(() => 0)
  let i = 0
  return DAYS.flatMap((dd, di) => dd.add.flatMap((n, ci) => Array.from({ length: n }, () => {
    let cell = order[ci][next[ci]++]
    while (taken.has(cell.y * COLS + cell.x)) cell = order[ci][next[ci]++]
    taken.add(cell.y * COLS + cell.x)
    return { i: i++, day: di, ci, x: cell.x, y: cell.y }
  })))
})()
const KERNEL = Array.from({ length: 21 }, (_, d2) => Math.exp(-d2 / 4.5))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const FLY = 1.05

function VectorField({ day }: { day: number }) {
  const fresh = FIELD.filter(p => p.day === day).length
  const ref = useDotCanvas((ctx, t, w, h) => {
    const p = Math.min(w / COLS, h / ROWS), s = p * 0.68
    const ox = (w - p * COLS) / 2, oy = (h - p * ROWS) / 2
    const at = (x: number, y: number, size = s) => square(ctx, ox + x * p + (p - size) / 2, oy + y * p + (p - size) / 2, size)

    // 底：每一格一个很淡的方点
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.05
    ctx.beginPath()
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) at(x, y)
    ctx.fill()

    // 入场：一道竖光从左扫到右
    if (t < 1.5) {
      const bx = (t / 1.5) * (COLS + 8) - 4
      for (let x = Math.max(0, Math.floor(bx - 2)); x <= Math.min(COLS - 1, Math.ceil(bx + 2)); x++) {
        ctx.globalAlpha = 0.14 * clamp01(1 - Math.abs(x - bx) / 2)
        ctx.beginPath()
        for (let y = 0; y < ROWS; y++) at(x, y)
        ctx.fill()
      }
    }

    const pts = FIELD.filter(q => q.day <= day).map(q => {
      if (q.day < day) return { q, k: 1, since: 99 }
      const delay = 0.35 + hash(q.i + 0.1) * 1.1
      return { q, k: clamp01((t - delay) / FLY), since: t - delay - FLY }
    })

    // 入口列：还有块在飞时，一道光往下流
    const busy = pts.some(x => x.k < 1)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < 2; x++) {
      ctx.globalAlpha = busy ? 0.08 + 0.55 * Math.max(0, Math.sin(t * 7 - y * 0.55 - x)) ** 6 : 0.08
      ctx.beginPath()
      at(x, y)
      ctx.fill()
    }

    // 簇的晕：落位的块把周围的格子染上颜色
    const halo = CLUSTERS.map(() => new Float32Array(COLS * ROWS))
    for (const { q, k, since } of pts) {
      if (k < 1) continue
      const wgt = easeOut(clamp01(since / 0.6))
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d2 = dx * dx + dy * dy, x = q.x + dx, y = q.y + dy
        if (d2 > 20 || x < 0 || y < 0 || x >= COLS || y >= ROWS) continue
        halo[q.ci][y * COLS + x] += KERNEL[d2] * wgt
      }
    }
    for (let idx = 0; idx < COLS * ROWS; idx++) {
      let best = 0, bc = -1
      for (let ci = 0; ci < CLUSTERS.length; ci++) if (halo[ci][idx] > best) { best = halo[ci][idx]; bc = ci }
      if (best < 0.06) continue
      ctx.globalAlpha = Math.min(0.34, best * 0.14)
      ctx.fillStyle = CLUSTERS[bc].color
      ctx.beginPath()
      at(idx % COLS, Math.floor(idx / COLS))
      ctx.fill()
    }

    // 块本身：已落位的亮着轻轻呼吸；刚落位的闪白；在飞的拖一条尾巴
    for (const { q, k, since } of pts) {
      const c = CLUSTERS[q.ci].color
      if (k >= 1) {
        const flash = clamp01(1 - since / 0.7)
        ctx.fillStyle = c
        if (flash > 0) {
          ctx.globalAlpha = 0.3 * flash
          ctx.beginPath(); at(q.x, q.y, s * 2.6); ctx.fill()
        }
        ctx.globalAlpha = 0.82 + 0.18 * Math.sin(t * 2.2 + q.i)
        ctx.beginPath(); at(q.x, q.y); ctx.fill()
        if (flash > 0) {
          ctx.fillStyle = '#fff'
          ctx.globalAlpha = 0.85 * flash
          ctx.beginPath(); at(q.x, q.y); ctx.fill()
        }
        continue
      }
      if (k <= 0) continue
      const sx = 0.5, sy = ROWS * (0.2 + hash(q.i + 0.3) * 0.6), bend = (hash(q.i + 0.7) - 0.5) * 7
      const pos = (kk: number) => { const e = easeOut(kk); return [sx + (q.x - sx) * e, sy + (q.y - sy) * e + Math.sin(e * Math.PI) * bend] }
      ctx.fillStyle = c
      for (let j = 5; j >= 1; j--) {
        const [x, y] = pos(Math.max(0, k - j * 0.035))
        ctx.globalAlpha = (1 - j / 6) * 0.5
        ctx.beginPath(); at(x, y, s * (1 - j * 0.1)); ctx.fill()
      }
      const [x, y] = pos(k)
      ctx.fillStyle = '#fff'
      ctx.globalAlpha = 0.95
      ctx.beginPath(); at(x, y); ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [day])

  return (
    <div className="vx-screen sg-dark mt-3.5 p-2.5">
      <div className="relative" style={{ aspectRatio: `${COLS} / ${ROWS}` }}>
        <canvas ref={ref} className="absolute inset-0 size-full" aria-label={`知识库向量空间，${CLUSTERS.length} 个话题簇`} role="img" />
        {CLUSTERS.map(c => (
          <span key={c.name} className="vx-label" style={{ left: `${c.x * 100}%`, top: `${((c.y * ROWS + 4.2) / ROWS) * 100}%`, '--c': c.color } as CSSProperties}><i />{c.name}</span>
        ))}
      </div>
      <span className="absolute top-2.5 left-3 flex items-center gap-2 rounded-md bg-black/45 px-2 py-1 font-mono text-[10.5px] text-white/60 backdrop-blur-sm">
        <DotLoader cols={3} rows={2} dot={2} gap={1} className="text-white/70" />
        向量空间{fresh ? ` · 今天 +${fresh} 块` : ''}
      </span>
    </div>
  )
}

function Metric({ label, value, delta, bar }: { label: string; value: string; delta?: string; bar?: number }) {
  return (
    <div className="rounded-xl bg-[#F7F8FB] px-3 py-2">
      <div className="text-ink-3 text-[11.5px]">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <motion.b key={value} className="text-[20px] font-semibold tabular-nums" initial={{ y: -6, opacity: 0.3 }} animate={{ y: 0, opacity: 1 }}>{value}</motion.b>
        {delta && <span className="text-[11.5px] text-emerald-600">{delta}</span>}
      </div>
      {bar != null && <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/[.07]"><motion.div className="h-full rounded-full bg-[#4F46E5]" animate={{ width: `${bar}%` }} transition={{ duration: 0.8 }} /></div>}
    </div>
  )
}

// ---------------- 账本行 / 回答 ----------------

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] transition-colors', on ? 'sg-onyx border-transparent' : 'text-ink-2 border-white bg-white/70 hover:bg-white')}>{children}</button>
}

function KbRow({ it, ok, owner }: { it: Item; ok: boolean; owner: Item['owner'] }) {
  const vis = visibility(it, ME)
  return (
    <div className="flex items-center gap-3 border-b border-[rgb(95_62_84/7%)] px-4 py-3 last:border-0 hover:bg-white/70">
      <TypePill item={it} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">{vis === 'redacted' ? it.redacted : it.title}{it.sensitivity === 'restricted' && <Lock size={12} className="text-rose-600" />}{it.flags?.map(f => <span key={f} className="rounded bg-amber-50 px-1 text-[11px] font-normal text-amber-700">{f}</span>)}</div>
        <SourceChip item={it} className="-ml-0.5 mt-1" />
      </div>
      <div className="text-ink-2 flex flex-none items-center gap-3 text-[12.5px]">
        {owner && <span className="inline-flex items-center gap-1"><Face p={owner} size={18} />{personById(owner).name}</span>}
        {it.due && <span className="tabular-nums">{it.due}</span>}
        {it.type === 'action' && <span className={ok ? 'text-emerald-600' : 'text-ink-3'}>{ok ? '✓ 已确认' : '待确认'}</span>}
      </div>
    </div>
  )
}

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
