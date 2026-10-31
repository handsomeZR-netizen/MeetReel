import { motion } from 'motion/react'
import { Check, CircleCheck, Clock3, Lock, Quote, X } from 'lucide-react'
import {
  ITEMS, ITEM_TYPES, PEOPLE, QUIET_AT, REASONS, REASON_SHORT, ROUTES, SENT_AT, T_END,
  briefOf, clamp01, personById, type Item, type Person, type PersonId,
} from '../data/demo'
import { Avatar } from './Avatar'

export type Focus = { kind: 'item'; id: string } | { kind: 'person'; id: PersonId } | null

const ITEM_H = 60
const ITEM_GAP = 8
const PERSON_H = 68
const PERSON_GAP = 10
const LINES_W = 132

/** 收件人排列顺序：主持人在上，未打扰的人在最下面，中间按连线少交叉排 */
const PERSON_ORDER: PersonId[] = ['wangke', 'sunyue', 'linzong', 'zhaoyi', 'lilin', 'chenmo', 'zhouning', 'wutong']

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

interface Props {
  t: number
  focus: Focus
  onFocus: (f: Focus) => void
  onOpen: (id: PersonId) => void
}

export function RoutingBoard({ t, focus, onFocus, onOpen }: Props) {
  const done = t >= T_END
  const routed = ROUTES.filter(r => r.at <= t)
  const appeared = ITEMS.filter(i => t >= i.appearAt).length
  const extracting = t >= 4.45 && t < 9.65

  const lit = (r: { item: string; person: PersonId }) =>
    !focus || (focus.kind === 'item' ? focus.id === r.item : focus.id === r.person)
  const itemLit = (id: string) =>
    !focus || (focus.kind === 'item' ? focus.id === id : ROUTES.some(r => r.person === focus.id && r.item === id) || personById(focus.id).host === true)
  const personLit = (id: PersonId) =>
    !focus || (focus.kind === 'person' ? focus.id === id : ROUTES.some(r => r.item === focus.id && r.person === id) || personById(id).host === true)

  return (
    <section className="card board" id="board">
      <header className="board-head">
        <div>
          <h2 className="card-title">会议账本 → 收件人</h2>
          <p className="card-sub">推送看相关，可见看权限。每条推送都写明“为什么发给你”。</p>
        </div>
        <div className="board-kpis">
          <Kpi value={appeared} label="条目" />
          <Kpi value={routed.length} label="条推送" />
          <Kpi value={t >= SENT_AT ? 7 : 0} label="份简报已送达" />
        </div>
      </header>

      <div className="board-cols-head">
        <span>会议账本 · {appeared}/{ITEMS.length}</span>
        <span />
        <span>收件人 · {PEOPLE.length}</span>
      </div>

      <div className="board-grid" style={{ gridTemplateColumns: `minmax(0,1fr) ${LINES_W}px 288px`, height: COL_H }}>
        <div className="ledger">
          {ITEMS.map(item => (
            <ItemSlot
              key={item.id}
              item={item}
              t={t}
              extracting={extracting}
              lit={itemLit(item.id)}
              recipients={routed.filter(r => r.item === item.id).length}
              onEnter={() => onFocus({ kind: 'item', id: item.id })}
              onLeave={() => onFocus(null)}
            />
          ))}
        </div>

        <svg className="lines" width={LINES_W} height={COL_H}>
          {routed.map(r => {
            const i = ITEMS.findIndex(it => it.id === r.item)
            const j = PERSON_ORDER.indexOf(r.person)
            const y1 = itemY(i)
            const y2 = personY(j)
            const d = `M 0 ${y1} C ${LINES_W * 0.55} ${y1}, ${LINES_W * 0.45} ${y2}, ${LINES_W} ${y2}`
            const p = clamp01((t - r.at) / 0.55)
            const color = ITEM_TYPES[ITEMS[i].type].color
            const strong = r.reasons.includes('R4')
            const on = lit(r)
            const [bx, by] = bezier(p, y1, y2)
            return (
              <g key={`${r.item}-${r.person}`} style={{ opacity: on ? 1 : 0.1, transition: 'opacity .2s' }}>
                <path
                  d={d} fill="none" stroke={color}
                  strokeOpacity={focus && on ? 0.9 : strong ? 0.7 : 0.38}
                  strokeWidth={strong || (focus && on) ? 2 : 1.3}
                  pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}
                />
                {p >= 1 && (
                  <path d={d} fill="none" stroke={color} strokeWidth={strong ? 2.4 : 1.8} className="flow" strokeLinecap="round" />
                )}
                {p < 1 && <circle cx={bx} cy={by} r={3.5} fill={color} className="travel" />}
                {p >= 1 && <circle cx={LINES_W} cy={y2} r={2.5} fill={color} />}
              </g>
            )
          })}
        </svg>

        <div className="people" style={{ paddingTop: P_OFF }}>
          {PERSON_ORDER.map(id => (
            <PersonRow
              key={id}
              person={personById(id)}
              t={t}
              done={done}
              lit={personLit(id)}
              onEnter={() => onFocus({ kind: 'person', id })}
              onLeave={() => onFocus(null)}
              onOpen={() => onOpen(id)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <div className="kpi">
      <motion.b key={value} initial={{ y: -6, opacity: 0.3 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
        {value}
      </motion.b>
      <span>{label}</span>
    </div>
  )
}

interface ItemSlotProps {
  item: Item
  t: number
  extracting: boolean
  lit: boolean
  recipients: number
  onEnter: () => void
  onLeave: () => void
}

function ItemSlot({ item, t, extracting, lit, recipients, onEnter, onLeave }: ItemSlotProps) {
  const ty = ITEM_TYPES[item.type]
  if (t < item.appearAt) {
    return (
      <div className={`slot ${extracting ? 'slot--busy' : ''}`} style={{ height: ITEM_H }}>
        <span className="mono">{item.id}</span>
      </div>
    )
  }
  const failed = item.failAt !== undefined && t >= item.failAt && t < (item.fixAt ?? Infinity)
  const checked = t >= item.checkAt
  const restricted = item.sensitivity === 'restricted' && checked
  const flags = checked ? item.flags ?? [] : []
  const owner = item.owner ? personById(item.owner) : null
  const speaker = personById(item.speaker)

  return (
    <motion.div
      className={`item ${failed ? 'item--fail' : ''} ${lit ? '' : 'item--dim'}`}
      style={{ height: ITEM_H, ['--c' as string]: ty.color, ['--soft' as string]: ty.soft }}
      initial={{ opacity: 0, x: -18, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="item-main">
        <div className="item-row1">
          <span className="type-pill">{ty.label}</span>
          <span className="item-title">{item.title}</span>
          {restricted && <span className="lock-pill"><Lock size={11} /> 受限</span>}
        </div>
        <div className="item-row2">
          {failed ? (
            <span className="item-fail-msg"><X size={12} strokeWidth={3} /> 原话“{item.badQuote}”不在转写里，已打回抽取官</span>
          ) : (
            <>
              {owner ? (
                <span className="meta"><Avatar person={owner} size={16} />{owner.name}{item.ownerBasis ? ` · ${item.ownerBasis}` : ''}</span>
              ) : flags.includes('缺负责人') ? (
                <span className="flag">缺负责人</span>
              ) : null}
              {item.due ? (
                <span className="meta"><Clock3 size={12} />{item.due}</span>
              ) : flags.includes('缺截止') ? (
                <span className="flag">缺截止</span>
              ) : null}
              <span className="meta quote"><Quote size={11} />{item.quote}<em>{speaker.name} {item.at}</em></span>
            </>
          )}
        </div>
      </div>
      <div className="item-side">
        {failed ? (
          <span className="status status--fail"><X size={12} strokeWidth={3} /></span>
        ) : checked ? (
          <motion.span className="status status--ok" initial={{ scale: 0.4 }} animate={{ scale: 1 }}><Check size={12} strokeWidth={3} /></motion.span>
        ) : (
          <span className="status status--wait" />
        )}
        {recipients > 0 && <span className="recip">→ {recipients}</span>}
      </div>
    </motion.div>
  )
}

interface PersonRowProps {
  person: Person
  t: number
  done: boolean
  lit: boolean
  onEnter: () => void
  onLeave: () => void
  onOpen: () => void
}

function PersonRow({ person, t, done, lit, onEnter, onLeave, onOpen }: PersonRowProps) {
  const mine = ROUTES.filter(r => r.person === person.id && r.at <= t)
  const reasons = [...new Set(mine.flatMap(r => r.reasons))].sort()
  const quiet = person.id === 'wutong' && t >= QUIET_AT
  const host = person.host === true
  const count = host ? ITEMS.filter(i => t >= i.appearAt).length : mine.length
  const brief = briefOf(person.id)
  const ready = !quiet && brief.editAt > 0 && t >= brief.editAt
  const sent = ready && t >= SENT_AT
  const restricted = mine.some(r => r.item === 'it_07')
  const lastHit = mine.length ? mine[mine.length - 1].at : -1
  const flash = t - lastHit < 0.6

  return (
    <motion.button
      type="button"
      className={`person ${quiet ? 'person--quiet' : ''} ${lit ? '' : 'person--dim'} ${done ? 'person--open' : ''} ${flash ? 'person--flash' : ''}`}
      style={{ height: PERSON_H }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={done ? onOpen : undefined}
      layout
    >
      <Avatar person={person} size={34} muted={quiet} />
      <div className="person-main">
        <div className="person-name">
          {person.name}
          <span className={`att ${person.present ? 'att--in' : ''}`}>{person.present ? '参会' : '缺席'}</span>
        </div>
        <div className="person-tags">
          {quiet ? (
            <span className="quiet-tag">本场没有必读，不打扰</span>
          ) : host ? (
            <span className="tag tag--host">主持人版</span>
          ) : reasons.length ? (
            reasons.map(r => (
              <motion.span key={r} className={`tag ${r === 'R4' ? 'tag--r4' : ''}`} title={REASONS[r]} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                {r} {REASON_SHORT[r]}
              </motion.span>
            ))
          ) : (
            <span className="person-role">{person.role}</span>
          )}
        </div>
      </div>
      <div className="person-side">
        {quiet ? (
          <span className="zero">0</span>
        ) : (
          <motion.b key={count} initial={{ scale: 1.5, color: '#2563EB' }} animate={{ scale: 1, color: '#17171A' }} transition={{ duration: 0.35 }}>
            {count}
          </motion.b>
        )}
        <small>{host ? '全量' : restricted ? <><Lock size={10} /> 含受限</> : '必读'}</small>
      </div>
      {sent && (
        <motion.span className="sent" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
          <CircleCheck size={15} />
        </motion.span>
      )}
    </motion.button>
  )
}
