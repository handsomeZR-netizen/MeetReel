import { motion } from 'motion/react'
import { Plus } from 'lucide-react'

export type Stage = 'input' | 'run' | 'done'

const STEPS: { id: Stage; label: string }[] = [
  { id: 'input', label: '输入' },
  { id: 'run', label: '编排' },
  { id: 'done', label: '分发' },
]

export function Header({ stage, onNew }: { stage: Stage; onNew: () => void }) {
  const cur = STEPS.findIndex(s => s.id === stage)
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M4 7.5h9M4 12h13M4 16.5h7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="19" cy="7.5" r="1.8" fill="#fff" />
            <circle cx="15.5" cy="16.5" r="1.8" fill="#fff" />
          </svg>
        </span>
        <b>会映</b>
        <span className="brand-en">MeetReel</span>
      </div>

      <nav className="stepper" aria-label="进度">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`step ${i < cur ? 'step--past' : ''} ${i === cur ? 'step--on' : ''}`}>
            {i === cur && <motion.span layoutId="step-pill" className="step-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="step-in"><i>{i + 1}</i>{s.label}</span>
          </div>
        ))}
      </nav>

      <div className="topbar-right">
        <span className="badge">演示数据</span>
        {stage !== 'input' && (
          <button className="ghost-btn" onClick={onNew}><Plus size={14} /> 新会议</button>
        )}
      </div>
    </header>
  )
}
