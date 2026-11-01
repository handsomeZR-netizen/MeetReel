// 成员简报：从发布者视角看某个收到者收到了什么、要处理什么、为什么发给 TA。
// 左边是这个人的简报（议题、待处理事项、其他相关、理由、TA 的发言），右边是会议信息、成员、文件、发送记录。
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Check } from 'lucide'
import { AtSign, BellOff, CalendarDays, CheckCircle2, ChevronRight, Clock3, Eye, FileText, MapPin, Paperclip, Send, Sparkles, Video } from 'lucide-react'
import { FileIcon } from '@/components/common/FileIcon'
import { REASONS, personById, term, type PersonId } from '@/data/model'
import { L } from '@/lib/i18n'
import { RUN_ID } from '@/data/run'
import { MEETINGS } from '@/data/meetings'
import type { Item, Meeting } from '@/data/meetings'
import { briefFor, isQuiet, mmss, quoteSpan, recipientsOf, visibility } from '@/data/derive'
import { EXTRAS, type FileKind } from '@/data/extras'
import { goSource } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { cn, cnDate, weekday } from '@/lib/utils'
import { Switch } from '@/components/ui/misc'
import { Face, Kb, LeaderTag, RankTag, SourceChip, TypePill } from '@/components/common/bits'
import type { KoboyoName } from '@/components/sketch/koboyoData'

type Sub = 'brief' | 'talk' | 'tasks' | 'topics'

// 键是中文话题，过一遍 term() 和条目上的 topic 对齐
const TOPIC_ICON: Record<string, KoboyoName> = Object.fromEntries(Object.entries({
  购车权益: 'coupon', 电子安全: 'chain', 安全理念: 'lightbulb', 安全体系: 'compass', 安全目标: 'target', 安全组织: 'team',
  评审机制: 'stamp', 事故预防: 'warning', 全域安全: 'compass', 用车安全: 'route', 车主培训: 'team', 车主激励: 'coupon',
  'App 安全分': 'target', 座椅安全: 'warning', 'OTA 功能安全': 'chain', 竞品安全体系: 'newspaper', '车主 App': 'target',
  交付体验: 'handshake', 门店安全话术: 'megaphone', 竞品卖点: 'megaphone', 试驾: 'route',
} as Record<string, KoboyoName>).map(([k, v]) => [term(k), v]))

/** 2026 年的“11/5” → “11/5（周四）” */
const dueText = (d: string) => (/^\d+\/\d+$/.test(d) ? L(`${d}（${weekday(`2026-${d.split('/').map(x => x.padStart(2, '0')).join('-')}`)}）`, `${d} (${weekday(`2026-${d.split('/').map(x => x.padStart(2, '0')).join('-')}`)})`) : d)

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
  const crossTopics = topicGroups(MEETINGS.flatMap(x => (x.publisher === pid ? x.items : x.routes.filter(r => r.person === pid).map(r => x.items.find(i => i.id === r.item)!))))
  const following = MEETINGS.filter(x => x.related.includes(pid)).length

  const SUBS: { id: Sub; label: string; n?: number }[] = [
    { id: 'brief', label: L('个性化简报', 'Personal brief') },
    { id: 'talk', label: m.attendees.includes(pid) ? L('TA 的发言', 'What they said') : L('提到 TA 的发言', 'Mentions'), n: talk.length || undefined },
    { id: 'tasks', label: L('相关任务', 'Tasks'), n: tasks.length },
    { id: 'topics', label: L('相关议题', 'Topics'), n: crossTopics.length },
  ]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* 人物头 */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4">
          <Face p={p} size={58} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[20px] font-semibold">{p.name}</b>
              <RankTag p={p} className="text-[12px] leading-[22px]" />
              <span className="rounded-md bg-[#F2F0FF] px-2 py-0.5 text-[12px] text-[#5B4BC4]">{p.team}{p.group ? ` · ${p.group}` : ''} · {p.role}</span>
              <LeaderTag pid={pid} className="text-[12px] leading-[22px]" />
              {m.publisher === pid && <span className="rounded-md bg-[#E0E7FF] px-2 py-0.5 text-[12px] text-[#3730A3]">{L('本场发布者', 'Publisher')}</span>}
              {!m.external && !m.attendees.includes(pid) && <span className="bg-muted text-ink-3 rounded-md px-2 py-0.5 text-[12px]">{L('没参会', 'Not in the meeting')}</span>}
            </div>
            <div className="text-ink-3 mt-1 flex flex-wrap gap-x-3 text-[12.5px]">
              <span>{L(`关注 ${following} 个会议`, `Follows ${following} meetings`)}</span><span>{L('负责', 'Owns')} {p.profile.owns.join(L('、', ', ')) || '—'}</span>{p.reportsTo && <span>{L('汇报给', 'Reports to')} {personById(p.reportsTo).name}</span>}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border px-3 py-2">
            <span className="text-[12.5px] leading-tight"><b className="inline-flex items-center gap-1 font-medium"><BellOff size={13} /> {L('免打扰', 'Quiet mode')}</b><br /><span className="text-ink-3">{L('开启后只进日报，不推送卡片', 'Daily digest only, no card pushed')}</span></span>
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
              <b className="text-[16px]">{L(`发送给${p.name}的内容`, `What ${p.name} gets`)}</b>
              {dispatched
                ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[12px] text-emerald-700"><CheckCircle2 size={12} /> {quiet ? L('只进日报', 'Digest only') : L('已发送', 'Sent')}</span>
                : <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[12px] text-amber-700"><Clock3 size={12} /> {L('待分发 · 预览', 'Not sent · preview')}</span>}
              {dispatched && <span className="text-ink-3 text-[12px]">{m.id === RUN_ID ? L('刚刚', 'just now') : ex.sentAt}</span>}
            </div>
            <p className="text-ink-3 mt-1 text-[12.5px] leading-relaxed">
              {L(`基于${p.name}的角色（${p.role}）和关注重点（${[...p.profile.interests, ...p.profile.owns].slice(0, 3).join('、') || '—'}）定制，只含和 TA 有关的 ${b.host ? m.items.length : b.entries.length} 条，约 ${b.readSeconds} 秒读完。`,
                `Tailored to ${p.name}’s role (${p.role}) and focus (${[...p.profile.interests, ...p.profile.owns].slice(0, 3).join(', ') || '—'}): only the ${b.host ? m.items.length : b.entries.length} items that concern them, about ${b.readSeconds} s to read.`)}
            </p>
            <p className="mt-2 text-[14.5px] leading-relaxed font-medium">{b.headline}</p>
          </div>
        </div>
      </Card>

      {quiet ? (
        <Card><div className="text-ink-2 flex items-center gap-3 text-[14px]"><Kb name="coffee" size={36} /> {L(`这场会没有需要${p.name}必读的内容，不推送卡片，相关变化放进日报。`, `Nothing here is a must-read for ${p.name}: no card is pushed, and related changes go into the daily digest.`)}</div></Card>
      ) : (
        <>
          <section>
            <H icon="target" title={L(`与${p.name}相关的议题`, `Topics for ${p.name}`)} />
            <TopicCards groups={topicGroups(entryItems)} onItem={onItem} />
          </section>

          {handle.length > 0 && (
            <section>
              <H icon="clipboard" title={L(`${b.host ? '还要你跟进的事项' : `需要${p.name}处理的事项`}（${handle.length}）`, `${b.host ? 'Still needs your follow-up' : `For ${p.name} to handle`} (${handle.length})`)} />
              <TaskRows m={m} pid={pid} items={handle} onItem={onItem} />
            </section>
          )}

          {others.length > 0 && (
            <section>
              <H icon="newspaper" title={L(`其他和${p.name}有关的内容（${others.length}）`, `Also relevant to ${p.name} (${others.length})`)} />
              <div className="overflow-hidden rounded-2xl border bg-white">
                {others.map(it => {
                  const e = b.entries.find(x => x.item === it.id)
                  return (
                    <div key={it.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
                      <TypePill item={it} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium">{visibility(it, pid) === 'redacted' ? it.redacted : it.title}</div>
                        {e && <p className="text-ink-2 mt-0.5 text-[13px] leading-relaxed">{e.forYou}</p>}
                        {b.host && <p className="text-ink-3 mt-0.5 text-[12px]">{L('发给', 'Sent to')} {recipientsOf(m, it.id).map(x => personById(x).name).join(L('、', ', ')) || L('只在账本里', 'ledger only')}</p>}
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
            <H icon="lightbulb" title={b.host ? L('发布者版说明', 'About the publisher version') : L(`为什么发给${p.name}`, `Why ${p.name}`)} />
            <div className="text-ink-2 rounded-2xl border bg-[#FAFAF8] px-4 py-3 text-[13px] leading-relaxed">
              {b.host
                ? L(`你是这场会的发布者，发布者版包含全部 ${m.items.length} 条和每条的去向；缺负责人、待核实的条目会排在最前面。`, `You published this meeting. The publisher version has all ${m.items.length} items and where each one went; items missing an owner or needing verification come first.`)
                : L(`路由官对照${p.name}的关注档案：负责 ${p.profile.owns.join('、') || '—'}，依赖 ${p.profile.dependsOn.join('、') || '—'}，订阅 ${p.profile.interests.join('、') || '—'}。这场会命中了 ${reasons.map(r => `${r}（${REASONS[r]}）`).join('、')}，所以只把这 ${b.entries.length} 条发给 TA。`,
                  `The Router checked ${p.name}’s interest profile — owns: ${p.profile.owns.join(', ') || '—'}; depends on: ${p.profile.dependsOn.join(', ') || '—'}; follows: ${p.profile.interests.join(', ') || '—'}. This meeting hit ${reasons.map(r => `${r} (${REASONS[r]})`).join(', ')}, so only these ${b.entries.length} items went to them.`)}
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
          <div key={it.id} className="kb-tile grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[minmax(0,1fr)_230px]">
            <div className="flex min-w-0 gap-3">
              <button className={cn('mt-0.5 grid size-5 flex-none place-items-center rounded-md border-2 transition-colors', ok ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-4')} onClick={() => canConfirm && actions.confirm(it.id, pid)} aria-label={L('确认', 'Confirm')}>
                {ok && <MorphIcon icon={Check} size={12} strokeWidth={3} />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="bg-primary/10 text-primary grid size-5 place-items-center rounded-full text-[11px] font-semibold">{i + 1}</span><b className="text-[14.5px]">{visibility(it, pid) === 'redacted' ? it.redacted : it.title}</b></div>
                <p className="text-ink-2 mt-1 text-[13px] leading-relaxed">{e?.forYou ?? it.detail ?? (it.flags?.length ? L(`会上没定：${it.flags.join('、')}${it.suggestedOwner ? `。建议 ${personById(it.suggestedOwner).name}。` : '。'}`, `Not settled in the meeting: ${it.flags.join(', ')}${it.suggestedOwner ? `. Suggested: ${personById(it.suggestedOwner).name}.` : '.'}`) : '')}</p>
                <button className="text-primary mt-1.5 inline-flex items-center gap-0.5 text-[12.5px] hover:underline" onClick={() => onItem(it)}>{L('查看原话', 'See quote')} {mmss(quoteSpan(it).t0)} <ChevronRight size={13} /></button>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t pt-3 text-[12.5px] md:border-t-0 md:border-l md:pt-0 md:pl-4">
              <div className="flex items-center justify-between gap-2">
                {it.due ? <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-600"><Clock3 size={12} /> {L(`${dueText(it.due)} 截止`, `Due ${dueText(it.due)}`)}</span> : <span className="text-ink-3">{L('没有截止时间', 'No due date')}</span>}
                <span className={cn('rounded-md px-1.5 py-0.5', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{ok ? L('已确认', 'Confirmed') : L('待处理', 'Pending')}</span>
              </div>
              <div className="text-ink-3 flex items-center gap-1.5">{L('来自', 'From')} <Face p={seg.speaker} size={18} /><span className="text-ink-2">{personById(seg.speaker).name}</span><span>{personById(seg.speaker).role}</span></div>
              <div className="text-ink-3 flex items-center gap-1.5">{L('来源议题', 'Topic')} <span className="text-ink-2 inline-flex items-center gap-1"><Kb name={TOPIC_ICON[it.topic] ?? 'signpost'} size={15} />{it.topic}</span></div>
              {owner && <div className="text-ink-3 flex items-center gap-1.5">{L('负责人', 'Owner')} <Face p={owner} size={18} /><span className="text-ink-2">{personById(owner).name}</span></div>}
              <div className="mt-auto pt-1">
                {canConfirm && !ok
                  ? <button className="bg-primary w-full rounded-lg py-1.5 text-[13px] font-medium text-white" onClick={() => actions.confirm(it.id, pid)}>{owner ? L('确认收到', 'Got it') : L('我来负责', 'I’ll own it')}</button>
                  : !owner && it.suggestedOwner && pid === m.publisher
                    ? <button className="bg-primary w-full rounded-lg py-1.5 text-[13px] font-medium text-white" onClick={() => actions.assign(it.id, it.suggestedOwner!)}>{L(`指派给${personById(it.suggestedOwner).name}`, `Assign to ${personById(it.suggestedOwner).name}`)}</button>
                    : <button className="text-primary w-full rounded-lg border border-[#C9D8FF] py-1.5 text-[13px]" onClick={() => onItem(it)}>{L('回到录像核对', 'Check in the recording')}</button>}
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
      {groups.map(g => (
        <button key={g.topic + (showMeeting ? g.items[0].meeting : '')} onClick={() => onItem(g.items[0])} className="kb-tile kb-wiggle flex items-start gap-3 rounded-2xl border bg-white p-3.5 text-left">
          <span className="text-ink-2 flex-none"><Kb name={TOPIC_ICON[g.topic] ?? 'signpost'} size={30} /></span>
          <div className="min-w-0">
            <b className="text-[14px]">{g.topic}</b>
            <p className="text-ink-3 mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed">{g.items.map(i => i.title).join(L('；', '; '))}</p>
            {showMeeting && <p className="text-ink-4 mt-1 text-[11.5px]">{[...new Set(g.items.map(i => MEETINGS.find(x => x.id === i.meeting)!.title))].join(L('、', ', '))}</p>}
          </div>
        </button>
      ))}
      {!groups.length && <div className="text-ink-3 text-[13px]">{L('没有相关议题', 'No related topics')}</div>}
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
      <p className="text-ink-3 mb-2 text-[12.5px]">{own.length ? L(`${p.name}在这场会里说了 ${own.length} 段，点时间回到录像`, `${p.name} spoke ${own.length} times in this meeting — click a timestamp to jump to the recording`) : L(`${p.name}没参会。下面是会上和 TA 有关的发言`, `${p.name} wasn’t in the meeting. Here’s what was said about them`)}</p>
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
  if (!items.length) return <Card><span className="text-ink-3 text-[13px]">{L(`${personById(pid).name}最近没有待办。`, `${personById(pid).name} has no recent to-dos.`)}</span></Card>
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
            <SourceChip item={it} className="flex-none">{L('原话', 'Quote')}</SourceChip>
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
    [<CalendarDays size={14} />, L('时间', 'When'), `${cnDate(m.date)} ${weekday(m.date)} ${m.time} · ${L('录像', 'recording')} ${mmss(m.duration)}`],
    [<MapPin size={14} />, L('地点', 'Where'), <span className="inline-flex items-center gap-2">{ex.place}{ex.online && <span className="text-ink-3 inline-flex items-center gap-1"><Video size={13} /> {L('线上', 'Online')}</span>}</span>],
    [<FileText size={14} />, L('类型', 'Type'), ex.kind],
    [<Sparkles size={14} />, L('摘要', 'Summary'), m.summary],
  ]
  return (
    <Card>
      <H icon="calendar" title={L('会议信息', 'Meeting info')} small />
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
  const quietOf = (x: PersonId) => isQuiet(m.id, x)
  return (
    <Card>
      <H icon="team" title={L(`发布者与收到者（${m.related.length}）`, `Publisher & recipients (${m.related.length})`)} small />
      <div className="mt-1 grid grid-cols-4 gap-1.5">
        {m.related.map(x => {
          const pp = personById(x)
          const on = x === pid
          return (
            <button key={x} onClick={() => onPick(x)} className={cn('relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors', on ? 'border-primary bg-[#F3F6FE]' : 'border-transparent hover:bg-black/[.03]')}>
              <span className="relative">
                <Face p={pp} size={36} muted={quietOf(x)} />
                {m.attendees.includes(x) && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" title={L('参会', 'Attended')} />}
              </span>
              <span className={cn('text-[12px] leading-tight', on ? 'text-primary font-semibold' : '')}>{pp.name}</span>
              <RankTag p={pp} short className="text-[10px] leading-[15px]" />
              <span className="text-ink-3 w-full truncate text-center text-[10.5px] leading-tight">{x === m.publisher ? L('发布者', 'Publisher') : quietOf(x) ? L('不打扰', 'Not pinged') : pp.role}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export const KIND: Record<FileKind, { label: string; bg: string }> = {
  doc: { label: 'W', bg: '#2F64F2' }, pdf: { label: 'PDF', bg: '#E5484D' }, xls: { label: 'X', bg: '#1F9D55' }, ppt: { label: 'P', bg: '#E8772E' },
  md: { label: 'MD', bg: '#3F3F46' }, img: { label: 'IMG', bg: '#0891B2' },
}

function Files({ m }: { m: Meeting }) {
  const files = EXTRAS[m.id].files
  return (
    <Card>
      <H icon="document" title={L(`相关文件（${files.length}）`, `Files (${files.length})`)} small />
      <div className="mt-1 flex flex-col gap-1">
        {files.map(f => (
          <a key={f.name} href={f.previewUrl ?? f.url} target="_blank" rel="noreferrer" className={cn('group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-black/[.03]', !f.url && 'pointer-events-none')}>
            {f.kind === 'img' && f.url
              ? <img src={f.url} alt="" className="size-9 flex-none rounded-lg object-cover" />
              : <FileIcon kind={f.kind} />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{f.name}</div>
              <div className="text-ink-3 text-[11.5px]">{personById(f.owner).name} · {f.date}</div>
            </div>
            <span className="text-ink-3 flex-none text-[11.5px]">{f.size}</span>
          </a>
        ))}
      </div>
    </Card>
  )
}

function SendLog({ m, pid }: { m: Meeting; pid: PersonId }) {
  const dispatched = useStore(s => s.dispatched[m.id])
  const events = useStore(s => s.events.filter(e => e.meeting === m.id && e.person === pid && e.kind !== 'sent'))
  const ex = EXTRAS[m.id]
  const quiet = isQuiet(m.id, pid)
  const read = ex.readAt[pid]
  const live = m.id === RUN_ID
  return (
    <Card>
      <H icon="mailbox" title={L('发送记录', 'Delivery log')} small />
      {!dispatched ? <p className="text-ink-3 mt-1 text-[12.5px]">{L('还没分发。', 'Not sent yet.')}</p> : (
        <ol className="relative mt-2 flex flex-col gap-3 pl-6 text-[12.5px]">
          <span className="bg-border absolute top-2 bottom-2 left-[9px] w-px" />
          <Li icon={<Send size={11} />} tone="bg-emerald-500" title={quiet ? L('只进日报', 'Digest only') : L('已发送', 'Sent')} sub={`${live ? L('刚刚', 'just now') : ex.sentAt} · ${quiet ? L('日报', 'Daily digest') : personById(pid).profile.channels.join(' + ')}`} />
          {!quiet && (read && !live
            ? <Li icon={<Eye size={11} />} tone="bg-primary" title={L('对方已读', 'Read')} sub={read} />
            : <Li icon={<Eye size={11} />} tone="bg-ink-4" title={L('还没读', 'Not read yet')} sub={L('读了会显示在这里', 'It’ll show here once they read it')} />)}
          {events.map(e => (
            <Li key={e.id} icon={<CheckCircle2 size={11} />} tone={e.kind === 'ask' ? 'bg-amber-500' : 'bg-emerald-500'} title={e.kind === 'ask' ? L(`追问：${e.text}`, `Asked: ${e.text}`) : e.kind === 'confirm' ? L('确认了待办', 'Confirmed a to-do') : e.text ?? ''} sub={e.when} />
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
            <b className="font-medium">{L('王珂', 'Wang Ke')}</b> {L('备注：', 'note: ')}{n}
          </motion.div>
        ))}
      </AnimatePresence>
      <form className="flex items-center gap-2 rounded-2xl border bg-white p-1.5 pl-3 shadow-[0_6px_20px_-12px_rgba(0,0,0,.2)]" onSubmit={e => { e.preventDefault(); if (draft.trim()) { setNotes(n => [...n, draft.trim()]); setDraft('') } }}>
        <Paperclip size={15} className="text-ink-3" />
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={L(`给${name}的简报加备注、@同事，或向 AI 提问…`, `Add a note to ${name}’s brief, @ a colleague, or ask AI…`)} className="placeholder:text-ink-3 h-8 flex-1 bg-transparent text-[13.5px] outline-none" />
        <button type="button" className="text-ink-2 hidden items-center gap-1 rounded-lg border px-2 py-1 text-[12.5px] sm:inline-flex"><AtSign size={13} /> {L('提及', 'Mention')}</button>
        <button type="button" className="text-primary hidden items-center gap-1 rounded-lg border border-[#C9D8FF] px-2 py-1 text-[12.5px] sm:inline-flex"><Sparkles size={13} /> {L('AI 帮我写', 'Write with AI')}</button>
        <button className={cn('grid size-8 place-items-center rounded-xl text-white', draft.trim() ? 'bg-primary' : 'bg-[#D7DCE6]')} aria-label={L('发送', 'Send')}><Send size={14} /></button>
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

