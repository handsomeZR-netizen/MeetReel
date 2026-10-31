// 手绘路由矩阵“谁收到什么”：行是账本条目，列是人，打勾是推送；影响链（R4）用红圈标出来。
// 传 t 时按编排剧本逐格画出（只用于主案例那场），不传则一次画完。
import { useMemo, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lock } from 'lucide-react'
import { ITEM_TYPES, REASON_SHORT, personById, type PersonId } from '@/data/model'
import type { Item, Meeting } from '@/data/meetings'
import { QUIET_AT, RUN_ID, RUN_PEOPLE, itemState } from '@/data/run'
import { isQuiet } from '@/data/derive'
import { Kb } from '@/components/common/bits'
import { Rough, RoughArrow } from './rough'

const INK = '#1E1E1E'
const PAD = 24
const LBL = 210
const COL = 46
const ROW = 44
const HEAD = 96

interface Props {
  meeting: Meeting
  t?: number
  onOpen?: (id: PersonId) => void
  onItem?: (it: Item) => void
}

export function Matrix({ meeting: m, t = 99, onOpen, onItem }: Props) {
  const live = m.id === RUN_ID && t < 99
  const people = useMemo(() => orderPeople(m), [m])
  const items = m.items
  const routes = m.routes.filter(r => (r.at ?? 0) <= t)
  const routing = !live || t >= 10.3
  const quiet = people.filter(pid => isQuiet(m.id, pid))
  const quietShown = !live || t >= QUIET_AT
  const r4 = m.routes.find(r => r.reasons.includes('R4') && !m.attendees.includes(r.person))
  const lockItem = items.find(i => i.sensitivity === 'restricted')
  const lockN = lockItem?.visibleTo?.length ?? 0
  // 没有影响链时，标出“一句话发给好几个人、理由各不同”的那条
  const fan = r4 ? null : [...new Set(m.routes.map(r => r.item))].map(id => ({ id, rs: m.routes.filter(r => r.item === id) })).filter(x => x.rs.length >= 3).sort((a, b) => b.rs.length - a.rs.length)[0]

  const W = PAD * 2 + LBL + people.length * COL
  const gridH = items.length * ROW
  const H = HEAD + gridH + 120
  const cx = (j: number) => PAD + LBL + j * COL + COL / 2
  const ry = (i: number) => HEAD + i * ROW + ROW / 2
  const r4i = r4 ? items.findIndex(i => i.id === r4.item) : -1
  const r4j = r4 ? people.indexOf(r4.person) : -1

  const visible = (it: Item) => !live || itemState(it, t) !== 'hidden'

  return (
    <div className="overflow-x-auto">
      <div className="sk-board relative rounded-2xl" style={{ width: W, height: H }}>
        <svg className="sk-svg" width={W} height={H}>
          {(!live || t >= 3) && (
            <g>
              {Array.from({ length: items.length + 1 }, (_, i) => (
                <Rough key={'h' + i} shape={{ kind: 'line', x1: PAD, y1: HEAD + i * ROW, x2: PAD + LBL + people.length * COL, y2: HEAD + i * ROW }} opts={{ stroke: '#CFCFCA', strokeWidth: 1, roughness: 0.8 }} draw={0.5} delay={i * 0.03} />
              ))}
              {Array.from({ length: people.length + 1 }, (_, j) => (
                <Rough key={'v' + j} shape={{ kind: 'line', x1: PAD + LBL + j * COL, y1: HEAD - 8, x2: PAD + LBL + j * COL, y2: HEAD + gridH }} opts={{ stroke: '#CFCFCA', strokeWidth: 1, roughness: 0.8 }} draw={0.5} delay={0.3 + j * 0.03} />
              ))}
            </g>
          )}
          {routing && people.map((pid, j) => {
            const p = personById(pid)
            const muted = quiet.includes(pid) && quietShown
            return <Rough key={pid} shape={{ kind: 'ellipse', x: cx(j), y: HEAD - 28, w: 34, h: 34 }} opts={{ stroke: INK, fill: muted ? '#EEEEEA' : p.bg, fillStyle: 'solid', strokeWidth: 1.4 }} draw={0.3} delay={j * 0.05} />
          })}
          {routing && items.map((it, i) => visible(it) && (
            <Rough key={'host' + it.id} shape={{ kind: 'ellipse', x: cx(people.indexOf(m.publisher)), y: ry(i), w: 7, h: 7 }} opts={{ stroke: '#9A9A9A', fill: '#9A9A9A', fillStyle: 'solid', roughness: 0.4 }} draw={0.2} delay={i * 0.02} />
          ))}
          {routes.map((r, k) => {
            const i = items.findIndex(x => x.id === r.item)
            const j = people.indexOf(r.person)
            if (i < 0 || j < 0) return null
            const isR4 = r.reasons.includes('R4')
            const x0 = cx(j) - 9
            const y0 = ry(i)
            return (
              <g key={r.item + r.person}>
                <Rough shape={{ kind: 'path', d: `M${x0},${y0} l6,7 l13,-15` }} opts={{ stroke: isR4 ? '#E03131' : INK, strokeWidth: 2.2, roughness: 0.7 }} draw={0.28} delay={live ? 0 : 0.4 + k * 0.03} />
                {isR4 && <Rough shape={{ kind: 'ellipse', x: cx(j), y: y0, w: 38, h: 34 }} opts={{ stroke: '#E03131', strokeWidth: 1.8, roughness: 1.6 }} draw={0.35} delay={live ? 0.25 : 0.9} />}
              </g>
            )
          })}
          {r4 && r4i >= 0 && (!live || t >= 12) && (
            <RoughArrow
              d={`M${PAD + 250},${HEAD + gridH + 44} C ${PAD + 290},${HEAD + gridH + 8} ${cx(r4j) - 10},${ry(r4i) + 90} ${cx(r4j)},${ry(r4i) + 22}`}
              head={[cx(r4j), ry(r4i) + 22, -Math.PI / 2]}
              opts={{ stroke: '#E03131', strokeWidth: 1.8 }}
              draw={0.6}
              delay={live ? 0 : 1}
            />
          )}
          {quiet.length > 0 && quietShown && (() => {
            const j = people.indexOf(quiet[0])
            return <RoughArrow d={`M${cx(j) - 70},${30} C ${cx(j) - 34},${24} ${cx(j) - 6},${34} ${cx(j)},${HEAD - 50}`} head={[cx(j), HEAD - 50, Math.PI / 2]} opts={{ stroke: '#868E96', strokeWidth: 1.6 }} draw={0.5} delay={live ? 0 : 1.1} />
          })()}
        </svg>

        <div className="sk-mx-title" style={{ left: PAD, top: 26 }}><Kb name="route" size={26} /> 谁收到什么</div>

        {routing && people.map((pid, j) => {
          const p = personById(pid)
          const muted = quiet.includes(pid) && quietShown
          return (
            <motion.button
              key={pid}
              className="sk-mx-face grid size-[34px] place-items-center rounded-full"
              style={{ left: cx(j), top: HEAD - 28, color: muted ? '#ADB5BD' : p.fg, pointerEvents: onOpen ? 'auto' : 'none' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + j * 0.05 }}
              onClick={() => onOpen?.(pid)}
              title={`${p.name} · ${p.role}`}
            >
              {p.short}
            </motion.button>
          )
        })}

        {items.map((it, i) => {
          if (!visible(it)) return null
          const st = live ? itemState(it, t) : 'ok'
          const c = ITEM_TYPES[it.type]
          return (
            <motion.button
              key={it.id}
              className={`sk-mx-row ${st}`}
              style={{ left: PAD, top: ry(i) - 12, width: LBL - 10 }}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: live ? 0 : i * 0.03 }}
              onClick={() => onItem?.(it)}
              title="回到录像里的这一秒"
            >
              <span style={{ color: c.color }}>{c.label}</span>
              <span className="truncate text-[14.5px] font-normal" style={{ color: 'inherit' }}>{it.title}</span>
              {it.sensitivity === 'restricted' && <Lock size={12} className="sk-lock" />}
            </motion.button>
          )
        })}

        <AnimatePresence>
          {r4 && (!live || t >= 12) && (
            <Note key="r4" x={PAD + 40} y={HEAD + gridH + 40} color="#E03131" rotate={-1.5}>
              {personById(r4.person).name}没参会、没被点名，<br />但{depText(m, r4.item)}
            </Note>
          )}
          {fan && (!live || t >= 12.5) && (
            <Note key="fan" x={PAD + 40} y={HEAD + gridH + 40} color="#1971C2" rotate={-1.2}>
              “{items.find(i => i.id === fan.id)!.title.replace(/^.*：/, '')}”发给了 {fan.rs.length} 个人，理由各不同：<br />
              {fan.rs.map(r => `${personById(r.person).name}（${r.reasons.map(k => REASON_SHORT[k]).join('、')}）`).join(' · ')}
            </Note>
          )}
          {lockItem && (!live || t >= 13.2) && (
            <Note key="lock" x={PAD + 2} y={HEAD + gridH + 92} color="#C2255C" rotate={1}>
              <span className="inline-flex items-center gap-1"><Kb name="lock" size={18} /> {lockItem.title.slice(0, 8)}… 原文只有 {lockN} 个人看得到</span>
            </Note>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {quiet.length > 0 && quietShown && (
            <motion.div className="sk-quiet" style={{ left: cx(people.indexOf(quiet[0])) - 190, top: 14 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: live ? 0 : 1.2 }}>
              <Kb name="coffee" size={22} /> {quiet.map(q => personById(q).name).join('、')}：这场不打扰
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Note({ x, y, color, rotate = 0, children }: { x: number; y: number; color: string; rotate?: number; children: ReactNode }) {
  return (
    <motion.div
      className="sk-note"
      style={{ left: x, top: y, color, rotate }}
      initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function depText(m: Meeting, itemId: string) {
  const it = m.items.find(i => i.id === itemId)!
  return `他依赖的「${it.topic}」变了`
}

/** 列的顺序：发布者在前，再按职级、收到条数排，不打扰的人在最后 */
const RANK_W = { exec: 0, head: 1, lead: 2, staff: 3, guest: 4 }
function orderPeople(m: Meeting): PersonId[] {
  if (m.id === RUN_ID) return RUN_PEOPLE
  const count = (pid: PersonId) => m.routes.filter(r => r.person === pid).length
  const rest = m.related.filter(p => p !== m.publisher).sort((a, b) => (count(a) ? 0 : 1) - (count(b) ? 0 : 1) || RANK_W[personById(a).rank] - RANK_W[personById(b).rank] || count(b) - count(a))
  return [m.publisher, ...rest]
}
