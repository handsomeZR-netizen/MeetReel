import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { STYLES } from './styles'
import './switcher.css'

const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** 右下角的风格切换器：悬停展开；不在输入框里时按 1–5 切换风格，0 回总览 */
export function Switcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false)
  const idx = STYLES.findIndex(s => s.id === current)
  const cur = STYLES[idx]
  const go = (i: number) => (location.href = STYLES[(i + STYLES.length) % STYLES.length].path)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '0') location.href = '/'
      const n = Number(e.key)
      if (n >= 1 && n <= STYLES.length && n - 1 !== idx) go(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (new URLSearchParams(location.search).has('embed')) return null

  return (
    <div className="mr-sw" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="mr-sw-panel"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          >
            <a className="mr-sw-home" href="/">
              <LayoutGrid size={14} /> 全部风格 <kbd>0</kbd>
            </a>
            {STYLES.map((s, i) => (
              <a key={s.id} href={s.path} className={`mr-sw-row ${s.id === current ? 'on' : ''}`}>
                <span className="mr-sw-sw">
                  {s.swatch.map(c => <i key={c} style={{ background: c }} />)}
                </span>
                <span className="mr-sw-name">
                  <b>{s.key} · {s.name}</b>
                  <small>{s.en}</small>
                </span>
                <kbd>{i + 1}</kbd>
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mr-sw-bar">
        <button aria-label="上一个风格" onClick={() => go(idx - 1)}><ChevronLeft size={15} /></button>
        <span className="mr-sw-cur">
          <i style={{ background: `linear-gradient(135deg, ${cur.swatch[0]}, ${cur.swatch[1]}, ${cur.swatch[2]})` }} />
          {cur.key} · {cur.name}
          <em>{idx + 1}/{STYLES.length}</em>
        </span>
        <button aria-label="下一个风格" onClick={() => go(idx + 1)}><ChevronRight size={15} /></button>
      </div>
    </div>
  )
}
