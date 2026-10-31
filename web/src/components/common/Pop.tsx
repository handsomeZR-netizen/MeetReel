// 下拉和弹窗：Pop 是点一下展开的玻璃小面板（点别处或 Esc 收起），筛选、风格、权限说明都用它；
// Modal 是居中的弹窗（Radix Dialog 管焦点和 Esc，motion 管进出场），条目详情、截图大图用它。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Pop({ label, active, onClear, align = 'left', width = 260, title, triggerClassName, panelClassName, children }: {
  label: ReactNode
  /** 选中了值：按钮变成深色，右边出现清除 */
  active?: boolean
  onClear?: () => void
  align?: 'left' | 'right'
  width?: number
  title?: string
  triggerClassName?: string
  panelClassName?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open])
  return (
    <div ref={wrap} className="relative">
      <div className={cn('pop-trigger', active && 'on', open && 'open', triggerClassName)}>
        <button className="flex h-full min-w-0 items-center gap-1.5 pr-1 pl-3" onClick={() => setOpen(o => !o)} aria-expanded={open} title={title}>
          <span className="flex min-w-0 items-center gap-1.5 truncate">{label}</span>
          {!(active && onClear) && <ChevronDown size={14} className={cn('flex-none opacity-60 transition-transform', open && 'rotate-180')} />}
        </button>
        {active && onClear && (
          <button className="grid size-6 flex-none place-items-center rounded-full opacity-70 hover:bg-white/15 hover:opacity-100" onClick={onClear} aria-label="清除">
            <X size={13} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className={cn('pc-sheet absolute top-[calc(100%+6px)] z-30 rounded-[18px] p-1.5', align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left', panelClassName)}
            style={{ width }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 下拉面板里的一行：左边内容，右边数量，选中时打勾 */
export function PopRow({ on, onClick, count, children }: { on?: boolean; onClick: () => void; count?: ReactNode; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-white/80', on && 'sg-raised font-medium')}>
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      {count != null && <span className="text-ink-3 flex-none text-[12px] tabular-nums">{count}</span>}
      <span className={cn('size-1.5 flex-none rounded-full', on ? 'bg-[var(--plum)]' : 'bg-transparent')} />
    </button>
  )
}

export function Modal({ open, onClose, label, className, children }: { open: boolean; onClose: () => void; label: string; className?: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose() }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount key="modal">
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-[rgb(36_22_32/24%)] backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={cn('fixed top-1/2 left-1/2 z-50 max-h-[88svh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none', className)}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <Dialog.Title className="sr-only">{label}</Dialog.Title>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export const ModalClose = ({ className }: { className?: string }) => (
  <Dialog.Close className={cn('sg-raised sg-icon-btn size-8 flex-none', className)} aria-label="关闭"><X size={15} /></Dialog.Close>
)
