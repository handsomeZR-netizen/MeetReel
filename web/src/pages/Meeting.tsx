// 会议详情 · 溯源：录像、逐字稿、账本三者互相定位。
// 入口 #/m/xm_safety?t=262&item=xm_06 —— 任何地方点“原话”都会落到这里的那一秒。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Clock3, Download, Link2, Lock, Play, Sparkles, Waypoints } from 'lucide-react'
import { ITEM_TYPES, personById, projectById, term, type PersonId } from '@/data/model'
import { meetingById, type Item, type Meeting } from '@/data/meetings'
import { chapterAt, isQuiet, itemTime, mmss, quoteSpan, recipientsOf } from '@/data/derive'
import { RUN_ID, RUN_PEOPLE, T_END } from '@/data/run'
import { go, href, useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import { useClock } from '@/lib/useClock'
import { cn, cnDate, weekday } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TopBar } from '@/components/shell/TopBar'
import { Empty, Face, FaceStack, Kb, RankTag, TypePill } from '@/components/common/bits'
import { MeetingVideo } from '@/components/player/MeetingVideo'
import { PlayerControls, Scrubber } from '@/components/player/Scrubber'
import { Transcript } from '@/components/player/Transcript'
import { Matrix } from '@/components/sketch/Matrix'
import { BriefPaper, StickyNotes } from '@/components/sketch/Briefs'
import { AgentTimeline } from '@/components/dispatch/AgentTimeline'
import { PersonBrief } from '@/components/meeting/PersonBrief'
import { L } from '@/lib/i18n'

type Tab = 'replay' | 'people' | 'ledger' | 'dist' | 'run'

export function MeetingPage({ id }: { id: string }) {
  const m = meetingById(id)
  if (!m) return <Empty icon="magnifyingGlass" title={L('找不到这场会议', 'Meeting not found')} sub={L('它可能已被删除，或者链接不完整。', 'It may have been deleted, or the link is incomplete.')} />
  return <MeetingView key={m.id} m={m} />
}

function MeetingView({ m }: { m: Meeting }) {
  const route = useRoute()
  const clock = useClock(m.duration)
  const [tab, setTab] = useState<Tab>('replay')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [pulse, setPulse] = useState(0)
  const [captions, setCaptions] = useState(true)
  const [side, setSide] = useState<'tx' | 'items'>('tx')
  const [paper, setPaper] = useState<PersonId | null>(null)
  const [member, setMember] = useState<PersonId>(m.related.find(p => p !== m.publisher && !isQuiet(m.id, p)) ?? m.related[0])
  const [copied, setCopied] = useState(false)
  const [compact, setCompact] = useState(false)
  const userScrollUntil = useRef(0)
  const resizingUntil = useRef(0)
  const compactRef = useRef(false)
  const setHeaderCompact = (next: boolean) => {
    if (compactRef.current === next) return
    compactRef.current = next
    resizingUntil.current = performance.now() + 450
    setCompact(next)
  }
  useEffect(() => { setHeaderCompact(false) }, [tab])
  const dispatched = useStore(s => s.dispatched[m.id])
  const confirmed = useStore(s => s.confirmed)
  const project = projectById(m.project)
  const focus = focusId ? m.items.find(i => i.id === focusId) ?? null : null

  // 深链：?t=17&item=it_04 → 定位并播放
  useEffect(() => {
    const t = route.query.get('t')
    const item = route.query.get('item')
    const tb = route.query.get('tab') as Tab | null
    if (tb) setTab(tb)
    const who = route.query.get('p') as PersonId | null
    if (who && m.related.includes(who)) setMember(who)
    if (t != null) {
      setTab('replay')
      clock.seek(Number(t))
      clock.play()
      if (item) {
        setFocusId(item)
        setPulse(p => p + 1)
      }
    }
  }, [route.raw]) // eslint-disable-line react-hooks/exhaustive-deps

  const locate = useCallback((it: Item) => {
    setTab('replay')
    setFocusId(it.id)
    setPulse(p => p + 1)
    clock.seek(Math.max(0, itemTime(it) - 0.4))
    clock.play()
  }, [clock])

  const seek = useCallback((t: number) => clock.seek(t), [clock])

  // 空格播放 / 暂停，← → 跳 5 秒
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab !== 'replay' || (e.target as HTMLElement).closest('input, textarea, [role=dialog]')) return
      if (e.key === ' ') { e.preventDefault(); clock.toggle() }
      if (e.key === 'ArrowLeft') clock.seek(clock.t - 5)
      if (e.key === 'ArrowRight') clock.seek(clock.t + 5)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, clock])

  const actionsN = m.items.filter(i => i.type === 'action')
  const okN = actionsN.filter(i => confirmed[i.id]).length
  const peopleN = new Set(m.routes.map(r => r.person)).size

  const exportMd = () => {
    const lines = [`# ${m.title}`, '', L(`${m.date} ${m.time} · 主持 ${personById(m.host).name} · 发布 ${personById(m.publisher).name}`, `${m.date} ${m.time} · host ${personById(m.host).name} · published by ${personById(m.publisher).name}`), '', `> ${m.summary}`, '', L('## 账本', '## Ledger'), '']
    for (const it of [...m.items].sort((a, b) => itemTime(a) - itemTime(b))) {
      const s = quoteSpan(it)
      lines.push(`- [${ITEM_TYPES[it.type].label}] ${it.title}${it.owner ? ` · ${personById(it.owner).name}` : ''}${it.due ? ` · ${it.due}` : ''}`)
      lines.push(L(`  - 原话：“${it.quote}” —— ${personById(s.seg.speaker).name} ${mmss(s.t0)}`, `  - Quote: “${it.quote}” — ${personById(s.seg.speaker).name} ${mmss(s.t0)}`))
    }
    lines.push('', L('## 逐字稿', '## Transcript'), '')
    for (const s of m.segments) lines.push(`**${personById(s.speaker).name}** \`${mmss(s.start)}\` ${s.text}`, '')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' }))
    a.download = `${m.title}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const TABS: { id: Tab; label: string; n?: number; hide?: boolean }[] = [
    { id: 'replay', label: L('回放与溯源', 'Replay & sources') },
    { id: 'ledger', label: L('会议账本', 'Ledger'), n: m.items.length },
    { id: 'people', label: L('收到者简报', 'Recipient briefs'), n: m.related.length },
    { id: 'dist', label: L('分发结果', 'Dispatch results'), n: dispatched ? peopleN : undefined },
    { id: 'run', label: L('编排记录', 'Run log'), hide: m.id !== RUN_ID || !dispatched },
  ]

  return (
    <>
      <TopBar compact crumbs={compact ? [{ label: m.title }] : [{ label: L('我的会议', 'My meetings'), to: '/?v=meet' }, { label: project.name, to: `/?v=meet&project=${project.id}` }]}>
        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1400) }}>
          <Link2 /> <span className="max-sm:hidden">{copied ? L('已复制链接', 'Link copied') : L('分享', 'Share')}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={exportMd}><Download /> <span className="max-sm:hidden">{L('导出纪要', 'Export notes')}</span></Button>
        {dispatched ? (
          <Button variant="outline" size="sm" onClick={() => setTab('dist')}><CheckCircle2 className="text-emerald-600" /> {L('已分发 · 看结果', 'Sent · results')}</Button>
        ) : (
          <Button size="sm" onClick={() => go(`/dispatch/${m.id}`)}><Waypoints /> {L('智能分发', 'Dispatch')}</Button>
        )}
      </TopBar>

      <div className={cn('meeting-heading flex-none border-b px-6', compact && 'is-compact')}>
        <div className="meeting-overview-collapse" inert={compact} aria-hidden={compact}>
        <div className="meeting-overview-clip">
        <div className="meeting-overview">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium" style={{ color: project.color, background: project.soft }}>
                <span className="size-1.5 rounded-full" style={{ background: project.color }} />{project.name}
              </span>
              {dispatched
                ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={13} /> {L(`已分发 ${peopleN} 人 · 待办确认 ${okN}/${actionsN.length}`, `Sent to ${peopleN} · to-dos confirmed ${okN}/${actionsN.length}`)}</span>
                : <span className="inline-flex items-center gap-1 text-amber-600"><Clock3 size={13} /> {L('已转写 · 等待分发', 'Transcribed · waiting to send')}</span>}
            </div>
            <h1 className="mt-2 text-[22px] leading-snug font-semibold tracking-tight">{m.title}</h1>
            <div className="text-ink-3 mt-1.5 flex flex-wrap items-center gap-y-1 text-[13px]">
              <span>{cnDate(m.date)} {weekday(m.date)} {m.time}</span>
              <span className="dot-sep">{m.source} {mmss(m.duration)}</span>
              <span className="dot-sep">{m.external ? L('直播主持', 'Stream host') : L('主持', 'Host')} {personById(m.host).name}</span>
              <span className="dot-sep inline-flex items-center gap-1.5">{L('发布者', 'Publisher')} <Face p={m.publisher} size={20} /><b className="text-ink-2 font-medium">{personById(m.publisher).name}</b><RankTag p={m.publisher} /></span>
              <span className="dot-sep inline-flex items-center gap-2">
                {L(`收到者 ${m.related.filter(x => x !== m.publisher).length} 人`, `${m.related.filter(x => x !== m.publisher).length} recipients`)}
                <FaceStack ids={m.related.filter(x => x !== m.publisher)} size={20} max={8} ring={pid => (m.attendees.includes(pid) ? '#22C55E' : undefined)} />
                {!m.external && <span>· {L('参会', 'attended')} {m.attendees.length}</span>}
              </span>
            </div>
          </div>
        </div>
        <div className="meeting-summary flex items-start gap-2 rounded-xl px-4 py-3 text-[13px] leading-6 text-[#3B4252]">
          <Sparkles size={14} className="text-primary mt-[5px] flex-none" />
          <div className="min-w-0"><b className="mb-1 block font-semibold">{L('AI 摘要', 'AI summary')}</b><p className="meeting-summary-text">{m.summary}</p></div>
        </div>
        </div>
        </div>
        </div>
        <div className="meeting-tabs flex items-center gap-1">
          <div className="flex min-w-0 flex-1 overflow-x-auto">
          {TABS.filter(x => !x.hide).map(x => (
            <button key={x.id} onClick={() => setTab(x.id)} className={cn('relative flex-none px-3 pt-2 pb-2.5 text-[13.5px] transition-colors', tab === x.id ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink')}>
              {x.label}{x.n != null && <span className="text-ink-4 ml-1 font-normal tabular-nums">{x.n}</span>}
              {tab === x.id && <motion.span layoutId="m-tab" className="bg-ink absolute inset-x-2 -bottom-px h-[2px] rounded-full" />}
            </button>
          ))}
          </div>
          <button type="button" aria-expanded={!compact} onClick={() => setHeaderCompact(!compact)} className="meeting-details-toggle flex-none rounded-lg px-2 py-1.5 text-[12px] text-ink-3 hover:bg-black/5 hover:text-ink">{compact ? L('展开会议信息', 'Show details') : L('收起会议信息', 'Hide details')}</button>
        </div>
      </div>

      <div className="meeting-content min-h-0 flex-1" onWheelCapture={() => { userScrollUntil.current = performance.now() + 1200 }} onPointerDownCapture={() => { userScrollUntil.current = performance.now() + 1200 }} onKeyDownCapture={e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) userScrollUntil.current = performance.now() + 1200 }} onScrollCapture={e => {
        const now = performance.now()
        if (now > userScrollUntil.current || now < resizingUntil.current) return
        const target = e.target as HTMLElement
        if (target.scrollTop > 64) setHeaderCompact(true)
        else if (target.scrollTop <= 4) setHeaderCompact(false)
      }}>
        {tab === 'replay' && (
          // 手机：录像、进度条在上，逐字稿 / 账本叠在下面，整页一起滚
          <div className="grid h-full grid-cols-[minmax(0,1fr)_400px] max-xl:grid-cols-[minmax(0,1fr)_340px] max-md:flex max-md:flex-col max-md:overflow-y-auto">
            <div data-scroll="replay" tabIndex={0} aria-label={L('会议回放与章节', 'Meeting replay and chapters')} className="min-h-0 overflow-y-auto px-6 py-5 max-md:flex-none max-md:overflow-visible max-md:px-3 max-md:py-3">
              <div className="mx-auto max-w-[920px]">
                <MeetingVideo meeting={m} t={clock.t} playing={clock.playing} onToggle={clock.toggle} focus={focus} pulse={pulse} captions={captions} speed={clock.speed} />
                <div className="mt-3"><PlayerControls clock={clock} captions={captions} onCaptions={setCaptions} /></div>
                <div className="mt-3 rounded-xl border px-3 pt-3 pb-3"><Scrubber meeting={m} clock={clock} focusId={focusId} onItem={locate} /></div>
                <NowPanel m={m} t={clock.t} focusId={focusId} onItem={locate} onSeek={seek} />
              </div>
            </div>
            <div className="relative flex min-h-0 flex-col border-l max-md:h-[72svh] max-md:flex-none max-md:border-t max-md:border-l-0">
              <div className="flex flex-none items-center gap-1 border-b px-3 pt-2">
                {(['tx', 'items'] as const).map(k => (
                  <button key={k} onClick={() => setSide(k)} className={cn('relative px-2.5 pt-1.5 pb-2.5 text-[13px] transition-colors', side === k ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink')}>
                    {k === 'tx' ? L(`逐字稿 · ${m.segments.length} 段`, `Transcript · ${m.segments.length}`) : L(`账本 · ${m.items.length} 条`, `Ledger · ${m.items.length}`)}
                    {side === k && <motion.span layoutId="m-side" className="bg-primary absolute inset-x-2 -bottom-px h-[2px] rounded-full" />}
                  </button>
                ))}
              </div>
              <div className="relative min-h-0 flex-1">
                {side === 'tx'
                  ? <Transcript meeting={m} t={clock.t} onSeek={seek} focusId={focusId} onFocus={locate} />
                  : <LedgerList m={m} t={clock.t} focusId={focusId} onItem={locate} />}
              </div>
            </div>
          </div>
        )}

        {tab === 'ledger' && <LedgerTable m={m} onItem={locate} />}

        {tab === 'dist' && (
          <div className="h-full overflow-y-auto px-6 py-5">
            {dispatched ? (
              <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
                <DistStats m={m} />
                <section>
                  <h3 className="mb-2 text-[15px] font-semibold">{L('路由矩阵', 'Routing matrix')} <span className="text-ink-3 text-[13px] font-normal">{L('点人名看 TA 收到的那份，点条目回到录像', 'Click a name to see their brief, an item to jump to the recording')}</span></h3>
                  <Matrix meeting={m} onOpen={setPaper} onItem={locate} />
                </section>
                <section>
                  <h3 className="mb-1 text-[15px] font-semibold">{L('每人一份简报 · 已投递飞书', 'One brief per person · delivered to Lark')}</h3>
                  <StickyNotes meeting={m.id} people={notePeople(m)} ready={() => true} onOpen={setPaper} />
                </section>
              </div>
            ) : (
              <Empty icon="paperPlane" title={L('这场会还没分发', 'Not dispatched yet')} sub={L('交给 8 个智能体：抽账本、按人路由、逐人改写，发之前会先给你看矩阵。', 'Hand it to 8 agents: build the ledger, route per person, rewrite for each — you see the matrix before anything is sent.')}>
                <Button className="mt-3" onClick={() => go(`/dispatch/${m.id}`, { run: 1 })}><Waypoints /> {L('开始智能分发', 'Start dispatch')}</Button>
              </Empty>
            )}
          </div>
        )}

        {tab === 'people' && (
          <div className="h-full overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-[1240px]"><PersonBrief m={m} pid={member} onPick={setMember} onItem={locate} /></div>
          </div>
        )}

        {tab === 'run' && <RunRecord />}
      </div>

      <BriefPaper meeting={m.id} pid={paper} onClose={() => setPaper(null)} />
    </>
  )
}

/** 播放到哪一段，下面就显示这一段的章节和要点 */
function NowPanel({ m, t, focusId, onItem, onSeek }: { m: Meeting; t: number; focusId: string | null; onItem: (it: Item) => void; onSeek: (t: number) => void }) {
  const ch = chapterAt(m, t)
  const items = m.items.filter(i => itemTime(i) >= ch.start - 0.01 && itemTime(i) < ch.end).sort((a, b) => itemTime(a) - itemTime(b))
  return (
    <div className="mt-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {m.chapters.map((c, i) => {
          const on = c === ch
          return (
            <button key={c.name} onClick={() => onSeek(c.start)} className={cn('kb-tile flex flex-none items-center gap-2 rounded-xl border px-3 py-2 text-left', on ? 'border-ink bg-white' : 'bg-white')}>
              <span className={cn('grid size-5 place-items-center rounded-full text-[11px] font-semibold', on ? 'bg-ink text-white' : 'bg-muted text-ink-3')}>{i + 1}</span>
              <span className="text-[13px] font-medium">{c.name}</span>
              <span className="text-ink-3 font-mono text-[11.5px]">{mmss(c.start)}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="text-[14px] font-semibold">{L('这一段说了什么', 'What this part covered')}</h3>
        <span className="text-ink-3 text-[12.5px]">{ch.name} · {mmss(ch.start)}–{mmss(ch.end)}</span>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map(it => <ItemCard key={it.id} it={it} m={m} active={focusId === it.id} said={itemTime(it) <= t} onClick={() => onItem(it)} />)}
        </AnimatePresence>
        {!items.length && <div className="text-ink-3 rounded-xl border border-dashed px-4 py-6 text-center text-[13px] sm:col-span-2">{L('这一段没有抽出条目', 'No items from this part')}</div>}
      </div>
    </div>
  )
}

function ItemCard({ it, m, active, said = true, onClick }: { it: Item; m: Meeting; active?: boolean; said?: boolean; onClick: () => void }) {
  const confirmed = useStore(s => s.confirmed[it.id])
  const owners = useStore(s => s.owners)
  const owner = owners[it.id] ?? it.owner
  const { t0, seg } = quoteSpan(it)
  const c = ITEM_TYPES[it.type]
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: said ? 1 : 0.5, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className={cn('kb-tile relative w-full rounded-xl border bg-white px-3.5 py-3 text-left', active && 'border-ink shadow-[0_6px_20px_-12px_rgba(0,0,0,.35)]')}
      style={active ? { boxShadow: `0 0 0 3px ${c.soft}` } : undefined}
    >
      <div className="flex items-center gap-2">
        <TypePill item={it} />
        <b className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{it.title}</b>
        {it.sensitivity === 'restricted' && <Lock size={12} className="flex-none text-rose-600" />}
        <span className="text-ink-3 flex flex-none items-center gap-1 font-mono text-[11.5px]"><Play size={9} fill="currentColor" />{mmss(t0)}</span>
      </div>
      <div className="text-ink-2 mt-1.5 truncate text-[12.5px]">“{it.quote}” <span className="text-ink-3">— {personById(seg.speaker).name}</span></div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
        {owner ? <span className="text-ink-2 inline-flex items-center gap-1"><Face p={owner} size={16} />{personById(owner).name}</span>
          : it.flags?.includes(term('缺负责人')) ? <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-px text-amber-700"><AlertTriangle size={11} /> {term('缺负责人')}{it.suggestedOwner ? L(`，建议${personById(it.suggestedOwner).name}`, ` — suggest ${personById(it.suggestedOwner).name}`) : ''}</span> : null}
        {it.due && <span className="text-ink-2 inline-flex items-center gap-1"><Clock3 size={12} />{it.due}</span>}
        {it.type === 'action' && (confirmed ? <span className="text-emerald-600">✓ {L(`${personById(confirmed).name} 已确认`, `${personById(confirmed).name} confirmed`)}</span> : <span className="text-ink-3">{L('待确认', 'Unconfirmed')}</span>)}
        <span className="ml-auto"><FaceStack ids={recipientsOf(m, it.id)} size={16} max={4} /></span>
      </div>
    </motion.button>
  )
}

function LedgerList({ m, t, focusId, onItem }: { m: Meeting; t: number; focusId: string | null; onItem: (it: Item) => void }) {
  const items = useMemo(() => [...m.items].sort((a, b) => itemTime(a) - itemTime(b)), [m])
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="flex flex-col gap-2">
        {items.map(it => <ItemCard key={it.id} it={it} m={m} active={focusId === it.id} said={itemTime(it) <= t + 0.05} onClick={() => onItem(it)} />)}
      </div>
    </div>
  )
}

function LedgerTable({ m, onItem }: { m: Meeting; onItem: (it: Item) => void }) {
  const confirmed = useStore(s => s.confirmed)
  const owners = useStore(s => s.owners)
  const items = [...m.items].sort((a, b) => itemTime(a) - itemTime(b))
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">{L('时间', 'Time')}</TableHead><TableHead>{L('类型', 'Type')}</TableHead><TableHead>{L('条目', 'Item')}</TableHead><TableHead>{L('负责人', 'Owner')}</TableHead>
              <TableHead>{L('截止', 'Due')}</TableHead><TableHead>{L('原话（点击回到录像）', 'Quote (click to jump)')}</TableHead><TableHead>{L('收件人', 'Recipients')}</TableHead><TableHead className="pr-4">{L('状态', 'Status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(it => {
              const { t0, seg } = quoteSpan(it)
              const owner = owners[it.id] ?? it.owner
              const ok = confirmed[it.id]
              return (
                <TableRow key={it.id} className="cursor-pointer" onClick={() => onItem(it)}>
                  <TableCell className="text-ink-3 pl-4 font-mono text-xs">{mmss(t0)}</TableCell>
                  <TableCell><TypePill item={it} /></TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="flex items-center gap-1.5 truncate font-medium">{it.title}{it.sensitivity === 'restricted' && <Lock className="size-3.5 text-rose-600" />}</div>
                    {it.detail && <div className="text-ink-3 truncate text-xs">{it.detail}</div>}
                  </TableCell>
                  <TableCell>
                    {owner ? <span className="flex items-center gap-1.5"><Face p={owner} size={20} />{personById(owner).name}</span>
                      : it.flags?.includes(term('缺负责人')) ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">{term('缺负责人')}</span> : <span className="text-ink-4">—</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{it.due ?? <span className="text-ink-4">—</span>}</TableCell>
                  <TableCell className="max-w-[240px]">
                    <span className="text-ink-2 inline-flex max-w-full items-center gap-1.5">
                      <span className="bg-primary grid size-5 flex-none place-items-center rounded-full text-white"><Play size={8} fill="currentColor" /></span>
                      <span className="truncate">“{it.quote}”</span><span className="text-ink-3 flex-none text-xs">{personById(seg.speaker).name}</span>
                    </span>
                  </TableCell>
                  <TableCell><FaceStack ids={recipientsOf(m, it.id)} size={20} max={5} ring={pid => (ok === pid ? '#22C55E' : undefined)} /></TableCell>
                  <TableCell className="pr-4">
                    {it.type !== 'action' ? <span className="text-ink-3 text-xs">{L('已记录', 'Logged')}</span>
                      : ok ? <span className="text-xs text-emerald-600">✓ {L('已确认', 'Confirmed')}</span>
                      : <span className="text-ink-3 text-xs">{L('待确认', 'Unconfirmed')}</span>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function DistStats({ m }: { m: Meeting }) {
  const confirmed = useStore(s => s.confirmed)
  const actions = m.items.filter(i => i.type === 'action')
  const people = new Set(m.routes.map(r => r.person))
  const absent = [...people].filter(p => !m.attendees.includes(p)).length
  const quiet = m.related.filter(p => isQuiet(m.id, p))
  const stats = [
    { k: L('推送', 'Pushes'), v: m.routes.length, s: L('条，每条写明为什么发给你', 'each says why it was sent'), icon: 'route' as const },
    { k: L('收到者', 'Recipients'), v: people.size, s: m.external ? L('人，直播里没人被点名', 'nobody was named in the stream') : L(`人，其中 ${absent} 人没参会`, `${absent} weren’t in the meeting`), icon: 'team' as const },
    { k: L('不打扰', 'Not pinged'), v: quiet.length, s: quiet.length ? L(`${quiet.map(q => personById(q).name).join('、')}，只进日报`, `${quiet.map(q => personById(q).name).join(', ')} — digest only`) : L('每个相关人都有必读', 'everyone involved has a must-read'), icon: 'coffee' as const },
    { k: L('待办确认', 'To-dos confirmed'), v: `${actions.filter(a => confirmed[a.id]).length}/${actions.length}`, s: L('负责人在飞书卡片里点“确认”', 'owners tap “Confirm” in the Lark card'), icon: 'stamp' as const },
  ]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(s => (
        <div key={s.k} className="kb-tile kb-wiggle flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5">
          <span className="text-ink-2"><Kb name={s.icon} size={34} /></span>
          <div className="min-w-0">
            <div className="text-ink-3 text-[12.5px]">{s.k}</div>
            <div className="text-[22px] leading-tight font-semibold tabular-nums">{s.v}</div>
            <div className="text-ink-3 truncate text-[12px]">{s.s}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** 便利贴的顺序：发布者、管理者在前，不打扰的人在最后 */
export function notePeople(m: Meeting): PersonId[] {
  if (m.id === RUN_ID) return RUN_PEOPLE
  const n = (p: PersonId) => m.routes.filter(r => r.person === p).length
  const rest = m.related.filter(p => p !== m.publisher).sort((a, b) => n(b) - n(a))
  return [m.publisher, ...rest]
}

/** 主案例分发时的编排回放 */
function RunRecord() {
  const models = useStore(s => s.models)
  const clock = useClock(T_END, { t: T_END })
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mx-auto max-w-[1100px]">
        <p className="text-ink-3 mb-3 text-[13px]">{L('这是这场会分发时 8 个智能体的完整编排记录，可以拖动或重放。', 'The full run log of the 8 agents that dispatched this meeting — scrub or replay it.')}<a className="text-primary ml-1" href={href(`/dispatch/${RUN_ID}`)}>{L('回到智能分发对话 →', 'Back to the dispatch chat →')}</a></p>
        <AgentTimeline clock={clock} models={models} />
      </div>
    </div>
  )
}
