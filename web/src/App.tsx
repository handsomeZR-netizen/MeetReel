import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRoute } from '@/lib/router'
import { setSearchOpener } from '@/lib/ui'
import { TooltipProvider } from '@/components/ui/misc'
import { Sidebar } from '@/components/shell/Sidebar'
import { CommandMenu } from '@/components/shell/CommandMenu'
import { Home } from '@/pages/Home'
import { MeetingPage } from '@/pages/Meeting'
import { Dispatch } from '@/pages/Dispatch'
import { Shared } from '@/pages/Shared'
import { Knowledge } from '@/pages/Knowledge'
import { Templates } from '@/pages/Templates'
import { NewMeeting } from '@/pages/NewMeeting'

export function App() {
  const route = useRoute()
  const [collapsed, setCollapsed] = useState(false)
  const [cmd, setCmd] = useState(false)

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
  const key = `${p0 ?? 'home'}/${p1 ?? ''}`
  const page =
    p0 === 'm' && p1 ? <MeetingPage id={p1} />
      : p0 === 'dispatch' ? <Dispatch id={p1} />
      : p0 === 'shared' ? <Shared />
      : p0 === 'kb' ? <Knowledge />
      : p0 === 'templates' ? <Templates />
      : p0 === 'new' ? <NewMeeting />
      : <Home />

  return (
    <TooltipProvider>
      <div className="bg-sidebar flex h-svh overflow-hidden">
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} onSearch={() => setCmd(true)} />
        <main className="bg-background relative m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-[0_1px_3px_rgba(16,24,40,.04)]">
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
    </TooltipProvider>
  )
}
