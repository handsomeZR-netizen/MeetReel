import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowDown } from 'lucide-react'
import { DEFAULT_TEXT, DEFAULT_TITLE, T_END, type EngineId, type PersonId } from './data/demo'
import { useClock } from './lib/useClock'
import { parseTranscript } from './lib/transcript'
import { Header, type Stage } from './components/Header'
import { Composer } from './components/Composer'
import { TranscriptPanel } from './components/TranscriptPanel'
import { AgentTimeline } from './components/AgentTimeline'
import { RoutingBoard, type Focus } from './components/RoutingBoard'
import { BriefDrawer, Results } from './components/Brief'

export default function App() {
  const [running, setRunning] = useState(false)
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [text, setText] = useState(DEFAULT_TEXT)
  const [engine, setEngine] = useState<EngineId>('deepseek')
  const [focus, setFocus] = useState<Focus>(null)
  const [open, setOpen] = useState<PersonId | null>(null)
  const [resultsInView, setResultsInView] = useState(false)
  const clock = useClock(T_END)

  const segs = useMemo(() => parseTranscript(text), [text])
  const done = running && clock.t >= T_END
  const stage: Stage = !running ? 'input' : done ? 'done' : 'run'

  const start = () => {
    setRunning(true)
    window.scrollTo({ top: 0 })
    setTimeout(() => clock.restart(), 450)
  }
  const reset = () => {
    clock.pause()
    clock.seek(0)
    setOpen(null)
    setRunning(false)
  }

  // 镜头跟随：路由开始时，如果观众没自己滚动过，就把视线带到连线区
  const followed = useRef(false)
  useEffect(() => {
    if (!running || clock.t < 0.5) {
      followed.current = false
      return
    }
    if (followed.current || clock.t < 10.2 || !clock.playing) return
    followed.current = true
    if (window.scrollY < 120) {
      const el = document.getElementById('board')
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' })
    }
  }, [running, clock.t, clock.playing])

  useEffect(() => {
    if (!done) return
    const el = document.getElementById('results')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setResultsInView(e.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [done])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <Header stage={stage} onNew={reset} />
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {!running ? (
            <Composer key="composer" title={title} text={text} onTitle={setTitle} onText={setText} onStart={start} />
          ) : (
            <main key="workspace" className="workspace">
              <TranscriptPanel
                segs={segs}
                t={clock.t}
                title={title}
                isDemo={text.trim() === DEFAULT_TEXT.trim()}
                focus={focus}
                onEdit={reset}
              />
              <motion.div
                className="stack"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <AgentTimeline clock={clock} engine={engine} onEngine={setEngine} />
                <RoutingBoard t={clock.t} focus={focus} onFocus={setFocus} onOpen={setOpen} />
              </motion.div>
            </main>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {done && <Results onOpen={setOpen} />}

      <AnimatePresence>
        {done && !resultsInView && !open && (
          <motion.button
            className="float-cta"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.3 }}
            onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}
          >
            分发完成 · 查看 7 份简报 <ArrowDown size={15} />
          </motion.button>
        )}
      </AnimatePresence>

      <BriefDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
