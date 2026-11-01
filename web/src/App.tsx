import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRoute } from '@/lib/router'
import { setNavOpener, setSearchOpener, usePhone } from '@/lib/ui'
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
import { Org } from '@/pages/Org'
import { ReelFrameOnly, Reels } from '@/pages/Reels'

export function App() {
  const route = useRoute()
  const [collapsed, setCollapsed] = useState(false)
  const [cmd, setCmd] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const phone = usePhone()
  const signedIn = useStore(s => s.signedIn)

  // 手机上点了导航（换了页面）就收起抽屉
  useEffect(() => setNavOpen(false), [route.raw, phone])

  useEffect(() => {
    setSearchOpener(() => setCmd(true))
    setNavOpener(() => setNavOpen(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmd(o => !o)
      }
      if (e.key === 'Escape') setNavOpen(false)
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
      : p0 === 'org' || p0 === 'templates' ? <Org />
      : p0 === 'reel' ? <Reels />
      : <Home />

  // 片子的纯画面模式：不带侧栏，录屏导出用
  if (p0 === 'reel' && route.query.has('frame')) return <ReelFrameOnly />

  return (
    <TooltipProvider>
      <div className="glass-workspace flex h-svh overflow-hidden">
        {!phone && <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />}
        <main className="glass-workspace-pane relative m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border max-md:m-0 max-md:rounded-none max-md:border-0">
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
      {/* 手机：侧栏变成从左边滑出的抽屉 */}
      <AnimatePresence>
        {phone && navOpen && (
          <motion.div className="fixed inset-0 z-50" initial="closed" animate="open" exit="closed">
            <motion.div
              className="absolute inset-0 bg-[#2A1B26]/30 backdrop-blur-[2px]"
              variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
              onClick={() => setNavOpen(false)}
            />
            <motion.div
              className="glass-workspace absolute inset-y-0 left-0 max-w-[86vw] shadow-[0_20px_60px_-10px_rgb(42_27_38/45%)]"
              variants={{ open: { x: 0 }, closed: { x: '-100%' } }}
              transition={{ type: 'spring', stiffness: 420, damping: 42 }}
            >
              <Sidebar collapsed={false} onCollapse={() => {}} onClose={() => setNavOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <CommandMenu open={cmd} onOpenChange={setCmd} />
      <AnimatePresence>{!signedIn && <SignedOut logo={BRAND.full} />}</AnimatePresence>
    </TooltipProvider>
  )
}
