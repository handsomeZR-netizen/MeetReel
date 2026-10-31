import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Heart, type IconNode } from 'lucide'
import { ArrowUpRight, Keyboard, RotateCcw, Trophy } from 'lucide-react'
import { STYLES, type StyleEntry } from '@/shared/styles'
import { Kb } from '@/shared/Koboyo'

const VOTE_KEY = 'meetreel-style-votes'

/** 实心的心：morphicons 会把描边心形变成填充心形 */
const HeartFill = Heart.map(([tag, attrs]) => [tag, { ...attrs, fill: 'currentColor' }]) as IconNode

function loadVotes(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(VOTE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function Gallery() {
  const [votes, setVotes] = useState<Record<string, number>>(loadVotes)
  const vote = (id: string, d: number) =>
    setVotes(v => {
      const next = { ...v, [id]: Math.max(0, (v[id] ?? 0) + d) }
      try { localStorage.setItem(VOTE_KEY, JSON.stringify(next)) } catch { /* 无痕模式下不保存 */ }
      return next
    })
  const clearVotes = () => {
    setVotes({})
    try { localStorage.removeItem(VOTE_KEY) } catch { /* 同上 */ }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= STYLES.length) location.href = STYLES[n - 1].path
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="g">
      <header className="g-top">
        <div className="g-brand">
          <span className="g-logo" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M4 7.5h9M4 12h13M4 16.5h7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="19" cy="7.5" r="1.8" fill="#fff" />
              <circle cx="15.5" cy="16.5" r="1.8" fill="#fff" />
            </svg>
          </span>
          <b>会映</b>
          <span>MeetReel</span>
          <em>/ 前端风格实验室</em>
        </div>
        <span className="g-hint"><Keyboard size={14} /> 按 <kbd>1</kbd>–<kbd>5</kbd> 直接打开</span>
      </header>

      <section className="g-hero">
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}>
          同一场会，<span className="g-ink">五种样子</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }}>
          每个页面都跑同一份双 11 评审会剧本：输入 → 8 个智能体编排 → 账本按人分发 → 每人一份简报。
          进去以后按 <kbd>1</kbd>–<kbd>5</kbd> 随时切换，右下角也能切。
        </motion.p>
        <motion.div className="g-note" initial={{ opacity: 0, rotate: -4 }} animate={{ opacity: 1, rotate: -3 }} transition={{ delay: 0.6 }}>
          <svg width="74" height="54" viewBox="0 0 74 54" fill="none" aria-hidden>
            <motion.path
              d="M70 6C52 4 30 10 20 26c-5 8-6 15-5 22m0 0-7-8m7 8 6-8"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.9, ease: 'easeInOut' }}
            />
          </svg>
          <span>看完记得给喜欢的投一票</span>
        </motion.div>
      </section>

      <motion.section
        className="g-grid"
        initial="hide"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
      >
        {STYLES.map((s, i) => (
          <Card key={s.id} s={s} index={i} votes={votes[s.id] ?? 0} onVote={d => vote(s.id, d)} />
        ))}
        <Board votes={votes} onClear={clearVotes} />
      </motion.section>

      <footer className="g-foot">
        <span>演示数据来自 <code>web/src/data/demo.ts</code> · 手绘图标来自 <a href="https://koboyo.com/icons" target="_blank" rel="noreferrer">Koboyo Icons</a> · 形变图标用 <a href="https://www.morphicons.com/" target="_blank" rel="noreferrer">morphicons</a></span>
      </footer>
    </div>
  )
}

function Card({ s, index, votes, onVote }: { s: StyleEntry; index: number; votes: number; onVote: (d: number) => void }) {
  const frame = useRef<HTMLAnchorElement>(null)
  const [scale, setScale] = useState(0.3)
  const [loaded, setLoaded] = useState(false)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1440))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.article
      className="g-card"
      variants={{ hide: { opacity: 0, y: 24, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      whileHover={{ y: -6 }}
    >
      <a className="g-shot" href={s.path} ref={frame} aria-label={`打开 ${s.name}`}>
        <iframe
          src={`${s.path}?embed&still&at=${s.thumbAt}`}
          title={s.name}
          tabIndex={-1}
          loading="lazy"
          onLoad={() => setTimeout(() => setLoaded(true), 500)}
          style={{ transform: `scale(${scale})` }}
        />
        <AnimatePresence>
          {!loaded && (
            <motion.div className="g-shot-ph" exit={{ opacity: 0 }} style={{ background: `linear-gradient(135deg, ${s.swatch[0]}22, ${s.swatch[1]}22, ${s.swatch[2]}33)` }}>
              <span className="g-shimmer" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="g-open">打开 <ArrowUpRight size={15} /></span>
      </a>

      <div className="g-body">
        <div className="g-title">
          <span className="g-key" style={{ background: `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[2]})` }}>{s.key}</span>
          <div>
            <h2>{s.name} <small>{s.en}</small></h2>
          </div>
          <button
            className={`g-vote ${liked ? 'on' : ''}`}
            onClick={() => { onVote(liked ? -1 : 1); setLiked(l => !l) }}
            aria-label={liked ? '取消投票' : '投一票'}
          >
            <MorphIcon icon={liked ? HeartFill : Heart} size={16} strokeWidth={2} spring="bouncy" />
            <motion.b key={votes} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{votes}</motion.b>
          </button>
        </div>
        <p>{s.tagline}</p>
        <ul>
          {s.points.map(p => <li key={p}>{p}</li>)}
        </ul>
        <div className="g-stack">
          {s.stack.map(x => <span key={x}>{x}</span>)}
          <kbd>{index + 1}</kbd>
        </div>
      </div>
    </motion.article>
  )
}

function Board({ votes, onClear }: { votes: Record<string, number>; onClear: () => void }) {
  const total = Object.values(votes).reduce((a, b) => a + b, 0)
  const ranked = [...STYLES].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))
  const max = Math.max(1, ...STYLES.map(s => votes[s.id] ?? 0))
  return (
    <motion.article
      className="g-card g-board"
      variants={{ hide: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
    >
      <div className="g-board-head">
        <Kb name="handshake" size={44} className="g-board-kb" />
        <div>
          <h2>今晚的票数</h2>
          <p>{total ? `共 ${total} 票，存在这台电脑的浏览器里` : '还没人投票。点每张卡右上角的心。'}</p>
        </div>
      </div>
      <ol className="g-rank">
        {ranked.map((s, i) => {
          const v = votes[s.id] ?? 0
          return (
            <motion.li key={s.id} layout transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
              <span className="g-rank-n">{v > 0 && i === 0 ? <Trophy size={14} /> : i + 1}</span>
              <span className="g-rank-name">{s.key} · {s.name}</span>
              <span className="g-rank-bar">
                <motion.i
                  animate={{ width: `${(v / max) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                  style={{ background: `linear-gradient(90deg, ${s.swatch[0]}, ${s.swatch[2]})` }}
                />
              </span>
              <b>{v}</b>
            </motion.li>
          )
        })}
      </ol>
      {total > 0 && (
        <button className="g-clear" onClick={onClear}><RotateCcw size={13} /> 清空票数</button>
      )}
      <div className="g-tips">
        <b>现场小技巧</b>
        <span>地址后面加 <code>?at=12</code> 直接跳到第 12 秒；加 <code>&amp;still</code> 停在那一帧。</span>
      </div>
    </motion.article>
  )
}
