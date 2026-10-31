// 会议知识库：所有会议的账本汇在一起，可以问、可以筛；每个回答和条目都能回到原话那一秒。
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { ArrowUp } from 'lucide'
import { Lock, Search, Sparkles } from 'lucide-react'
import { ITEM_TYPES, ME, PROJECTS, personById, projectById, type ItemType, type ProjectId } from '@/data/model'
import { ALL_ITEMS, MEETINGS, type Item } from '@/data/meetings'
import { itemTime, visibility } from '@/data/derive'
import { useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Empty, Face, Kb, SourceChip, TypePill } from '@/components/common/bits'
import { rich, richLen, useStream } from '@/components/common/stream'

const QA: { q: string; a: string }[] = [
  { q: '双 11 上线时间最后定在哪天？', a: '**11 月 8 日**。原定 11/11，评审会上定了提前 3 天、留三天预热 [[it_03]]。跟着变的截止：孙悦 11/6 前改完物料 [[it_02]]，李琳 11/7 前更新客服 FAQ [[it_08]]。' },
  { q: '压测风险之前提过吗？', a: '提过，而且这次和之前的决定有冲突。618 复盘时峰值下单失败率到了 2.1% [[s618_02]]，当时定下**双 11 至少提前一周压测** [[s618_03]]。但这次评审陈默说周四前压测可能做不完 [[it_09]]，最后定在周四（11/5）完成 [[it_10]]，离 11/8 上线只有 3 天。' },
  { q: '赵一最近有哪些事？', a: '3 件：客户端适配拆分后的订单接口，会上没定负责人，建议是他 [[it_05]]；评估小程序分包方案，还缺截止时间 [[app_03]]；会员小程序 2.0 推迟到 12 月，他的排期跟着变 [[q4_03]]。' },
  { q: '和预算有关的决定有哪些？', a: '2 条，都是受限信息，你在名单里可以看原文：双 11 扩容走 A 方案，预算约 30 万，待财务签批 [[it_07]]；Q4 IT 预算还剩 80 万，周宁下周复核扩容的口子 [[q4_06]]。Q4 对齐会上陈默也提过预算可能不够 [[q4_05]]。' },
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
    setAnswers(a => [{ id: Date.now(), q, a: hit?.a ?? '演示版只预置了几个问题，可以试试下面这些。' }, ...a].slice(0, 3))
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
  const openRisks = ALL_ITEMS.filter(i => i.type === 'risk').length
  const noOwner = ALL_ITEMS.filter(i => i.flags?.includes('缺负责人') && !owners[i.id]).length
  const questions = ALL_ITEMS.filter(i => i.type === 'question').length

  return (
    <>
      <TopBar crumbs={[{ label: '会议知识库' }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-6 py-6">
          <div className="rounded-3xl border bg-gradient-to-b from-[#F4F7FF] to-white px-6 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <span className="text-primary"><Kb name="brain" size={40} /></span>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight">问问所有会议</h1>
                <p className="text-ink-3 text-[13px]">{MEETINGS.length} 场会 · {ALL_ITEMS.length} 条账本 · 每个回答都附原话，点一下回到录像那一秒</p>
              </div>
            </div>
            <form className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,.08),0_6px_20px_-8px_rgba(0,0,0,.12)]" onSubmit={e => { e.preventDefault(); if (draft.trim()) ask(draft.trim()) }}>
              <Sparkles size={17} className="text-primary ml-2" />
              <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="例如：压测风险之前提过吗？" className="placeholder:text-ink-3 h-9 flex-1 bg-transparent text-[15px] outline-none" />
              <button className={cn('grid size-9 place-items-center rounded-full text-white', draft.trim() ? 'bg-ink' : 'bg-[#D7D7D7]')} aria-label="提问"><MorphIcon icon={ArrowUp} size={17} strokeWidth={2.4} /></button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {QA.map(x => <button key={x.q} onClick={() => ask(x.q)} className="kb-tile text-ink-2 rounded-full border bg-white px-3 py-1 text-[13px]">{x.q}</button>)}
            </div>
            <AnimatePresence initial={false}>
              {answers.map((a, i) => <AnswerCard key={a.id} a={a} dim={i > 0} />)}
            </AnimatePresence>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
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
                      <span className="text-ink-3 text-[12.5px]">{projectById(m.project).name} · {cnDate(m.date)} · 主持 {personById(m.host).name}</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border bg-white">
                      {list.map(it => <KbRow key={it.id} it={it} ok={!!confirmed[it.id]} owner={owners[it.id] ?? it.owner} />)}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2">
                {[{ v: openRisks, l: '风险', c: 'text-rose-600' }, { v: noOwner, l: '缺负责人', c: 'text-amber-600' }, { v: questions, l: '待决问题', c: 'text-cyan-700' }].map(s => (
                  <div key={s.l} className="kb-tile rounded-2xl border bg-white px-3 py-2.5 text-center">
                    <div className={cn('text-[22px] font-semibold', s.c)}>{s.v}</div>
                    <div className="text-ink-3 text-[12px]">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-center gap-2"><Kb name="signpost" size={22} /><b className="text-[14px]">话题</b></div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topics.map(([tp, n]) => (
                    <button key={tp} onClick={() => setQuery(tp)} className="kb-tile rounded-full border px-2.5 py-0.5 text-[12.5px]" style={{ fontSize: 11.5 + n * 0.8 }}>{tp} <span className="text-ink-4">{n}</span></button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border bg-[#FAFAF8] p-4 text-[12.5px] leading-relaxed">
                <div className="flex items-center gap-2"><Lock size={14} /><b className="text-[13.5px]">权限</b></div>
                <p className="text-ink-2 mt-1.5">知识库按你的权限显示：受限条目对名单外的人只显示脱敏版。你现在是 <b>{personById(ME).name}</b>，在两条预算条目的名单里。</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] transition-colors', on ? 'border-ink bg-ink text-white' : 'text-ink-2 bg-white hover:bg-black/[.03]')}>{children}</button>
}

function KbRow({ it, ok, owner }: { it: Item; ok: boolean; owner: Item['owner'] }) {
  const vis = visibility(it, ME)
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-black/[.015]">
      <TypePill item={it} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">{vis === 'redacted' ? it.redacted : it.title}{it.sensitivity === 'restricted' && <Lock size={12} className="text-rose-600" />}</div>
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
        {!ready ? <span className="shimmer-text">正在翻 {MEETINGS.length} 场会的账本和录像</span> : <>{rich(a.a, n, () => true)}{n < len && <span className="cursor-dot" />}</>}
      </div>
    </motion.div>
  )
}
