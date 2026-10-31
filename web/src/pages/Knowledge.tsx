// 会议知识库：所有会议的账本、逐字稿和资料（PDF / Word / Markdown / 截图）汇在一起，可以问、可以筛；
// 每个回答和条目都能回到原话那一秒。右边的动画是知识库每天的自进化：新会议和资料切块入库，回流的确认、退回改写关注档案和路由规则。
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { ArrowUp } from 'lucide'
import { ExternalLink, FileText, ImageOff, Lock, Pause, Play, Repeat2, Search, Sparkles, Video } from 'lucide-react'
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

  const ask = (q: string) => {
    const hit = QA.find(x => x.q === q) ?? QA.find(x => q.includes(x.q.slice(0, 4)))
    setAnswers(a => [{ id: Date.now(), q, a: hit?.a ?? '知识库里还找不到能回答这个问题的原话。可以试试下面这些问题。' }, ...a].slice(0, 3))
    setDraft('')
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
      <TopBar crumbs={[{ label: '会议知识库' }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-6">
          <div className="glass-inquiry rounded-3xl border px-6 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <span className="text-primary"><Kb name="brain" size={40} /></span>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight">问问所有会议</h1>
                <p className="text-ink-3 text-[13px]">{MEETINGS.length} 场会 · {ALL_ITEMS.length} 条账本 · {files.length} 份资料 · 每个回答都附原话，点一下回到录像那一秒</p>
              </div>
            </div>
            <form className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,.08),0_6px_20px_-8px_rgba(0,0,0,.12)]" onSubmit={e => { e.preventDefault(); if (draft.trim()) ask(draft.trim()) }}>
              <Sparkles size={17} className="text-primary ml-2" />
              <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="例如：竞品的一票否决和我们差在哪？" className="placeholder:text-ink-3 h-9 flex-1 bg-transparent text-[15px] outline-none" />
              <button className={cn('grid size-9 place-items-center rounded-full text-white', draft.trim() ? 'bg-ink' : 'bg-[#D7D7D7]')} aria-label="提问"><MorphIcon icon={ArrowUp} size={17} strokeWidth={2.4} /></button>
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
                    <div className="overflow-hidden rounded-2xl border bg-white">
                      {list.map(it => <KbRow key={it.id} it={it} ok={!!confirmed[it.id]} owner={owners[it.id] ?? it.owner} />)}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-center gap-2"><Kb name="signpost" size={22} /><b className="text-[14px]">话题</b></div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topics.map(([tp, n]) => (
                    <button key={tp} onClick={() => setQuery(tp)} className="kb-tile rounded-full border px-2.5 py-0.5" style={{ fontSize: 11.5 + n * 0.8 }}>{tp} <span className="text-ink-4">{n}</span></button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border bg-[#FAFAF8] p-4 text-[12.5px] leading-relaxed">
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

type Cluster = { name: string; x: number; y: number; color: string }
const CLUSTERS: Cluster[] = [
  { name: '安全组织 · 评审', x: 0.44, y: 0.27, color: '#4F46E5' },
  { name: '开发安全', x: 0.83, y: 0.25, color: '#0D9488' },
  { name: '车主运营', x: 0.45, y: 0.73, color: '#DB2777' },
  { name: '门店 · 竞品卖点', x: 0.84, y: 0.71, color: '#D97706' },
  { name: '安全理念 · 目标', x: 0.64, y: 0.49, color: '#0891B2' },
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

/** 稳定的伪随机，保证每次渲染点的位置一样 */
const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x) }

const W = 520, H = 190

const SRC = {
  meet: { label: '会议', icon: Video, cls: 'bg-blue-50 text-blue-700' },
  doc: { label: '资料', icon: FileText, cls: 'bg-slate-100 text-slate-600' },
  fb: { label: '回流', icon: Repeat2, cls: 'bg-emerald-50 text-emerald-700' },
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
  // 所有点：到今天为止累计
  const dots = useMemo(() => DAYS.flatMap((dd, di) => dd.add.flatMap((n, ci) => Array.from({ length: n }, (_, k) => {
    const c = CLUSTERS[ci]
    const a = rnd(di * 100 + ci * 10 + k) * Math.PI * 2
    const r = 0.03 + rnd(di * 77 + ci * 13 + k * 3) * 0.07
    return { id: `${di}-${ci}-${k}`, day: di, color: c.color, x: (c.x + Math.cos(a) * r * 1.15) * W, y: (c.y + Math.sin(a) * r * 1.7) * H }
  }))), [])
  const fresh = dots.filter(p => p.day === day).length

  return (
    <section className="glass-panel glass-evolve flex min-w-0 flex-col rounded-2xl border p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 flex-none place-items-center rounded-xl bg-[#EEF0FF] text-[#4F46E5]"><Kb name="brain" size={22} /></span>
        <div className="min-w-0 leading-tight">
          <h2 className="text-[16px] font-semibold">每天自进化</h2>
          <p className="text-ink-3 truncate text-[12.5px]">新会议和资料入库，确认、退回、追问反过来改写档案和规则</p>
        </div>
        <button className="text-ink-2 ml-auto grid size-8 flex-none place-items-center rounded-lg border hover:bg-black/[.03]" onClick={() => setAuto(a => !a)} aria-label={auto ? '暂停' : '播放'}>{auto ? <Pause size={14} /> : <Play size={14} />}</button>
      </div>

      <div className="mt-3.5 grid grid-cols-5 gap-1.5">
        {DAYS.map((x, i) => (
          <button key={x.date} onClick={() => { setDay(i); setAuto(false) }} className={cn('relative overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-colors', i === day ? 'border-ink bg-ink text-white' : i < day ? 'text-ink-2 bg-white hover:bg-black/[.03]' : 'text-ink-4 border-dashed bg-white hover:bg-black/[.03]')}>
            <b className="block font-mono text-[12.5px] leading-tight">{x.date}</b>
            <span className={cn('text-[11px]', i === day ? 'text-white/65' : 'text-ink-3')}>{x.label}</span>
            {i === day && auto && <motion.i key={day} className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[#8FB0FF]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 4.2, ease: 'linear' }} />}
          </button>
        ))}
      </div>

      <div className="mt-3.5">
        <div className="text-ink-3 mb-1.5 text-[12px]">{d.date} 喂进来的</div>
        <div className="flex flex-col gap-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {d.sources.map((s, i) => {
              const k = SRC[s.kind]
              return (
                <motion.div key={d.date + i} layout className="flex items-center gap-2 text-[13px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.08 }}>
                  <span className={cn('inline-flex h-5 flex-none items-center gap-1 rounded-md px-1.5 text-[11px]', k.cls)}><k.icon size={11} />{k.label}</span>
                  <span className="min-w-0 flex-1 truncate">{s.text}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative mt-3.5 overflow-hidden rounded-xl border bg-[#F7F8FB]" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`}>
          {CLUSTERS.map(c => <circle key={c.name} cx={c.x * W} cy={c.y * H} r={46} fill={c.color} opacity={0.1} />)}
          {dots.map(p => {
            if (p.day > day) return null
            const isNew = p.day === day
            return (
              <motion.circle
                key={p.id}
                r={isNew ? 3.8 : 2.8}
                fill={p.color}
                initial={isNew ? { cx: 16, cy: 14, opacity: 0 } : false}
                animate={{ cx: p.x, cy: p.y, opacity: isNew ? 1 : 0.45 }}
                transition={{ duration: 1.1, delay: isNew ? 0.2 + rnd(p.y) * 0.9 : 0, ease: [0.2, 0.7, 0.2, 1] }}
                style={isNew ? { filter: `drop-shadow(0 0 3px ${p.color})` } : undefined}
              />
            )
          })}
        </svg>
        {CLUSTERS.map(c => <span key={c.name} className="text-ink-3 pointer-events-none absolute -translate-x-1/2 text-[11px] font-medium whitespace-nowrap" style={{ left: `${c.x * 100}%`, top: `calc(${c.y * 100}% + 30px)` }}>{c.name}</span>)}
        <span className="text-ink-3 absolute top-2 left-3 text-[11px]">知识库向量空间{fresh ? ` · 今天新增 ${fresh} 块` : ''}</span>
      </div>

      <div className="glass-metrics mt-3.5 grid grid-cols-3 gap-2">
        <Metric label="向量块" value={d.chunks.toLocaleString()} delta={prev ? `+${d.chunks - prev.chunks}` : ''} />
        <Metric label="路由命中率" value={`${d.hit}%`} delta={prev ? `+${d.hit - prev.hit}` : ''} bar={d.hit} />
        <Metric label="本周回流" value={`${FEEDBACK_TOTAL[day]} 条`} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={d.date} className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <span className="mt-0.5 flex-none rounded-md bg-emerald-600 px-1.5 text-[11px] leading-[18px] text-white">学到</span>
          <span className="text-[13.5px] leading-snug text-emerald-950">{d.learned}</span>
        </motion.div>
      </AnimatePresence>

      <ol className="text-ink-3 mt-3 flex items-center gap-1 text-[11.5px]">
        {LOOP.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span className={cn('rounded-md px-1.5 py-0.5', i === LOOP.length - 1 ? 'bg-ink font-medium text-white' : 'bg-black/[.04]')}>{s}</span>
            {i < LOOP.length - 1 && <span className="text-ink-4">›</span>}
          </li>
        ))}
      </ol>
    </section>
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
  return <button onClick={onClick} className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] transition-colors', on ? 'border-ink bg-ink text-white' : 'text-ink-2 bg-white hover:bg-black/[.03]')}>{children}</button>
}

function KbRow({ it, ok, owner }: { it: Item; ok: boolean; owner: Item['owner'] }) {
  const vis = visibility(it, ME)
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-black/[.015]">
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
    <motion.div layout className={cn('mt-4 rounded-2xl border bg-white p-4 transition-opacity', dim && 'opacity-60 hover:opacity-100')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="text-ink-3 text-[12.5px]">问：{a.q}</div>
      <div className="mt-1.5 text-[15px] leading-[1.8]">
        {!ready ? <span className="shimmer-text">正在翻 {MEETINGS.length} 场会的账本、录像和资料</span> : <>{rich(a.a, n, () => true)}{n < len && <span className="cursor-dot" />}</>}
      </div>
    </motion.div>
  )
}
