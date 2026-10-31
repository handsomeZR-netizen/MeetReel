// 成员简报：从主持人视角看某个人收到了什么、要处理什么、为什么发给他。
// 左边是这个人的简报（议题、待处理事项、其他相关、理由、TA 的发言），右边是会议信息、成员、文件、发送记录。
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Check } from 'lucide'
import { AtSign, BellOff, CalendarDays, CheckCircle2, ChevronRight, Clock3, Eye, FileText, MapPin, Paperclip, Send, Sparkles, Video } from 'lucide-react'
import { REASONS, personById, type PersonId } from '@/data/model'
import { MEETINGS } from '@/data/meetings'
import type { Item, Meeting } from '@/data/meetings'
import { briefFor, mmss, quoteSpan, recipientsOf, visibility } from '@/data/derive'
import { EXTRAS, type FileKind } from '@/data/extras'
import { goSource } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { cn, cnDate, weekday } from '@/lib/utils'
import { Switch } from '@/components/ui/misc'
import { Face, Kb, SourceChip, TypePill } from '@/components/common/bits'
import type { KoboyoName } from '@/components/sketch/koboyoData'

type Sub = 'brief' | 'talk' | 'tasks' | 'topics'

const TOPIC_ICON: Record<string, KoboyoName> = {
  券规则: 'coupon', 上线时间: 'calendar', 接口: 'chain', 扩容: 'rocket', 客服: 'megaphone',
  数据: 'target', 退款: 'hourglass', 补偿: 'coupon', 目标: 'target', 排期: 'calendar', 预算: 'lock',
  等级: 'stamp', 技术: 'chain', 积分: 'coupon', 结果: 'target', 稳定性: 'warning', 券: 'coupon', 后续: 'clipboard',
}

/** 2026 年的“11/5” → “11/5（周四）” */
const dueText = (d: string) => (/^\d+\/\d+$/.test(d) ? `${d}（${weekday(`2026-${d.split('/').map(x => x.padStart(2, '0')).join('-')}`)}）` : d)

interface Props {
  m: Meeting
  pid: PersonId
  onPick: (pid: PersonId) => void
  onItem: (it: Item) => void
}

export function PersonBrief({ m, pid, onPick, onItem }: Props) {
  const [sub, setSub] = useState<Sub>('brief')
  const [quietMode, setQuietMode] = useState<Record<string, boolean>>({})
  const owners = useStore(s => s.owners)
  const p = personById(pid)
  const b = briefFor(m.id, pid)
  const quiet = !b.host && !b.entries.length
  const entryItems = (b.host ? m.items : b.entries.map(e => m.items.find(i => i.id === e.item)!))
  const talk = m.segments.filter(s => s.speaker === pid)
  const tasks = MEETINGS.flatMap(x => x.items).filter(i => i.type === 'action' && ((owners[i.id] ?? i.owner) === pid || (!(owners[i.id] ?? i.owner) && i.suggestedOwner === pid)))
  const crossTopics = topicGroups(MEETINGS.flatMap(x => (x.host === pid ? x.items : x.routes.filter(r => r.person === pid).map(r => x.items.find(i => i.id === r.item)!))))
  const following = MEETINGS.filter(x => x.related.includes(pid)).length

  const SUBS: { id: Sub; label: string; n?: number }[] = [
    { id: 'brief', label: '个性化简报' },
    { id: 'talk', label: m.attendees.includes(pid) ? 'TA 的发言' : '提到 TA 的发言', n: talk.length || undefined },
    { id: 'tasks', label: '相关任务', n: tasks.length },
    { id: 'topics', label: '相关议题', n: crossTopics.length },
  ]

  return (
    <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* 人物头 */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4">
          <Face p={p} size={58} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[20px] font-semibold">{p.name}</b>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700">{p.role}</span>
              <span className="rounded-md bg-[#F2F0FF] px-2 py-0.5 text-[12px] text-[#5B4BC4]">{p.team}</span>
              {m.host === pid && <span className="rounded-md bg-[#E0E7FF] px-2 py-0.5 text-[12px] text-[#3730A3]">本场主持</span>}
              {!m.attendees.includes(pid) && <span className="bg-muted text-ink-3 rounded-md px-2 py-0.5 text-[12px]">没参会</span>}
            </div>
            <div className="text-ink-3 mt-1 flex flex-wrap gap-x-3 text-[12.5px]">
              <span>关注 {following} 个会议</span><span>负责 {p.profile.owns.join('、') || '—'}</span><span>最近活跃 今天 09:20</span>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border px-3 py-2">
            <span className="text-[12.5px] leading-tight"><b className="inline-flex items-center gap-1 font-medium"><BellOff size={13} /> 免打扰</b><br /><span className="text-ink-3">开启后只进日报，不推送卡片</span></span>
            <Switch checked={!!quietMode[pid]} onCheckedChange={v => setQuietMode(s => ({ ...s, [pid]: v }))} />
          </label>
        </div>

        <div className="flex gap-1 border-b">
          {SUBS.map(x => (
            <button key={x.id} onClick={() => setSub(x.id)} className={cn('relative px-3 pt-1 pb-2.5 text-[13.5px]', sub === x.id ? 'text-primary font-semibold' : 'text-ink-3 hover:text-ink')}>
              {x.label}{x.n != null && <span className={cn('ml-1.5 rounded-full px-1.5 text-[11px]', sub === x.id ? 'bg-primary/10' : 'bg-muted')}>{x.n}</span>}
              {sub === x.id && <motion.span layoutId="pb-sub" className="bg-primary absolute inset-x-2 -bottom-px h-[2px] rounded-full" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={sub + pid} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-4">
            {sub === 'brief' && <BriefTab m={m} pid={pid} quiet={quiet || !!quietMode[pid]} entryItems={entryItems} onItem={onItem} />}
            {sub === 'talk' && <TalkTab m={m} pid={pid} entryItems={entryItems} onItem={onItem} />}
            {sub === 'tasks' && <TaskList items={tasks} pid={pid} />}
            {sub === 'topics' && <TopicCards groups={crossTopics} onItem={onItem} showMeeting />}
          </motion.div>
        </AnimatePresence>

        <NoteBox name={p.name} />
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <MeetingInfo m={m} />
        <Members m={m} pid={pid} onPick={onPick} />
        <Files m={m} />
        <SendLog m={m} pid={pid} />
      </aside>
    </div>
  )
}

// ---------------- 个性化简报 ----------------

function BriefTab({ m, pid, quiet, entryItems, onItem }: { m: Meeting; pid: PersonId; quiet: boolean; entryItems: Item[]; onItem: (it: Item) => void }) {
  const dispatched = useStore(s => s.dispatched[m.id])
  const p = personById(pid)
  const b = briefFor(m.id, pid)
  const ex = EXTRAS[m.id]
  const handle = b.host
    ? m.items.filter(i => i.type === 'action' && (!i.owner || i.flags?.length))
    : b.entries.filter(e => { const it = m.items.find(i => i.id === e.item)!; return it.type === 'action' || !!e.facts }).map(e => m.items.find(i => i.id === e.item)!)
  const others = entryItems.filter(i => !handle.includes(i))
  const reasons = [...new Set(m.routes.filter(r => r.person === pid).flatMap(r => r.reasons))]

  return (
    <>
      <Card>
        <div className="flex items-start gap-3">
          <span className="text-primary kb-wiggle on flex-none"><Kb name="envelope" size={40} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[16px]">发送给{p.name}的内容</b>
              {dispatched
                ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[12px] text-emerald-700"><CheckCircle2 size={12} /> {quiet ? '只进日报' : '已发送'}</span>
                : <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[12px] text-amber-700"><Clock3 size={12} /> 待分发 · 预览</span>}
              {dispatched && <span className="text-ink-3 text-[12px]">{m.id === 'd11' ? '刚刚' : ex.sentAt}</span>}
            </div>
            <p className="text-ink-3 mt-1 text-[12.5px] leading-relaxed">
              基于{p.name}的角色（{p.role}）和关注重点（{[...p.profile.interests, ...p.profile.owns].slice(0, 3).join('、') || '—'}）定制，只含和 TA 有关的 {b.host ? m.items.length : b.entries.length} 条，约 {b.readSeconds} 秒读完。
            </p>
            <p className="mt-2 text-[14.5px] leading-relaxed font-medium">{b.headline}</p>
          </div>
        </div>
      </Card>

      {quiet ? (
        <Card><div className="text-ink-2 flex items-center gap-3 text-[14px]"><Kb name="coffee" size={36} /> 这场会没有需要{p.name}必读的内容，不推送卡片，相关变化放进日报。</div></Card>
      ) : (
        <>
          <section>
            <H icon="target" title={`与${p.name}相关的议题`} />
            <TopicCards groups={topicGroups(entryItems)} onItem={onItem} />
          </section>

          {handle.length > 0 && (
            <section>
              <H icon="clipboard" title={`${b.host ? '还要你跟进的事项' : `需要${p.name}处理的事项`}（${handle.length}）`} />
              <TaskRows m={m} pid={pid} items={handle} onItem={onItem} />
            </section>
          )}

          {others.length > 0 && (
            <section>
              <H icon="newspaper" title={`其他和${p.name}有关的内容（${others.length}）`} />
              <div className="overflow-hidden rounded-2xl border bg-white">
                {others.map(it => {
                  const e = b.entries.find(x => x.item === it.id)
                  return (
                    <div key={it.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
                      <TypePill item={it} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium">{visibility(it, pid) === 'redacted' ? it.redacted : it.title}</div>
                        {e && <p className="text-ink-2 mt-0.5 text-[13px] leading-relaxed">{e.forYou}</p>}
                        {b.host && <p className="text-ink-3 mt-0.5 text-[12px]">发给 {recipientsOf(m, it.id).map(x => personById(x).name).join('、') || '只在账本里'}</p>}
                        <SourceChip item={it} className="-ml-0.5 mt-1" />
                      </div>
                      {e && <span className="text-ink-3 flex-none text-[12px]">{e.reasons.map(r => REASONS[r]).join(' · ')}</span>}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <H icon="lightbulb" title={b.host ? '主持人版说明' : `为什么发给${p.name}`} />
            <div className="text-ink-2 rounded-2xl border bg-[#FAFAF8] px-4 py-3 text-[13px] leading-relaxed">
              {b.host
                ? `你是这场会的主持人，主持人版包含全部 ${m.items.length} 条和每条的去向；缺负责人、缺截止的条目会排在最前面。`
                : `路由官对照${p.name}的关注档案：负责 ${p.profile.owns.join('、') || '—'}，依赖 ${p.profile.dependsOn.join('、') || '—'}，订阅 ${p.profile.interests.join('、') || '—'}。这场会命中了 ${reasons.map(r => `${r}（${REASONS[r]}）`).join('、')}，所以只把这 ${b.entries.length} 条发给 TA。`}
            </div>
          </section>
        </>
      )}
    </>
  )
}

function TaskRows({ m, pid, items, onItem }: { m: Meeting; pid: PersonId; items: Item[]; onItem: (it: Item) => void }) {
  const confirmed = useStore(s => s.confirmed)
  const owners = useStore(s => s.owners)
  const b = briefFor(m.id, pid)
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => {
        const e = b.entries.find(x => x.item === it.id)
        const owner = owners[it.id] ?? it.owner
        const ok = confirmed[it.id]
        const { seg } = quoteSpan(it)
        const canConfirm = owner === pid || (!owner && it.suggestedOwner === pid)
        return (
          <div key={it.id} className="kb-tile grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[minmax(0,1fr)_230px]">
            <div className="flex min-w-0 gap-3">
              <button className={cn('mt-0.5 grid size-5 flex-none place-items-center rounded-md border-2 transition-colors', ok ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-4')} onClick={() => canConfirm && actions.confirm(it.id, pid)} aria-label="确认">
                {ok && <MorphIcon icon={Check} size={12} strokeWidth={3} />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="bg-primary/10 text-primary grid size-5 place-items-center rounded-full text-[11px] font-semibold">{i + 1}</span><b className="text-[14.5px]">{visibility(it, pid) === 'redacted' ? it.redacted : it.title}</b></div>
                <p className="text-ink-2 mt-1 text-[13px] leading-relaxed">{e?.forYou ?? it.detail ?? (it.flags?.length ? `会上没定：${it.flags.join('、')}${it.suggestedOwner ? `。建议 ${personById(it.suggestedOwner).name}。` : '。'}` : '')}</p>
                <button className="text-primary mt-1.5 inline-flex items-center gap-0.5 text-[12.5px] hover:underline" onClick={() => onItem(it)}>查看原话 {mmss(quoteSpan(it).t0)} <ChevronRight size={13} /></button>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t pt-3 text-[12.5px] md:border-t-0 md:border-l md:pt-0 md:pl-4">
              <div className="flex items-center justify-between gap-2">
                {it.due ? <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-600"><Clock3 size={12} /> {dueText(it.due)} 截止</span> : <span className="text-ink-3">没有截止时间</span>}
                <span className={cn('rounded-md px-1.5 py-0.5', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{ok ? '已确认' : '待处理'}</span>
              </div>
              <div className="text-ink-3 flex items-center gap-1.5">来自 <Face p={seg.speaker} size={18} /><span className="text-ink-2">{personById(seg.speaker).name}</span><span>{personById(seg.speaker).role}</span></div>
              <div className="text-ink-3 flex items-center gap-1.5">来源议题 <span className="text-ink-2 inline-flex items-center gap-1"><Kb name={TOPIC_ICON[it.topic] ?? 'signpost'} size={15} />{it.topic}</span></div>
              {owner && <div className="text-ink-3 flex items-center gap-1.5">负责人 <Face p={owner} size={18} /><span className="text-ink-2">{personById(owner).name}</span></div>}
              <div className="mt-auto pt-1">
                {canConfirm && !ok
                  ? <button className="bg-primary w-full rounded-lg py-1.5 text-[13px] font-medium text-white" onClick={() => actions.confirm(it.id, pid)}>{owner ? '确认收到' : '我来负责'}</button>
                  : !owner && it.suggestedOwner && pid === m.host
                    ? <button className="bg-primary w-full rounded-lg py-1.5 text-[13px] font-medium text-white" onClick={() => actions.assign(it.id, it.suggestedOwner!)}>指派给{personById(it.suggestedOwner).name}</button>
                    : <button className="text-primary w-full rounded-lg border border-[#C9D8FF] py-1.5 text-[13px]" onClick={() => onItem(it)}>回到录像核对</button>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TopicCards({ groups, onItem, showMeeting }: { groups: { topic: string; items: Item[] }[]; onItem: (it: Item) => void; showMeeting?: boolean }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
      {groups.map(g => (
        <button key={g.topic + (showMeeting ? g.items[0].meeting : '')} onClick={() => onItem(g.items[0])} className="kb-tile kb-wiggle flex items-start gap-3 rounded-2xl border bg-white p-3.5 text-left">
          <span className="text-ink-2 flex-none"><Kb name={TOPIC_ICON[g.topic] ?? 'signpost'} size={30} /></span>
          <div className="min-w-0">
            <b className="text-[14px]">{g.topic}</b>
            <p className="text-ink-3 mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed">{g.items.map(i => i.title).join('；')}</p>
            {showMeeting && <p className="text-ink-4 mt-1 text-[11.5px]">{[...new Set(g.items.map(i => MEETINGS.find(x => x.id === i.meeting)!.title))].join('、')}</p>}
          </div>
        </button>
      ))}
      {!groups.length && <div className="text-ink-3 text-[13px]">没有相关议题</div>}
    </div>
  )
}

function topicGroups(items: Item[]) {
  const map = new Map<string, Item[]>()
  for (const it of items) if (it) map.set(it.topic, [...(map.get(it.topic) ?? []), it])
  return [...map.entries()].map(([topic, list]) => ({ topic, items: [...new Set(list)] }))
}

// ---------------- 发言 / 任务 ----------------

function TalkTab({ m, pid, entryItems, onItem }: { m: Meeting; pid: PersonId; entryItems: Item[]; onItem: (it: Item) => void }) {
  const p = personById(pid)
  const own = m.segments.filter(s => s.speaker === pid)
  const segs = own.length ? own : [...new Set(entryItems.map(i => i.seg))].map(id => m.segments.find(s => s.id === id)!)
  return (
    <Card>
      <p className="text-ink-3 mb-2 text-[12.5px]">{own.length ? `${p.name}在这场会里说了 ${own.length} 段，点时间回到录像` : `${p.name}没参会。下面是会上和 TA 有关的发言`}</p>
      <div className="flex flex-col">
        {segs.map(s => {
          const its = m.items.filter(i => i.seg === s.id)
          return (
            <div key={s.id} className="flex gap-3 border-b py-3 last:border-0">
              <Face p={s.speaker} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[12.5px]">
                  <b className="font-semibold">{personById(s.speaker).name}</b>
                  <button className="text-primary font-mono hover:underline" onClick={() => goSource(m.id, s.start)}>▶ {mmss(s.start)}</button>
                </div>
                <p className="text-ink-2 mt-0.5 text-[14px] leading-relaxed">{s.text}</p>
                {its.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{its.map(it => <button key={it.id} onClick={() => onItem(it)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[12px] hover:bg-black/[.03]"><TypePill item={it} />{it.title}</button>)}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function TaskList({ items, pid }: { items: Item[]; pid: PersonId }) {
  const confirmed = useStore(s => s.confirmed)
  if (!items.length) return <Card><span className="text-ink-3 text-[13px]">{personById(pid).name}最近没有待办。</span></Card>
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      {items.map(it => {
        const mt = MEETINGS.find(x => x.id === it.meeting)!
        return (
          <div key={it.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
            <span className={cn('grid size-5 flex-none place-items-center rounded-md border-2', confirmed[it.id] ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-4')}>{confirmed[it.id] && <MorphIcon icon={Check} size={12} strokeWidth={3} />}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">{it.title}</div>
              <div className="text-ink-3 text-[12px]">{mt.title} · {cnDate(mt.date)}</div>
            </div>
            {it.due && <span className="text-ink-2 flex-none text-[12.5px]">{dueText(it.due)}</span>}
            <SourceChip item={it} className="flex-none">原话</SourceChip>
          </div>
        )
      })}
    </div>
  )
}

// ---------------- 右栏 ----------------

function MeetingInfo({ m }: { m: Meeting }) {
  const ex = EXTRAS[m.id]
  const rows: [ReactNode, string, ReactNode][] = [
    [<CalendarDays size={14} />, '时间', `${cnDate(m.date)} ${weekday(m.date)} ${m.time} · 录像 ${mmss(m.duration)}`],
    [<MapPin size={14} />, '地点', <span className="inline-flex items-center gap-2">{ex.place}{ex.online && <span className="text-ink-3 inline-flex items-center gap-1"><Video size={13} /> 线上</span>}</span>],
    [<FileText size={14} />, '类型', ex.kind],
    [<Sparkles size={14} />, '摘要', m.summary],
  ]
  return (
    <Card>
      <H icon="calendar" title="会议信息" small />
      <div className="mt-1 flex flex-col gap-2.5 text-[12.5px]">
        {rows.map(([icon, k, v]) => (
          <div key={k} className="grid grid-cols-[18px_40px_minmax(0,1fr)] items-start gap-1">
            <span className="text-ink-3 mt-0.5">{icon}</span><span className="text-ink-3">{k}</span><span className="text-ink-2 leading-relaxed">{v}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Members({ m, pid, onPick }: { m: Meeting; pid: PersonId; onPick: (pid: PersonId) => void }) {
  const quietOf = (x: PersonId) => x !== m.host && !m.routes.some(r => r.person === x)
  return (
    <Card>
      <H icon="team" title={`本次会议的相关成员（${m.related.length}）`} small />
      <div className="mt-1 grid grid-cols-4 gap-1.5">
        {m.related.map(x => {
          const pp = personById(x)
          const on = x === pid
          return (
            <button key={x} onClick={() => onPick(x)} className={cn('relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors', on ? 'border-primary bg-[#F3F6FE]' : 'border-transparent hover:bg-black/[.03]')}>
              <span className="relative">
                <Face p={pp} size={36} muted={quietOf(x)} />
                {m.attendees.includes(x) && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" title="参会" />}
              </span>
              <span className={cn('text-[12px] leading-tight', on ? 'text-primary font-semibold' : '')}>{pp.name}</span>
              <span className="text-ink-3 w-full truncate text-center text-[10.5px] leading-tight">{x === m.host ? '主持' : quietOf(x) ? '不打扰' : pp.role}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

const KIND: Record<FileKind, { label: string; bg: string }> = {
  doc: { label: 'W', bg: '#2F64F2' }, pdf: { label: 'PDF', bg: '#E5484D' }, xls: { label: 'X', bg: '#1F9D55' }, ppt: { label: 'P', bg: '#E8772E' },
}

function Files({ m }: { m: Meeting }) {
  const files = EXTRAS[m.id].files
  return (
    <Card>
      <H icon="document" title={`相关文件（${files.length}）`} small />
      <div className="mt-1 flex flex-col gap-1">
        {files.map(f => (
          <div key={f.name} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-black/[.03]">
            <span className="grid size-9 flex-none place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: KIND[f.kind].bg }}>{KIND[f.kind].label}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{f.name}</div>
              <div className="text-ink-3 text-[11.5px]">{personById(f.owner).name} · {f.date}</div>
            </div>
            <span className="text-ink-3 flex-none text-[11.5px]">{f.size}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SendLog({ m, pid }: { m: Meeting; pid: PersonId }) {
  const dispatched = useStore(s => s.dispatched[m.id])
  const events = useStore(s => s.events.filter(e => e.meeting === m.id && e.person === pid && e.kind !== 'sent'))
  const ex = EXTRAS[m.id]
  const quiet = pid !== m.host && !m.routes.some(r => r.person === pid)
  const read = ex.readAt[pid]
  const live = m.id === 'd11'
  return (
    <Card>
      <H icon="mailbox" title="发送记录" small />
      {!dispatched ? <p className="text-ink-3 mt-1 text-[12.5px]">还没分发。</p> : (
        <ol className="relative mt-2 flex flex-col gap-3 pl-6 text-[12.5px]">
          <span className="bg-border absolute top-2 bottom-2 left-[9px] w-px" />
          <Li icon={<Send size={11} />} tone="bg-emerald-500" title={quiet ? '只进日报' : '已发送'} sub={`${live ? '刚刚' : ex.sentAt} · ${quiet ? '日报' : personById(pid).profile.channels.join(' + ')}`} />
          {!quiet && (read && !live
            ? <Li icon={<Eye size={11} />} tone="bg-primary" title="对方已读" sub={read} />
            : <Li icon={<Eye size={11} />} tone="bg-ink-4" title="还没读" sub="读了会显示在这里" />)}
          {events.map(e => (
            <Li key={e.id} icon={<CheckCircle2 size={11} />} tone={e.kind === 'ask' ? 'bg-amber-500' : 'bg-emerald-500'} title={e.kind === 'ask' ? `追问：${e.text}` : e.kind === 'confirm' ? '确认了待办' : e.text ?? ''} sub={e.when} />
          ))}
        </ol>
      )}
    </Card>
  )
}

function Li({ icon, tone, title, sub }: { icon: ReactNode; tone: string; title: string; sub: string }) {
  return (
    <motion.li className="relative" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}>
      <span className={cn('absolute top-0 -left-6 grid size-[19px] place-items-center rounded-full text-white ring-2 ring-white', tone)}>{icon}</span>
      <div className="font-medium">{title}</div>
      <div className="text-ink-3 text-[11.5px]">{sub}</div>
    </motion.li>
  )
}

// ---------------- 底部备注 ----------------

function NoteBox({ name }: { name: string }) {
  const [draft, setDraft] = useState('')
  const [notes, setNotes] = useState<string[]>([])
  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-3 pb-1">
      <AnimatePresence initial={false}>
        {notes.map((n, i) => (
          <motion.div key={i} className="text-ink-2 mb-2 rounded-xl bg-[#F6F8FE] px-3 py-2 text-[13px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <b className="font-medium">王珂</b> 备注：{n}
          </motion.div>
        ))}
      </AnimatePresence>
      <form className="flex items-center gap-2 rounded-2xl border bg-white p-1.5 pl-3 shadow-[0_6px_20px_-12px_rgba(0,0,0,.2)]" onSubmit={e => { e.preventDefault(); if (draft.trim()) { setNotes(n => [...n, draft.trim()]); setDraft('') } }}>
        <Paperclip size={15} className="text-ink-3" />
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={`给${name}的简报加备注、@同事，或向 AI 提问…`} className="placeholder:text-ink-3 h-8 flex-1 bg-transparent text-[13.5px] outline-none" />
        <button type="button" className="text-ink-2 hidden items-center gap-1 rounded-lg border px-2 py-1 text-[12.5px] sm:inline-flex"><AtSign size={13} /> 提及</button>
        <button type="button" className="text-primary hidden items-center gap-1 rounded-lg border border-[#C9D8FF] px-2 py-1 text-[12.5px] sm:inline-flex"><Sparkles size={13} /> AI 帮我写</button>
        <button className={cn('grid size-8 place-items-center rounded-xl text-white', draft.trim() ? 'bg-primary' : 'bg-[#D7DCE6]')} aria-label="发送"><Send size={14} /></button>
      </form>
    </div>
  )
}

// ---------------- 小件 ----------------

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border bg-white p-4">{children}</div>
}

function H({ icon, title, small }: { icon: KoboyoName; title: string; small?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', small ? 'mb-2' : 'mb-2.5')}>
      <span className="text-ink-2"><Kb name={icon} size={small ? 20 : 24} /></span>
      <b className={small ? 'text-[14px]' : 'text-[15px]'}>{title}</b>
    </div>
  )
}

