import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BellOff, Check, ChevronRight, Lock, MessageCircleQuestion, Play, UserX, X } from 'lucide-react'
import {
  ITEMS, ITEM_TYPES, PEOPLE, REASONS, ROUTES,
  briefOf, itemById, personById, type BriefEntry, type PersonId,
} from '../data/demo'
import { Avatar } from './Avatar'

const isQuiet = (id: PersonId) => briefOf(id).entries.length === 0 && !personById(id).host

/** 结果区：8 个人的简报缩略卡 */
export function Results({ onOpen }: { onOpen: (id: PersonId) => void }) {
  return (
    <section className="results" id="results">
      <motion.div
        className="results-head"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2>8 个相关人，7 份不同的简报，1 个人没被打扰</h2>
        <p>点开任何一张，看这个人收到的飞书卡片。</p>
      </motion.div>
      <motion.div
        className="phones"
        initial="hide"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        {PEOPLE.map(p => (
          <motion.button
            key={p.id}
            type="button"
            className={`mini ${isQuiet(p.id) ? 'mini--quiet' : ''}`}
            variants={{ hide: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1 } }}
            whileHover={{ y: -4 }}
            onClick={() => onOpen(p.id)}
          >
            <MiniBrief id={p.id} />
          </motion.button>
        ))}
      </motion.div>
    </section>
  )
}

function MiniBrief({ id }: { id: PersonId }) {
  const person = personById(id)
  const brief = briefOf(id)
  const quiet = isQuiet(id)
  const rows = person.host ? ITEMS.slice(0, 5).map(i => i.id) : brief.entries.map(e => e.item)
  return (
    <>
      <div className="mini-top">
        <Avatar person={person} size={28} muted={quiet} />
        <div>
          <b>{person.name}</b>
          <span>{person.role}</span>
        </div>
        <span className="mini-count">{quiet ? <BellOff size={14} /> : person.host ? '全量' : `${brief.entries.length} 条`}</span>
      </div>
      <p className="mini-headline">{brief.headline}</p>
      {!quiet && (
        <ul className="mini-items">
          {rows.slice(0, 4).map(iid => {
            const it = itemById(iid)
            return (
              <li key={iid}>
                <i style={{ background: ITEM_TYPES[it.type].color }} />
                <span>{it.title}</span>
                {it.sensitivity === 'restricted' && <Lock size={11} />}
              </li>
            )
          })}
          {rows.length > 4 && <li className="more">还有 {rows.length - 4} 条</li>}
        </ul>
      )}
      <div className="mini-foot">
        <span>{quiet ? '不推送，进日报' : `约 ${brief.readSeconds} 秒读完`}</span>
        {!quiet && <span className="open">打开 <ChevronRight size={13} /></span>}
      </div>
    </>
  )
}

/** 侧滑出来的个人简报（模拟飞书卡片） */
export function BriefDrawer({ id, onClose }: { id: PersonId | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {id && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            className="drawer"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="drawer-bar">
              <span className="bot"><span className="bot-logo">映</span>会映 · 会议助手</span>
              <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={18} /></button>
            </div>
            <div className="drawer-scroll">
              <BriefView id={id} key={id} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function BriefView({ id }: { id: PersonId }) {
  const person = personById(id)
  const brief = briefOf(id)
  const quiet = isQuiet(id)

  return (
    <div className="brief">
      <div className="brief-who">
        <Avatar person={person} size={40} muted={quiet} />
        <div>
          <b>{person.name}</b>
          <span>{person.role} · {person.present ? '参会' : '缺席'}</span>
        </div>
      </div>
      <div className="brief-from">来自「双 11 活动上线评审」 · 10/31 10:00</div>
      <h3 className="brief-headline">{brief.headline}</h3>
      {!quiet && (
        <div className="brief-meta">
          约 {brief.readSeconds} 秒读完 · {person.host ? '全量 10 条' : `${brief.entries.length} 条必读`}
        </div>
      )}

      {quiet ? (
        <div className="quiet-box">
          <BellOff size={22} />
          <b>这次没有打扰你</b>
          <span>你只订阅了「上线时间」，属于“建议看”，已放进明天的日报。完整纪要随时可查。</span>
        </div>
      ) : person.host ? (
        <HostList />
      ) : (
        <motion.div
          className="entries"
          initial="hide"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        >
          {brief.entries.map(e => <EntryCard key={e.item} entry={e} />)}
        </motion.div>
      )}

      <button className="full-link">查看完整纪要（按你的权限） <ChevronRight size={14} /></button>
    </div>
  )
}

function EntryCard({ entry }: { entry: BriefEntry }) {
  const it = itemById(entry.item)
  const ty = ITEM_TYPES[it.type]
  const speaker = personById(it.speaker)
  const [state, setState] = useState<'idle' | 'confirmed' | 'not_me' | 'ask'>('idle')

  return (
    <motion.article
      className="entry"
      style={{ ['--c' as string]: ty.color, ['--soft' as string]: ty.soft }}
      variants={{ hide: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
    >
      <div className="entry-top">
        <span className="type-pill">{ty.label}</span>
        <span className="entry-title">{it.title}</span>
        {it.sensitivity === 'restricted' && <span className="lock-pill"><Lock size={11} /> 受限 · 仅 4 人可见</span>}
      </div>
      <p className="for-you">{entry.forYou}</p>
      {entry.facts && (
        <dl className="facts">
          {entry.facts.what && <div><dt>做什么</dt><dd>{entry.facts.what}</dd></div>}
          {entry.facts.who && <div><dt>谁</dt><dd>{entry.facts.who}</dd></div>}
          {entry.facts.when && <div><dt>何时</dt><dd>{entry.facts.when}</dd></div>}
        </dl>
      )}
      <div className="why">
        <span>为什么发给你：{entry.why}</span>
        {entry.reasons.map(r => <span key={r} className={`tag ${r === 'R4' ? 'tag--r4' : ''}`}>{r} {REASONS[r]}</span>)}
      </div>
      <div className="source">
        <button className="play" aria-label="播放原声"><Play size={12} fill="currentColor" /></button>
        <Avatar person={speaker} size={20} />
        <span className="src-who">{speaker.name} · {it.at}</span>
        <q>{it.quote}</q>
      </div>
      <div className="entry-actions">
        {it.type === 'action' && (
          <>
            <button className={state === 'confirmed' ? 'on' : ''} onClick={() => setState('confirmed')}>
              <Check size={14} /> {state === 'confirmed' ? '已确认' : '确认'}
            </button>
            <button className={state === 'not_me' ? 'on' : ''} onClick={() => setState('not_me')}>
              <UserX size={14} /> {state === 'not_me' ? '已改派' : '不是我'}
            </button>
          </>
        )}
        <button className={state === 'ask' ? 'on' : ''} onClick={() => setState('ask')}>
          <MessageCircleQuestion size={14} /> 追问
        </button>
      </div>
      <AnimatePresence>
        {state === 'ask' && (
          <motion.div className="ask-box" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <input placeholder="问问这场会……（问答官和转问功能接入后可用）" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function HostList() {
  return (
    <ul className="host-list">
      {ITEMS.map(it => {
        const ty = ITEM_TYPES[it.type]
        const to = ROUTES.filter(r => r.item === it.id).map(r => personById(r.person))
        return (
          <li key={it.id} style={{ ['--c' as string]: ty.color, ['--soft' as string]: ty.soft }}>
            <div className="host-row">
              <span className="type-pill">{ty.label}</span>
              <span className="entry-title">{it.title}</span>
              {it.sensitivity === 'restricted' && <Lock size={12} className="lock-ic" />}
            </div>
            <div className="host-to">
              {it.flags?.includes('缺负责人') ? (
                <span className="flag">缺负责人 · 建议赵一</span>
              ) : null}
              <span className="to-label">发给</span>
              <span className="to-stack">
                {to.length ? to.map(p => <Avatar key={p.id} person={p} size={20} />) : <em>仅主持人</em>}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
