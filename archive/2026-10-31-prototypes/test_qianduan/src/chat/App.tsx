import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { ArrowUp, Check, ChevronDown, Circle, Copy, Square } from 'lucide'
import {
  BellOff, FileText, Lock, Mic, MessageCircleQuestion, PanelLeft, Paperclip, Play, Plus,
  RotateCcw, Search, Share, SquarePen, ThumbsDown, ThumbsUp, UserX, X,
} from 'lucide-react'
import {
  AGENTS, DEFAULT_TITLE, ENGINES, ITEMS, ITEM_TYPES, PHASES, REASONS, REASON_SHORT, T_END, TOTAL_TOKENS,
  agentById, agentModel, agentSeg, briefOf, countOf, isQuiet, itemById, logAt, PEOPLE_SORTED, personById,
  phaseIndex, reasonsOf, routesAt, tokensAt,
  type EngineId, type Person, type PersonId,
} from '@/shared/script'
import { useDemo } from '@/shared/useDemo'
import { ModelIcon } from '@/shared/ModelIcon'

const HISTORY = [
  { group: '今天', items: [DEFAULT_TITLE] },
  { group: '昨天', items: ['客户端发版排期', 'Q4 OKR 对齐会'] },
  { group: '前 7 天', items: ['客服话术复盘', '618 大促复盘', '数据看板需求评审'] },
]

const FOLLOWUPS: { q: string; a: string }[] = [
  { q: '为什么赵一会收到？', a: '赵一没参会，会上也没人点他的名。但他的关注档案里写着负责**客户端**，而客户端依赖**订单接口**。陈默在 00:17 说 coupon_amount 要拆成两个字段，所以影响链规则 R4 把 it_05 推给了他，并建议由他来做负责人。' },
  { q: '林总这次要签批什么？', a: '只有 1 笔：**A 方案扩容预算约 30 万**。这条是受限内容，金额只有林总、周宁、王珂、陈默能看到；其他人看到的是“扩容按 A 方案推进”。' },
  { q: '吴桐为什么没收到？', a: '吴桐（数据分析）这场会没有必读条目：没被点名，负责的东西没被提到，依赖的东西也没变。上线日期的变化只放进了他的日报，**不单独打扰**。' },
]

export function App() {
  const demo = useDemo({ speed: 1.4, startDelay: 700 })
  const { t, running } = demo
  const [side, setSide] = useState(true)
  const [engine, setEngine] = useState<EngineId>('deepseek')
  const [canvas, setCanvas] = useState<PersonId | null>(null)
  const [attached, setAttached] = useState(false)
  const [draft, setDraft] = useState('')
  const [extra, setExtra] = useState<{ id: number; q: string; a: string }[]>([])
  const instant = useMemo(() => new URLSearchParams(location.search).has('still'), [])

  const answerDone = useStreamDone(running && t >= T_END, instant)
  const generating = running && !answerDone

  const ask = (q: string) => {
    const hit = FOLLOWUPS.find(f => f.q === q)
    setExtra(x => [...x, { id: Date.now(), q, a: hit?.a ?? '演示版只预置了几个问题，可以试试下面的建议追问。' }])
    setDraft('')
  }
  const send = () => {
    if (!running) {
      if (attached) demo.start()
      return
    }
    if (draft.trim() && !generating) ask(draft.trim())
  }
  const newChat = () => {
    demo.reset()
    setCanvas(null)
    setAttached(false)
    setExtra([])
    setDraft('')
  }

  // 新内容出现时，若用户停在底部附近就跟着滚
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  })

  return (
    <div className="ct">
      <motion.aside className="ct-side" animate={{ width: side ? 260 : 0 }} transition={{ type: 'spring', stiffness: 380, damping: 40 }}>
        <div className="ct-side-in">
          <div className="ct-side-top">
            <span className="ct-logo" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M4 7.5h9M4 12h13M4 16.5h7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="19" cy="7.5" r="1.8" fill="#fff" /><circle cx="15.5" cy="16.5" r="1.8" fill="#fff" />
              </svg>
            </span>
            <button className="ct-ib" onClick={() => setSide(false)} aria-label="收起侧栏"><PanelLeft size={18} /></button>
          </div>
          <button className="ct-side-row" onClick={newChat}><SquarePen size={17} /> 新会议</button>
          <button className="ct-side-row"><Search size={17} /> 搜索会议</button>
          <div className="ct-side-label">智能体</div>
          <div className="ct-agents">
            {AGENTS.map(a => <span key={a.id} title={a.duty}><i style={{ background: a.color }} />{a.name}</span>)}
          </div>
          {HISTORY.map(h => (
            <div key={h.group}>
              <div className="ct-side-label">{h.group}</div>
              {h.items.map(x => (
                <button key={x} className={`ct-side-row ct-hist ${x === DEFAULT_TITLE && running ? 'on' : ''}`}>{x}</button>
              ))}
            </div>
          ))}
          <div className="ct-me">
            <span className="ct-me-face" style={{ background: personById('wangke').bg, color: personById('wangke').fg }}>珂</span>
            <div><b>王珂</b><small>产品 · 团队版</small></div>
          </div>
        </div>
      </motion.aside>

      <LayoutGroup>
        <main className="ct-main">
          <header className="ct-top">
            {!side && <button className="ct-ib" onClick={() => setSide(true)} aria-label="展开侧栏"><PanelLeft size={18} /></button>}
            {!side && <button className="ct-ib" onClick={newChat} aria-label="新会议"><SquarePen size={18} /></button>}
            <ModelPicker engine={engine} onPick={setEngine} />
            <div className="ct-top-r">
              {running && <button className="ct-share"><Share size={15} /> 分享</button>}
              <span className="ct-me-face sm" style={{ background: personById('wangke').bg, color: personById('wangke').fg }}>珂</span>
            </div>
          </header>

          <div
            className={`ct-scroll ${running ? '' : 'empty'}`}
            ref={scroller}
            onScroll={e => {
              const el = e.currentTarget
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
          >
            {running ? (
              <div className="ct-thread">
                <UserMessage />
                <Answer t={t} engine={engine} instant={instant} onOpen={setCanvas} onAsk={ask} showFollow={answerDone && !extra.length} />
                {extra.map((m, i) => (
                  <div key={m.id}>
                    <motion.div className="ct-user" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="ct-bubble">{m.q}</div>
                    </motion.div>
                    <FollowAnswer text={m.a} onAsk={ask} last={i === extra.length - 1} asked={extra.map(e => e.q)} />
                  </div>
                ))}
              </div>
            ) : (
              <Welcome onExample={() => setAttached(true)} />
            )}
          </div>

          <motion.div layout className={`ct-dock ${running ? '' : 'center'}`} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
            <Composer
              attached={attached && !running}
              onDetach={() => setAttached(false)}
              draft={draft}
              onDraft={setDraft}
              onSend={send}
              generating={generating}
              canSend={running ? !!draft.trim() : attached}
              placeholder={running ? '继续追问，例如：林总这次要签批什么？' : attached ? '' : '把会议文本或录音交给会映'}
            />
            <p className="ct-fine">会映会出错，重要事项请对照原话核实。演示数据，未连接真实模型。</p>
          </motion.div>
        </main>

        <AnimatePresence>
          {canvas && <Canvas key="canvas" id={canvas} onClose={() => setCanvas(null)} onSwitch={setCanvas} />}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  )
}

// ---------------- 顶栏模型选择 ----------------

function ModelPicker({ engine, onPick }: { engine: EngineId; onPick: (e: EngineId) => void }) {
  const [open, setOpen] = useState(false)
  const cur = ENGINES.find(e => e.id === engine)!
  const names: Record<EngineId, string> = { deepseek: 'DeepSeek V4.1 Flash', claude: 'Claude Sonnet 5.5', qwen: 'Qwen 私有化' }
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  return (
    <div className="ct-picker">
      <button className="ct-picker-btn" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        会映 <span>{cur.label}</span> <ChevronDownIcon open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="ct-menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="ct-menu-label">模型可替换 · 评测驱动</div>
            {ENGINES.map(e => (
              <button key={e.id} className="ct-menu-row" onClick={() => { onPick(e.id); setOpen(false) }}>
                <ModelIcon icon={e.id} size={20} />
                <div><b>{names[e.id]}</b><small>{e.sub}{e.yuanPerM ? ` · 约 ¥${((TOTAL_TOKENS * e.yuanPerM) / 1e6).toFixed(3)} / 场` : ' · 数据不出企业'}</small></div>
                <span className="ct-menu-check">{e.id === engine && <MorphIcon icon={Check} size={16} strokeWidth={2.4} />}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return <motion.span style={{ display: 'inline-grid' }} animate={{ rotate: open ? 180 : 0 }}><MorphIcon icon={ChevronDown} size={16} strokeWidth={2} /></motion.span>
}

// ---------------- 欢迎页 ----------------

function Welcome({ onExample }: { onExample: () => void }) {
  return (
    <motion.div className="ct-welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>开完会了？交给我按人分发。</motion.h1>
      <motion.div className="ct-sugs" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}>
        {[
          { icon: FileText, label: '示例：双 11 活动上线评审', go: true },
          { icon: Mic, label: '上传会议录音' },
          { icon: Paperclip, label: '粘贴飞书妙记' },
        ].map(({ icon: I, label, go }) => (
          <motion.button
            key={label}
            className={`ct-sug ${go ? 'go' : ''}`}
            variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}
            onClick={go ? onExample : undefined}
          >
            <I size={16} /> {label}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ---------------- 输入框 ----------------

function Composer(props: {
  attached: boolean
  onDetach: () => void
  draft: string
  onDraft: (v: string) => void
  onSend: () => void
  generating: boolean
  canSend: boolean
  placeholder: string
}) {
  const { attached, onDetach, draft, onDraft, onSend, generating, canSend, placeholder } = props
  return (
    <div className="ct-composer">
      <AnimatePresence>
        {attached && (
          <motion.div className="ct-attach" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="ct-file">
              <span className="ct-file-ic"><FileText size={18} /></span>
              <div><b>双11评审会.txt</b><small>11 段发言 · 8 位相关人 · 关注档案已加载</small></div>
              <button className="ct-file-x" onClick={onDetach} aria-label="移除"><X size={13} /></button>
            </div>
            <div className="ct-attach-text">把这场会按人分发：每人只收和自己有关的，附原话和理由。</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="ct-input-row">
        <button className="ct-ib round" aria-label="添加附件"><Plus size={19} /></button>
        <textarea
          rows={1}
          value={draft}
          placeholder={placeholder}
          onChange={e => onDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
        />
        <button className="ct-ib round" aria-label="语音"><Mic size={18} /></button>
        <button className={`ct-send ${canSend || generating ? 'on' : ''}`} onClick={onSend} aria-label={generating ? '停止' : '发送'}>
          <MorphIcon icon={generating ? Square : ArrowUp} size={generating ? 14 : 18} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}

// ---------------- 对话：用户消息 ----------------

function UserMessage() {
  return (
    <motion.div className="ct-user" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="ct-file sent">
        <span className="ct-file-ic"><FileText size={18} /></span>
        <div><b>双11评审会.txt</b><small>文档 · 11 段发言</small></div>
      </div>
      <div className="ct-bubble">把这场会按人分发：每人只收和自己有关的，附原话和理由。</div>
    </motion.div>
  )
}

// ---------------- 对话：主回答 ----------------

function Answer({ t, engine, instant, onOpen, onAsk, showFollow }: {
  t: number
  engine: EngineId
  instant: boolean
  onOpen: (id: PersonId) => void
  onAsk: (q: string) => void
  showFollow: boolean
}) {
  const done = t >= T_END
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? !done
  const n = useStream(done, instant, 95)
  const blocks = useMemo(() => buildBlocks(), [])
  const total = blocks.reduce((s, b) => s + b.cost, 0)
  const streaming = done && n < total

  let budget = n
  const shown: ReactNode[] = []
  for (const b of blocks) {
    if (budget <= 0) break
    const k = Math.min(b.cost, budget)
    shown.push(b.render(k, onOpen, streaming && k < b.cost))
    budget -= b.cost
  }

  return (
    <div className="ct-ai">
      <Thinking t={t} engine={engine} open={open} onToggle={() => setUserOpen(!open)} />
      <div className="ct-md">
        {shown}
        {streaming && budget <= 0 && <span className="ct-cursor" />}
      </div>
      {done && n >= total && <Actions engine={engine} />}
      {showFollow && n >= total && <Follow onAsk={onAsk} asked={[]} />}
    </div>
  )
}

function Thinking({ t, engine, open, onToggle }: { t: number; engine: EngineId; open: boolean; onToggle: () => void }) {
  const done = t >= T_END
  const log = logAt(t)
  const phase = PHASES[phaseIndex(t)]
  const busy = AGENTS.filter(a => agentSeg(a.id, t))
  return (
    <div className="ct-think">
      <button className="ct-think-head" onClick={onToggle}>
        {done ? (
          <span>已编排 8 个智能体，用时 20 秒</span>
        ) : (
          <>
            <span className="ct-shimmer">正在思考</span>
            <span className="ct-think-phase">· {phase.label}{busy.length ? ` · ${busy.map(a => a.name).join('、')}` : ''}</span>
          </>
        )}
        <motion.span className="ct-think-chev" animate={{ rotate: open ? 90 : 0 }}>›</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="ct-think-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="ct-phases">
              {PHASES.map((p, i) => (
                <span key={p.id} className={i < phaseIndex(t) || done ? 'past' : i === phaseIndex(t) ? 'on' : ''}>{p.label}</span>
              ))}
            </div>
            <div className="ct-chips">
              {AGENTS.map(a => {
                const on = busy.includes(a)
                const m = agentModel(a.id, engine)
                return (
                  <span key={a.id} className={on ? 'on' : ''} style={{ '--c': a.color } as CSSProperties} title={m.label}>
                    <ModelIcon icon={m.icon} size={12} />{a.name}
                  </span>
                )
              })}
            </div>
            <ol className="ct-steps">
              <AnimatePresence initial={false}>
                {log.map(l => {
                  const a = agentById(l.agent)
                  const bad = l.text.includes('失败')
                  return (
                    <motion.li key={l.at} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className={bad ? 'bad' : ''}>
                      <i style={{ background: a.color }} />
                      <b>{a.name}</b>
                      <span>{l.text}</span>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ol>
            {!done && <div className="ct-tok">{tokensAt(t).toLocaleString()} tokens</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface Block { cost: number; render: (k: number, onOpen: (id: PersonId) => void, live: boolean) => ReactNode }

function buildBlocks(): Block[] {
  const text = (s: string, tag: 'p' | 'h3' = 'p'): Block => {
    const len = plain(s).length
    return {
      cost: len,
      render: k => {
        const Tag = tag
        return <Tag key={s}>{rich(s, k)}</Tag>
      },
    }
  }
  const people = PEOPLE_SORTED
  const bullets = [
    '**赵一没参会，也没被点名**，但他负责的客户端依赖订单接口。影响链把 it_05 发给了他，并建议由他负责。',
    '**扩容预算约 30 万**只给林总、周宁、王珂、陈默看到金额，其他人看到的是“扩容按 A 方案推进”。',
    '**it_05 的原话一开始对不上转写**，审核官打回，抽取官重抽后才放行。10 条全部附原话。',
  ]
  return [
    text('这场会有 **10 条要点**，我按 8 个人的角色、依赖和权限分好了：**7 个人**各收到一份不同的简报，**吴桐**这次不打扰。'),
    text('谁收到了什么', 'h3'),
    {
      cost: people.length * 14,
      render: k => {
        const rows = Math.ceil(k / 14)
        return (
          <div key="table" className="ct-table-wrap">
            <table className="ct-table">
              <thead><tr><th>收件人</th><th>条数</th><th>为什么发给他</th><th>阅读</th></tr></thead>
              <tbody>
                {people.slice(0, rows).map(p => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td><span className="ct-td-name"><Face p={p} size={22} muted={isQuiet(p.id)} />{p.name}<small>{p.role}</small></span></td>
                    <td className="num">{isQuiet(p.id) ? '—' : countOf(p.id)}</td>
                    <td>
                      {isQuiet(p.id) ? <span className="ct-muted"><BellOff size={12} /> 没有必读，不打扰</span>
                        : p.host ? <span className="ct-muted">主持人：全部条目和分发情况</span>
                        : reasonsOf(p.id).map(r => <span key={r} className={`ct-tag ${r === 'R4' ? 'r4' : ''}`}>{REASONS[r]}</span>)}
                    </td>
                    <td className="num">{isQuiet(p.id) ? '—' : `${briefOf(p.id).readSeconds}s`}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      },
    },
    text('值得注意', 'h3'),
    {
      cost: bullets.reduce((s, b) => s + plain(b).length, 0),
      render: k => {
        let left = k
        return (
          <ul key="ul">
            {bullets.map(b => {
              const len = plain(b).length
              const m = Math.min(len, left)
              left -= len
              return m > 0 ? <li key={b}>{rich(b, m)}</li> : null
            })}
          </ul>
        )
      },
    },
    {
      cost: 40,
      render: (_k, onOpen) => (
        <motion.div key="cards" className="ct-cards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {people.map(p => {
            const quiet = isQuiet(p.id)
            return (
              <button key={p.id} className={`ct-card ${quiet ? 'quiet' : ''}`} onClick={() => onOpen(p.id)}>
                <div className="ct-card-top">
                  <Face p={p} size={28} muted={quiet} />
                  <div><b>{p.name}</b><small>{p.role}</small></div>
                  <em>{quiet ? '不打扰' : `${countOf(p.id)} 条`}</em>
                </div>
                <p>{briefOf(p.id).headline}</p>
                <span className="ct-card-open">在画布中打开 ↗</span>
              </button>
            )
          })}
        </motion.div>
      ),
    },
    text('点任意一张卡，在右侧画布里看他收到的飞书卡片。要我把 **赵一设为 it_05 的负责人** 并通知他确认吗？'),
  ]
}

function Actions({ engine }: { engine: EngineId }) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const m = agentModel('ext', engine)
  return (
    <motion.div className="ct-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
      <button className="ct-ib" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }} aria-label="复制">
        <MorphIcon icon={copied ? Check : Copy} size={16} strokeWidth={2} />
      </button>
      <button className={`ct-ib ${vote === 'up' ? 'on' : ''}`} onClick={() => setVote('up')} aria-label="有用"><ThumbsUp size={16} /></button>
      <button className={`ct-ib ${vote === 'down' ? 'on' : ''}`} onClick={() => setVote('down')} aria-label="没用"><ThumbsDown size={16} /></button>
      <button className="ct-ib" aria-label="重新生成"><RotateCcw size={16} /></button>
      <span className="ct-meta"><ModelIcon icon={m.icon} size={13} /> {m.label} · {TOTAL_TOKENS.toLocaleString()} tokens · {routesAt(99).length} 条推送</span>
    </motion.div>
  )
}

function Follow({ onAsk, asked }: { onAsk: (q: string) => void; asked: string[] }) {
  const left = FOLLOWUPS.filter(f => !asked.includes(f.q))
  if (!left.length) return null
  return (
    <motion.div className="ct-follow" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      {left.map(f => (
        <button key={f.q} onClick={() => onAsk(f.q)}><MessageCircleQuestion size={14} /> {f.q}</button>
      ))}
    </motion.div>
  )
}

function FollowAnswer({ text, onAsk, last, asked }: { text: string; onAsk: (q: string) => void; last: boolean; asked: string[] }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 700)
    return () => clearTimeout(id)
  }, [])
  const n = useStream(ready, false, 60)
  const len = plain(text).length
  return (
    <div className="ct-ai">
      {!ready ? <div className="ct-think-head static"><span className="ct-shimmer">正在查账本</span></div> : (
        <div className="ct-md">
          <p>{rich(text, n)}{n < len && <span className="ct-cursor" />}</p>
        </div>
      )}
      {ready && n >= len && last && <Follow onAsk={onAsk} asked={asked} />}
    </div>
  )
}

// ---------------- 右侧画布：个人简报 ----------------

function Canvas({ id, onClose, onSwitch }: { id: PersonId; onClose: () => void; onSwitch: (id: PersonId) => void }) {
  const p = personById(id)
  const b = briefOf(id)
  const quiet = isQuiet(id)
  const [tab, setTab] = useState<'card' | 'json'>('card')
  const [acted, setActed] = useState<Record<string, string>>({})
  const rows = p.host ? ITEMS.map(i => i.id) : b.entries.map(e => e.item)
  return (
    <motion.aside
      className="ct-canvas"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 'min(520px, 44vw)', opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 36 }}
    >
      <div className="ct-canvas-in">
        <header className="ct-canvas-head">
          <button className="ct-ib" onClick={onClose} aria-label="关闭"><X size={18} /></button>
          <b>{p.name} 收到的简报</b>
          <div className="ct-tabs">
            {(['card', 'json'] as const).map(k => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {tab === k && <motion.i layoutId="ct-tab" className="ct-tab-bg" />}
                <span>{k === 'card' ? '飞书卡片' : '数据'}</span>
              </button>
            ))}
          </div>
        </header>
        <div className="ct-people-strip">
          {PEOPLE_SORTED.map(x => (
            <button key={x.id} className={x.id === id ? 'on' : ''} onClick={() => onSwitch(x.id)} title={x.name}>
              <Face p={x} size={26} muted={isQuiet(x.id)} />
            </button>
          ))}
        </div>
        <div className="ct-canvas-body">
          <AnimatePresence mode="wait">
            <motion.div key={id + tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {tab === 'json' ? (
                <pre className="ct-json">{JSON.stringify({ person: p.id, headline: b.headline, read_seconds: b.readSeconds, entries: b.entries.map(e => ({ item: e.item, for_you: e.forYou, why: e.why, reasons: e.reasons })) }, null, 2)}</pre>
              ) : (
                <div className="ct-fs">
                  <div className="ct-fs-head">
                    <span>会映 · 会议简报</span>
                    <small>{DEFAULT_TITLE}</small>
                  </div>
                  <div className="ct-fs-body">
                    <div className="ct-fs-who"><Face p={p} size={36} muted={quiet} /><div><b>{p.name}</b><small>{p.role}{quiet ? '' : ` · 约 ${b.readSeconds} 秒读完`}</small></div></div>
                    <p className="ct-fs-headline">{b.headline}</p>
                    {quiet && <div className="ct-fs-quiet"><BellOff size={20} /> 这场会没有需要你必读的内容，不打扰。</div>}
                    {rows.map(iid => {
                      const it = itemById(iid)
                      const e = b.entries.find(x => x.item === iid)
                      const c = ITEM_TYPES[it.type]
                      return (
                        <div key={iid} className="ct-fs-entry" style={{ '--c': c.color, '--soft': c.soft } as CSSProperties}>
                          <div className="ct-fs-t"><span className="ct-type">{c.label}</span><b>{it.title}</b>{it.sensitivity === 'restricted' && <Lock size={12} color="#BE123C" />}</div>
                          {e && <p>{e.forYou}</p>}
                          {e && <div className="ct-fs-why">为什么发给你：{e.why} {e.reasons.map(r => <span key={r} className={`ct-tag ${r === 'R4' ? 'r4' : ''}`}>{REASON_SHORT[r]}</span>)}</div>}
                          <div className="ct-fs-q"><button aria-label="播放原声"><Play size={10} fill="currentColor" /></button>“{it.quote}”<small>{personById(it.speaker).name} {it.at}</small></div>
                          {e && it.type === 'action' && (
                            <div className="ct-fs-acts">
                              <button className={`pri ${acted[iid] === 'ok' ? 'on' : ''}`} onClick={() => setActed(s => ({ ...s, [iid]: 'ok' }))}>
                                <MorphIcon icon={acted[iid] === 'ok' ? Check : Circle} size={13} strokeWidth={2.4} />
                                {acted[iid] === 'ok' ? '已确认' : '确认'}
                              </button>
                              <button onClick={() => setActed(s => ({ ...s, [iid]: 'no' }))}><UserX size={13} /> 不是我</button>
                              <button onClick={() => setActed(s => ({ ...s, [iid]: 'ask' }))}><MessageCircleQuestion size={13} /> 追问</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}

// ---------------- 工具 ----------------

function Face({ p, size, muted }: { p: Person; size: number; muted?: boolean }) {
  return (
    <span className="ct-face" style={{ width: size, height: size, fontSize: size * 0.44, background: muted ? '#EDEDED' : p.bg, color: muted ? '#9B9B9B' : p.fg }}>
      {p.short}
    </span>
  )
}

/** “**加粗**”标记：去掉标记后的纯文本 */
const plain = (s: string) => s.replace(/\*\*/g, '')

/** 只渲染前 n 个字，保留加粗 */
function rich(s: string, n: number): ReactNode[] {
  const out: ReactNode[] = []
  let left = n
  s.split('**').forEach((part, i) => {
    if (left <= 0) return
    const piece = part.slice(0, left)
    left -= part.length
    out.push(i % 2 ? <strong key={i}>{piece}</strong> : piece)
  })
  return out
}

/** 流式输出：active 之后按每秒 cps 个字增长 */
function useStream(active: boolean, instant: boolean, cps: number) {
  const [n, setN] = useState(instant && active ? 1e6 : 0)
  useEffect(() => {
    if (!active) {
      setN(0)
      return
    }
    if (instant) {
      setN(1e6)
      return
    }
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

/** 主回答写完了没有（决定发送键是不是“停止”） */
function useStreamDone(active: boolean, instant: boolean) {
  const n = useStream(active, instant, 95)
  const total = useMemo(() => buildBlocks().reduce((s, b) => s + b.cost, 0), [])
  return active && n >= total
}
