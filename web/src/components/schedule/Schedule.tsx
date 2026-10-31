// 我的日程：会议和待办放在同一张日历上。
// 会议是项目色的块，待办是带状态圈的条目；点状态圈改状态，点条目回到会上说这句话的那一秒。
// 缺截止的待办进右侧“未排期”，AI 给出建议日期和依据，接受后落到日历上。
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Flag, Sparkles, Waypoints } from 'lucide-react'
import { RANKS, personById, projectById, type PersonId } from '@/data/model'
import { type Meeting } from '@/data/meetings'
import { itemTime, outboxOf } from '@/data/derive'
import {
  NEXT_STATUS, STATUS, SUGGEST, TODAY, addDays, addMonths, dayNum, md, meetingsOf, milestonesOf, monthGrid, monthOf, statusOf, todoKey, todosOf, weekDays,
  type MeetingEntry, type TodoEntry, type TodoStatus,
} from '@/data/schedule'
import { actions, useStore } from '@/lib/store'
import { go, goSource, href } from '@/lib/router'
import { cn } from '@/lib/utils'
import { Face } from '@/components/common/bits'

const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日']

export function StatusIcon({ s, size = 14 }: { s: TodoStatus; size?: number }) {
  const c = STATUS[s].color
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      {s === 'done' ? (
        <>
          <circle cx="7" cy="7" r="6.25" fill={c} />
          <path d="M4.3 7.2l2 2 3.5-3.9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="7" cy="7" r="5.75" stroke={c} strokeWidth="1.5" strokeDasharray={s === 'triage' ? '2.2 2' : undefined} />
          {s === 'doing' && <path d="M7 3.6a3.4 3.4 0 0 1 0 6.8z" fill={c} />}
        </>
      )}
    </svg>
  )
}

/** 状态圈：点一下往后推一格 */
function StatusButton({ id, s }: { id: string; s: TodoStatus }) {
  const next = NEXT_STATUS[s]
  return (
    <button
      className="grid size-[18px] flex-none place-items-center rounded-full hover:bg-black/[.06]"
      title={`${STATUS[s].label} · 点一下改成「${STATUS[next].label}」`}
      onClick={e => { e.stopPropagation(); actions.setStatus(id, next) }}
    >
      <StatusIcon s={s} />
    </button>
  )
}

function useTodoState(pid: PersonId) {
  const owners = useStore(s => s.owners)
  const dispatched = useStore(s => s.dispatched)
  const due = useStore(s => s.due)
  const confirmed = useStore(s => s.confirmed)
  const done = useStore(s => s.done)
  const doing = useStore(s => s.doing)
  const todos = useMemo(() => todosOf(pid, { owners, dispatched, due }), [pid, owners, dispatched, due])
  const status = useCallback((id: string) => statusOf(id, { confirmed, done, doing }), [confirmed, done, doing])
  return { todos, dispatched, status }
}

// ---------------- 待办条 ----------------

function TodoChip({ e, s, compact }: { e: TodoEntry; s: TodoStatus; compact?: boolean }) {
  const overdue = e.due.kind === 'date' && e.due.date < TODAY && s !== 'done'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => goSource(e.item.meeting, Math.max(0, itemTime(e.item) - 0.4), e.item.id)}
      onKeyDown={k => { if (k.key === 'Enter') goSource(e.item.meeting, Math.max(0, itemTime(e.item) - 0.4), e.item.id) }}
      title={`${todoKey(e.item.id)} · ${e.item.title}\n${e.due.label} 截止 · 来自「${e.meeting.title}」\n点一下回到原话`}
      className={cn(
        'flex cursor-pointer items-start gap-1 rounded-lg border bg-white px-1 py-1 text-left transition-colors hover:border-[#C9D8FF] hover:bg-[#F6F9FF]',
        s === 'triage' && 'border-dashed border-amber-300 bg-amber-50/50',
        overdue && 'border-rose-300 bg-rose-50/60',
        s === 'done' && 'opacity-55',
      )}
    >
      <StatusButton id={e.item.id} s={s} />
      <span className="min-w-0 flex-1">
        <span className={cn('block leading-snug', compact ? 'truncate text-[11.5px]' : 'line-clamp-2 text-[12px]', s === 'done' && 'line-through')}>{e.item.title}</span>
        {!compact && (
          <span className="text-ink-3 mt-0.5 block truncate text-[10.5px]">
            <span className="font-mono">{todoKey(e.item.id)}</span>
            {e.due.kind === 'date' && e.due.follows ? <> · {e.due.label}</> : null}
            {overdue ? <span className="text-rose-600"> · 已逾期</span> : null}
          </span>
        )}
      </span>
    </div>
  )
}

// ---------------- 会议块 ----------------

function MeetingBlock({ e, compact }: { e: MeetingEntry; compact?: boolean }) {
  const m = e.meeting
  const p = projectById(m.project)
  const dispatched = useStore(s => !!s.dispatched[m.id])
  const pub = personById(m.publisher)
  if (compact) {
    return (
      <a href={href(`/m/${m.id}`)} className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11.5px] hover:brightness-95" style={{ background: p.soft }} title={m.title}>
        <span className="size-1.5 flex-none rounded-full" style={{ background: p.color }} />
        <span className="truncate">{m.time} {m.title.replace(/ · .*/, '')}</span>
      </a>
    )
  }
  return (
    <a href={href(`/m/${m.id}`)} className="block rounded-lg px-2 py-1.5 transition-[filter] hover:brightness-95" style={{ background: p.soft, boxShadow: `inset 3px 0 0 ${p.color}` }} title={m.title}>
      <span className="flex items-center gap-1 text-[10.5px]">
        <b className="font-mono" style={{ color: p.color }}>{m.time}</b>
        <span className="ml-auto rounded px-1 leading-[15px]" style={{ color: p.color, background: 'rgba(255,255,255,.7)' }}>{e.role === 'publisher' ? '我发布' : '收到'}</span>
      </span>
      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug font-medium">{m.title.replace(/ · .*/, '')}</span>
      <span className="text-ink-3 mt-0.5 block truncate text-[10.5px]">
        {dispatched ? <>{pub.name} 发布 · {RANKS[pub.rank].level}</> : <span className="font-medium text-amber-700">已转写 · 待分发</span>}
      </span>
    </a>
  )
}

// ---------------- 日历 ----------------

export function Schedule({ as, side }: { as: PersonId; side?: ReactNode }) {
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [cursor, setCursor] = useState(TODAY)
  const { todos, dispatched, status } = useTodoState(as)

  const meetings = useMemo(() => meetingsOf(as), [as])
  const days = mode === 'week' ? weekDays(cursor) : monthGrid(cursor)
  const first = days[0], last = days[days.length - 1]
  const months = new Set(days.map(monthOf))
  const milestones = milestonesOf(as).filter(x => months.has(x.due.month))

  const byDay = useMemo(() => {
    const map = new Map<string, { meetings: MeetingEntry[]; todos: TodoEntry[] }>()
    const at = (d: string) => { if (!map.has(d)) map.set(d, { meetings: [], todos: [] }); return map.get(d)! }
    for (const e of meetings) at(e.date).meetings.push(e)
    for (const e of todos) if (e.due.kind === 'date') at(e.due.date).todos.push(e)
    for (const v of map.values()) {
      v.meetings.sort((a, b) => a.meeting.time.localeCompare(b.meeting.time))
      v.todos.sort((a, b) => Number(status(a.item.id) === 'done') - Number(status(b.item.id) === 'done'))
    }
    return map
  }, [meetings, todos, status])

  const unscheduled = todos.filter(e => e.due.kind !== 'date' && status(e.item.id) !== 'done')
  const pending = outboxOf(as).filter(m => !dispatched[m.id])
  const shift = (n: number) => setCursor(c => (mode === 'week' ? addDays(c, 7 * n) : addMonths(c, n)))

  const title = mode === 'week'
    ? `${md(first)} – ${md(last)}`
    : `${cursor.slice(0, 4)} 年 ${Number(cursor.slice(5, 7))} 月`

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3">
        {pending.map(m => <PendingBar key={m.id} m={m} />)}

        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-semibold tabular-nums">{title}</h2>
          {mode === 'week' && <span className="text-ink-3 text-[12.5px]">{cursor.slice(0, 4)}</span>}
          <div className="ml-1 flex items-center gap-0.5">
            <button className="grid size-7 place-items-center rounded-lg border bg-white hover:bg-black/[.03]" onClick={() => shift(-1)} aria-label="上一页"><ChevronLeft size={15} /></button>
            <button className="h-7 rounded-lg border bg-white px-2 text-[12.5px] hover:bg-black/[.03]" onClick={() => setCursor(TODAY)}>今天</button>
            <button className="grid size-7 place-items-center rounded-lg border bg-white hover:bg-black/[.03]" onClick={() => shift(1)} aria-label="下一页"><ChevronRight size={15} /></button>
          </div>
          <div className="ml-auto flex rounded-lg border bg-white p-0.5 text-[12.5px]">
            {(['week', 'month'] as const).map(k => (
              <button key={k} onClick={() => setMode(k)} className={cn('h-6 rounded-md px-2.5 transition-colors', mode === k ? 'bg-ink text-white' : 'text-ink-2 hover:bg-black/[.04]')}>{k === 'week' ? '周' : '月'}</button>
            ))}
          </div>
        </div>

        {milestones.map(({ item, due }) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border border-[#D9DEFF] bg-[#F4F5FF] px-3 py-1.5 text-[12.5px]">
            <Flag size={13} className="flex-none text-[#4F46E5]" />
            <b className="font-medium text-[#3730A3]">{due.label}</b>
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {item.owner && <span className="text-ink-3 flex flex-none items-center gap-1"><Face p={item.owner} size={18} />{personById(item.owner).name}</span>}
          </div>
        ))}

        {mode === 'week'
          ? <WeekGrid days={days} byDay={byDay} status={status} />
          : <MonthGrid days={days} month={monthOf(cursor)} byDay={byDay} status={status} onPick={d => { setCursor(d); setMode('week') }} />}

        <Legend />
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        {side}
        <Unscheduled list={unscheduled} status={status} />
      </aside>
    </div>
  )
}

type DayMap = Map<string, { meetings: MeetingEntry[]; todos: TodoEntry[] }>

function WeekGrid({ days, byDay, status }: { days: string[]; byDay: DayMap; status: (id: string) => TodoStatus }) {
  return (
    <div className="glass-panel grid grid-cols-7 overflow-hidden rounded-2xl border">
      {days.map((d, i) => {
        const v = byDay.get(d)
        const today = d === TODAY
        return (
          <div key={d} className={cn('flex min-h-[360px] min-w-0 flex-col gap-1.5 border-l p-1.5 first:border-l-0', today && 'bg-[#F6F8FF]', i > 4 && !today && 'bg-[#FAFAFB]')}>
            <div className="flex items-center gap-1.5 px-0.5 pb-1">
              <span className="text-ink-3 text-[11.5px]">{WEEK_HEAD[i]}</span>
              <span className={cn('grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[12.5px] font-semibold tabular-nums', today && 'bg-ink text-white')}>{dayNum(d)}</span>
              {dayNum(d) === 1 && <span className="text-ink-3 text-[11px]">{Number(d.slice(5, 7))}月</span>}
            </div>
            {v?.meetings.map(e => <MeetingBlock key={e.meeting.id} e={e} />)}
            {v?.todos.map(e => <TodoChip key={e.item.id} e={e} s={status(e.item.id)} />)}
          </div>
        )
      })}
    </div>
  )
}

function MonthGrid({ days, month, byDay, status, onPick }: { days: string[]; month: string; byDay: DayMap; status: (id: string) => TodoStatus; onPick: (d: string) => void }) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl border">
      <div className="grid grid-cols-7 border-b bg-[#FAFAFB] text-center text-[11.5px]">
        {WEEK_HEAD.map(w => <span key={w} className="text-ink-3 py-1.5">周{w}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map(d => {
          const v = byDay.get(d)
          const ms = v?.meetings ?? [], ts = v?.todos ?? []
          const rows = [...ms.map(e => ({ k: `m${e.meeting.id}`, node: <MeetingBlock e={e} compact /> })), ...ts.map(e => ({ k: e.item.id, node: <TodoChip e={e} s={status(e.item.id)} compact /> }))]
          const today = d === TODAY
          return (
            <div key={d} onClick={() => onPick(d)} className={cn('flex min-h-[104px] min-w-0 cursor-pointer flex-col gap-0.5 border-t border-l p-1 first:border-l-0 [&:nth-child(7n+1)]:border-l-0 hover:bg-black/[.015]', monthOf(d) !== month && 'bg-[#FAFAFB] opacity-60', today && 'bg-[#F6F8FF]')}>
              <span className={cn('mb-0.5 grid h-5 min-w-5 place-items-center self-start rounded-full px-1 text-[11.5px] tabular-nums', today ? 'bg-ink text-white' : 'text-ink-2')}>{dayNum(d)}</span>
              {rows.slice(0, 3).map(r => <div key={r.k} onClick={e => e.stopPropagation()}>{r.node}</div>)}
              {rows.length > 3 && <span className="text-ink-3 px-1 text-[11px]">还有 {rows.length - 3} 项</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="text-ink-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11.5px]">
      {(Object.keys(STATUS) as TodoStatus[]).map(s => <span key={s} className="inline-flex items-center gap-1"><StatusIcon s={s} size={12} />{STATUS[s].label}</span>)}
      <span>点状态圈往后推一格 · 点条目回到会上那句话</span>
    </div>
  )
}

// ---------------- 等你分发 ----------------

function PendingBar({ m }: { m: Meeting }) {
  const p = projectById(m.project)
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#C9D8FF] bg-[#F4F8FF] px-4 py-2.5">
      <span className="live-dot" />
      <span className="min-w-0 flex-1 text-[13.5px]"><b className="font-semibold">{m.title}</b><span className="text-ink-2"> 已转写，等你确认后按人发出去</span><span className="ml-2 rounded-full px-2 py-0.5 text-[11.5px]" style={{ color: p.color, background: p.soft }}>{p.name}</span></span>
      <button className="bg-ink inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white hover:opacity-90" onClick={() => go(`/dispatch/${m.id}`, { run: 1 })}><Waypoints size={14} /> 开始智能分发</button>
    </div>
  )
}

// ---------------- 未排期 ----------------

function Unscheduled({ list, status }: { list: TodoEntry[]; status: (id: string) => TodoStatus }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[17px] font-semibold">未排期</h2>
        <span className="text-ink-3 text-[12.5px]">{list.length} 件 · 还没有截止日期</span>
      </div>
      {list.length ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          {list.map(e => {
            const sug = SUGGEST[e.item.id]
            return (
              <div key={e.item.id} className="flex flex-col gap-1.5 border-b px-3 py-2.5 last:border-0">
                <div className="flex items-start gap-1.5">
                  <StatusButton id={e.item.id} s={status(e.item.id)} />
                  <span className="min-w-0 flex-1 text-[13px] leading-snug">{e.item.title}</span>
                  <span className="text-ink-3 flex-none font-mono text-[11px]">{todoKey(e.item.id)}</span>
                </div>
                {sug ? (
                  <div className="ml-[22px] flex items-center gap-2 rounded-lg border border-dashed border-[#B8C7F5] bg-[#F4F8FF] px-2 py-1.5 text-[12px]">
                    <Sparkles size={12} className="flex-none text-[#2F64F2]" />
                    <span className="min-w-0 flex-1"><b className="font-medium">建议 {md(sug.date)}</b><span className="text-ink-3"> · {sug.why}</span></span>
                    <button className="h-6 flex-none rounded-md bg-[#2F64F2] px-2 text-[12px] text-white hover:opacity-90" onClick={() => actions.schedule(e.item.id, sug.date)}>排上</button>
                  </div>
                ) : (
                  <span className="text-ink-3 ml-[22px] text-[12px]">{e.due.label}</span>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-ink-3 rounded-2xl border border-dashed px-4 py-5 text-[13px]">待办都有日期了。</div>
      )}
    </section>
  )
}
