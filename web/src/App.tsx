import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRoute } from '@/lib/router'
import { setSearchOpener } from '@/lib/ui'
import { TooltipProvider } from '@/components/ui/misc'
import { useStore } from '@/lib/store'
import { BRAND, Sidebar } from '@/components/shell/Sidebar'
import { SignedOut } from '@/components/shell/Account'
import { CommandMenu } from '@/components/shell/CommandMenu'
import { Home } from '@/pages/Home'
import { MeetingPage } from '@/pages/Meeting'
import { Dispatch } from '@/pages/Dispatch'
import { Shared } from '@/pages/Shared'
import { Knowledge } from '@/pages/Knowledge'
import { Templates } from '@/pages/Templates'
import { ReelFrameOnly, Reels } from '@/pages/Reels'

export function App() {
  const route = useRoute()
  const [collapsed, setCollapsed] = useState(false)
  const [cmd, setCmd] = useState(false)
  const signedIn = useStore(s => s.signedIn)

  useEffect(() => {
    setSearchOpener(() => setCmd(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmd(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const [p0, p1] = route.path
  // 新建会映和分发是同一个对话页：/new 是空白的新对话，/dispatch/:id 是某场会的分发
  const key = p0 === 'new' || p0 === 'dispatch' ? `new/${p1 ?? ''}` : `${p0 ?? 'home'}/${p1 ?? ''}`
  const page =
    p0 === 'm' && p1 ? <MeetingPage id={p1} />
      : p0 === 'dispatch' || p0 === 'new' ? <Dispatch id={p1} />
      : p0 === 'shared' ? <Shared />
      : p0 === 'kb' ? <Knowledge />
      : p0 === 'templates' ? <Templates />
      : p0 === 'reel' ? <Reels />
      : <Home />

  // 片子的纯画面模式：不带侧栏，录屏导出用
  if (p0 === 'reel' && route.query.has('frame')) return <ReelFrameOnly />

  return (
    <TooltipProvider>
      <div className="glass-workspace flex h-svh overflow-hidden">
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} onSearch={() => setCmd(true)} />
        <main className="glass-workspace-pane relative m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {page}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandMenu open={cmd} onOpenChange={setCmd} />
      <AnimatePresence>{!signedIn && <SignedOut logo={BRAND.full} />}</AnimatePresence>
    </TooltipProvider>
  )
}
