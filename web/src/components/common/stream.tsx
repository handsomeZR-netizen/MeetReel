// 流式文本：逐字输出，支持“**加粗**”和“[[条目 id]]”原话引用（点击回到录像那一秒）
import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { personById } from '@/data/model'
import { itemById } from '@/data/meetings'
import { mmss, quoteSpan } from '@/data/derive'
import { goSource } from '@/lib/router'
import { RUN_ID } from '@/data/run'

type Tok = { k: 'text'; s: string; b: boolean } | { k: 'cite'; id: string }

function tokenize(s: string): Tok[] {
  const out: Tok[] = []
  s.split(/(\[\[[a-z0-9_]+\]\])/).forEach(part => {
    const m = /^\[\[([a-z0-9_]+)\]\]$/.exec(part)
    if (m) out.push({ k: 'cite', id: m[1] })
    else part.split('**').forEach((p, i) => p && out.push({ k: 'text', s: p, b: i % 2 === 1 }))
  })
  return out
}

/** 一段富文本“流”完需要的长度（引用算 2 个字） */
export const richLen = (s: string) => tokenize(s).reduce((n, t) => n + (t.k === 'text' ? t.s.length : 2), 0)

/** 只渲染前 n 个字，保留加粗和原话引用 */
export function rich(s: string, n: number, showMeeting?: (meetingId: string) => boolean): ReactNode[] {
  const out: ReactNode[] = []
  let left = n
  tokenize(s).forEach((tk, i) => {
    if (left <= 0) return
    if (tk.k === 'cite') {
      left -= 2
      out.push(<Cite key={i} id={tk.id} showMeeting={showMeeting} />)
      return
    }
    const piece = tk.s.slice(0, left)
    left -= tk.s.length
    out.push(tk.b ? <strong key={i}>{piece}</strong> : <span key={i}>{piece}</span>)
  })
  return out
}

/** 原话引用：显示说话人和时间，点击回到录像 */
export function Cite({ id, showMeeting }: { id: string; showMeeting?: (meetingId: string) => boolean }) {
  const it = itemById(id)
  const { t0, seg, meeting } = quoteSpan(it)
  const withTitle = showMeeting ? showMeeting(meeting.id) : meeting.id !== RUN_ID
  return (
    <motion.button
      className="chat-cite"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => goSource(meeting.id, Math.max(0, t0 - 0.4), it.id)}
      title={`“${it.quote}” — ${personById(seg.speaker).name}，点击回到录像`}
    >
      <i>▶</i>{withTitle ? `${meeting.title} · ` : ''}{personById(seg.speaker).name} {mmss(t0)}
    </motion.button>
  )
}

/** 流式输出：active 之后按每秒 cps 个字增长 */
export function useStream(active: boolean, instant: boolean, cps: number) {
  const [n, setN] = useState(instant && active ? 1e6 : 0)
  useEffect(() => {
    if (!active) { setN(0); return }
    if (instant) { setN(1e6); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const v = Math.floor(((now - t0) / 1000) * cps)
      setN(v)
      if (v < 2000) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, instant, cps])
  return n
}
