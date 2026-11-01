// 会议账本 → 收件人：条目逐条长出来，路由官判定后连线流向每个人；悬停任一端只看它的连线。
import { useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { Check, CircleCheck, Clock3, Lock, Quote, X } from 'lucide-react'
import { ITEM_TYPES, REASONS, REASON_SHORT, personById, term, type PersonId } from '@/data/model'
import type { Item } from '@/data/meetings'
import { mmss, quoteSpan } from '@/data/derive'
import { ITEM_RUN, QUIET_AT, RUN_MEETING, RUN_PEOPLE, SENT_AT, T_END, clamp01, isQuietIn, runBrief } from '@/data/run'
import { cn } from '@/lib/utils'
import { Face, RankTag } from '@/components/common/bits'
import { L } from '@/lib/i18n'

type Focus = { kind: 'item'; id: string } | { kind: 'person'; id: PersonId } | null

const ITEMS = RUN_MEETING.items
const ROUTES = RUN_MEETING.routes
const ITEM_H = 52
const ITEM_GAP = 6
const PERSON_H = 64
const PERSON_GAP = 10
const LINES_W = 120
const PERSON_W = 236

/** 收件人排列：发布者在上，不打扰的人在最下面 */
const PERSON_ORDER: PersonId[] = RUN_PEOPLE
const PUB = RUN_MEETING.publisher
const COL_H = ITEMS.length * ITEM_H + (ITEMS.length - 1) * ITEM_GAP
const P_COL_H = PERSON_ORDER.length * PERSON_H + (PERSON_ORDER.length - 1) * PERSON_GAP
const P_OFF = (COL_H - P_COL_H) / 2
const itemY = (i: number) => i * (ITEM_H + ITEM_GAP) + ITEM_H / 2
const personY = (j: number) => P_OFF + j * (PERSON_H + PERSON_GAP) + PERSON_H / 2

function bezier(p: number, y1: number, y2: number) {
  const P = [[0, y1], [LINES_W * 0.55, y1], [LINES_W * 0.45, y2], [LINES_W, y2]]
  const u = 1 - p
  const c = [u * u * u, 3 * u * u * p, 3 * u * p * p, p * p * p]
  return [c.reduce((s, k, i) => s + k * P[i][0], 0), c.reduce((s, k, i) => s + k * P[i][1], 0)]
}

export function RoutingBoard({ t, onOpen }: { t: number; onOpen: (id: PersonId) => void }) {
  const [focus, setFocus] = useState<Focus>(null)
  const done = t >= T_END
  const routed = ROUTES.filter(r => (r.at ?? 0) <= t)
  const extracting = t >= 4.45 && t < 9.65

  const lit = (r: { item: string; person: PersonId }) => !focus || (focus.kind === 'item' ? focus.id === r.item : focus.id === r.person)
  const itemLit = (id: string) => !focus || (focus.kind === 'item' ? focus.id === id : ROUTES.some(r => r.person === focus.id && r.item === id) || focus.id === PUB)
  const personLit = (id: PersonId) => !focus || (focus.kind === 'person' ? focus.id === id : ROUTES.some(r => r.item === focus.id && r.person === id) || id === PUB)

  return (
    <div>
      <div className="text-ink-3 mb-2 grid text-[11.5px] font-semibold tracking-wide" style={{ gridTemplateColumns: `minmax(0,1fr) ${LINES_W}px ${PERSON_W}px` }}>
        <span>{L('会议账本', 'Meeting ledger')} · {ITEMS.filter(i => t >= ITEM_RUN[i.id].appearAt).length}/{ITEMS.length}</span>
        <span />
        <span>{L('收到者', 'Recipients')} · {PERSON_ORDER.length}</span>
      </div>
      <div className="rb-grid" style={{ gridTemplateColumns: `minmax(0,1fr) ${LINES_W}px ${PERSON_W}px`, height: COL_H }}>
        <div className="rb-ledger">
          {ITEMS.map(item => (
            <ItemSlot
              key={item.id}
              item={item}
              t={t}
              extracting={extracting}
              lit={itemLit(item.id)}
              recipients={routed.filter(r => r.item === item.id).length}
              onEnter={() => setFocus({ kind: 'item', id: item.id })}
              onLeave={() => setFocus(null)}
            />
          ))}
        </div>

        <svg width={LINES_W} height={COL_H} className="overflow-visible">
          {routed.map(r => {
            const i = ITEMS.findIndex(it => it.id === r.item)
            const j = PERSON_ORDER.indexOf(r.person)
            const y1 = itemY(i)
            const y2 = personY(j)
            const d = `M 0 ${y1} C ${LINES_W * 0.55} ${y1}, ${LINES_W * 0.45} ${y2}, ${LINES_W} ${y2}`
            const p = clamp01((t - (r.at ?? 0)) / 0.55)
            const color = ITEM_TYPES[ITEMS[i].type].color
            const strong = r.reasons.includes('R4')
            const on = lit(r)
            const [bx, by] = bezier(p, y1, y2)
            return (
              <g key={`${r.item}-${r.person}`} style={{ opacity: on ? 1 : 0.08, transition: 'opacity .2s' }}>
                <path d={d} fill="none" stroke={color} strokeOpacity={focus && on ? 0.9 : strong ? 0.7 : 0.38} strokeWidth={strong || (focus && on) ? 2 : 1.3} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
                {p >= 1 && <path d={d} fill="none" stroke={color} strokeWidth={strong ? 2.4 : 1.8} className="rb-flow" strokeLinecap="round" />}
                {p < 1 && <circle cx={bx} cy={by} r={3.5} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />}
                {p >= 1 && <circle cx={LINES_W} cy={y2} r={2.5} fill={color} />}
              </g>
            )
          })}
        </svg>

        <div className="rb-people" style={{ paddingTop: P_OFF }}>
          {PERSON_ORDER.map(id => (
            <PersonRow key={id} id={id} t={t} done={done} lit={personLit(id)} onEnter={() => setFocus({ kind: 'person', id })} onLeave={() => setFocus(null)} onOpen={() => onOpen(id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ItemSlot({ item, t, extracting, lit, recipients, onEnter, onLeave }: { item: Item; t: number; extracting: boolean; lit: boolean; recipients: number; onEnter: () => void; onLeave: () => void }) {
  const run = ITEM_RUN[item.id]
  const ty = ITEM_TYPES[item.type]
  if (t < run.appearAt) return <div className={cn('rb-slot', extracting && 'busy')} style={{ height: ITEM_H }}>{item.id}</div>
  const failed = run.failAt !== undefined && t >= run.failAt && t < (run.fixAt ?? Infinity)
  const checked = t >= run.checkAt
  const flags = checked ? item.flags ?? [] : []
  const owner = item.owner ? personById(item.owner) : null
  const { t0, seg } = quoteSpan(item)
  return (
    <motion.div
      className={cn('rb-item', failed && 'fail', !lit && 'dim')}
      style={{ height: ITEM_H, ['--c' as string]: ty.color }}
      initial={{ opacity: 0, x: -18, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="min-w-0 flex-1">
        <div className="rb-row1">
          <span className="type-pill" style={{ '--c': ty.color, '--soft': ty.soft } as CSSProperties}>{ty.label}</span>
          <span className="rb-title">{item.title}</span>
          {item.sensitivity === 'restricted' && checked && <span className="rb-lock"><Lock size={11} /> {L('受限', 'Restricted')}</span>}
        </div>
        <div className="rb-row2">
          {failed ? (
            <span className="inline-flex items-center gap-1 font-medium text-rose-600"><X size={12} strokeWidth={3} /> {L(`原话“${run.badQuote}”不在转写里，已打回`, `Quote “${run.badQuote}” isn’t in the transcript — sent back`)}</span>
          ) : (
            <>
              {owner ? <span className="rb-meta"><Face p={owner} size={16} />{owner.name}{item.ownerBasis ? ` · ${item.ownerBasis}` : ''}</span> : flags.includes(term('缺负责人')) ? <span className="rb-flag">{term('缺负责人')}</span> : null}
              {item.due ? <span className="rb-meta"><Clock3 size={12} />{item.due}</span> : flags.includes(term('缺截止')) ? <span className="rb-flag">{term('缺截止')}</span> : null}
              <span className="rb-meta rb-quote"><Quote size={11} className="flex-none" />{item.quote}<em>{personById(seg.speaker).name} {mmss(t0)}</em></span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1">
        {failed ? <span className="rb-status fail"><X size={12} strokeWidth={3} /></span>
          : checked ? <motion.span className="rb-status ok" initial={{ scale: 0.4 }} animate={{ scale: 1 }}><Check size={12} strokeWidth={3} /></motion.span>
          : <span className="rb-status wait" />}
        {recipients > 0 && <span className="rb-recip">→ {recipients}</span>}
      </div>
    </motion.div>
  )
}

function PersonRow({ id, t, done, lit, onEnter, onLeave, onOpen }: { id: PersonId; t: number; done: boolean; lit: boolean; onEnter: () => void; onLeave: () => void; onOpen: () => void }) {
  const person = personById(id)
  const mine = ROUTES.filter(r => r.person === id && (r.at ?? 0) <= t)
  const reasons = [...new Set(mine.flatMap(r => r.reasons))].sort()
  const quiet = isQuietIn(id) && t >= QUIET_AT
  const host = id === PUB
  const count = host ? ITEMS.filter(i => t >= ITEM_RUN[i.id].appearAt).length : mine.length
  const brief = runBrief(id)
  const ready = !quiet && (brief.editAt ?? 0) > 0 && t >= (brief.editAt ?? 0)
  const sent = ready && t >= SENT_AT
  const restricted = mine.some(r => ITEMS.find(i => i.id === r.item)?.sensitivity === 'restricted')
  const lastHit = mine.length ? mine[mine.length - 1].at ?? -1 : -1
  const flash = t - lastHit < 0.6
  const openable = done || ready || quiet
  return (
    <motion.button
      type="button"
      className={cn('rb-person', quiet && 'quiet', !lit && 'dim', openable && 'open', flash && 'flash')}
      style={{ height: PERSON_H }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={openable ? onOpen : undefined}
      layout
    >
      <Face p={person} size={32} muted={quiet} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
          {person.name}
          <RankTag p={person} />
        </div>
        <div className="mt-1 flex gap-1 overflow-hidden">
          {quiet ? <span className="text-ink-3 text-[11.5px]">{L('本场没有必读，不打扰', 'Nothing must-read — no ping')}</span>
            : host ? <span className="rb-tag host">{L('发布者版', 'Publisher version')}</span>
            : reasons.length ? reasons.map(r => (
              <motion.span key={r} className={cn('rb-tag', r === 'R4' && 'r4')} title={REASONS[r]} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{r} {REASON_SHORT[r]}</motion.span>
            )) : <span className="text-ink-3 text-[12px]">{person.role}</span>}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end">
        {quiet ? <span className="text-ink-4 text-xl leading-none font-semibold">0</span>
          : <motion.b key={count} className="text-xl leading-none" initial={{ scale: 1.5, color: '#2F64F2' }} animate={{ scale: 1, color: '#17171A' }} transition={{ duration: 0.35 }}>{count}</motion.b>}
        <small className="text-ink-3 mt-1 inline-flex items-center gap-0.5 text-[10.5px]">{host ? L('全量', 'Everything') : restricted ? <><Lock size={10} /> {L('含受限', 'Restricted')}</> : L('必读', 'Must-read')}</small>
      </div>
      {sent && <motion.span className="rb-sent" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}><CircleCheck size={15} /></motion.span>}
    </motion.button>
  )
}
