import { motion } from 'motion/react'
import { ArrowRight, FileText, Route, ScanText, Send, Sparkles } from 'lucide-react'
import { DEFAULT_TEXT, PEOPLE } from '../data/demo'
import { Avatar } from './Avatar'

interface Props {
  title: string
  text: string
  onTitle: (v: string) => void
  onText: (v: string) => void
  onStart: () => void
}

const STEPS = [
  { icon: ScanText, title: '抽取', body: '决议、待办、变更、风险，每条附原话' },
  { icon: Route, title: '路由', body: '相关性 × 权限，没被点名也能收到' },
  { icon: Send, title: '分发', body: '每人一份，30 秒读完，可确认、可追问' },
]

export function Composer({ title, text, onTitle, onText, onStart }: Props) {
  const present = PEOPLE.filter(p => p.present).length
  const ready = text.trim().length > 0

  return (
    <div className="composer-wrap">
      <motion.div
        className="hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
      >
        <span className="eyebrow"><Sparkles size={13} /> 会后信息路由 · 多智能体</span>
        <h1>开完一场会，每个人只收到<br />和自己有关的那部分</h1>
        <p>贴进会议文本，看 8 个智能体把一场会拆成每人一份的简报：附原话，写明为什么发给你。</p>
      </motion.div>

      <motion.section
        layoutId="meeting-card"
        className="card composer"
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      >
        <div className="composer-head">
          <FileText size={16} />
          <input className="title-input" value={title} onChange={e => onTitle(e.target.value)} aria-label="会议标题" />
        </div>

        <div className="attendees">
          <div className="avatar-stack">
            {PEOPLE.map(p => (
              <span key={p.id} className={p.present ? 'ring' : ''} title={`${p.name} · ${p.role} · ${p.present ? '参会' : '缺席'}`}>
                <Avatar person={p} size={28} />
              </span>
            ))}
          </div>
          <span className="att-text">8 位相关人 · 参会 {present} · 缺席 {PEOPLE.length - present} · 关注档案已加载</span>
        </div>

        <textarea
          className="composer-text"
          value={text}
          onChange={e => onText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ready) onStart()
          }}
          spellCheck={false}
          aria-label="会议文本"
        />

        <div className="composer-foot">
          <span className="hint">格式：<code>姓名：发言内容</code>，一行一段。录音转写入口后续接入。</span>
          <div className="composer-actions">
            {text !== DEFAULT_TEXT && (
              <button className="ghost-btn" onClick={() => onText(DEFAULT_TEXT)}>载入示例</button>
            )}
            <button className="primary-btn" onClick={onStart} disabled={!ready}>
              开始分析 <ArrowRight size={16} />
              <kbd>Ctrl ↵</kbd>
            </button>
          </div>
        </div>
      </motion.section>

      <motion.ol
        className="steps"
        initial="hide"
        animate="show"
        exit="hide"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
      >
        {STEPS.map(({ icon: Icon, title: st, body }, i) => (
          <motion.li key={st} variants={{ hide: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <span className="step-icon"><Icon size={16} /></span>
            <div>
              <b>{i + 1}. {st}</b>
              <span>{body}</span>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  )
}
