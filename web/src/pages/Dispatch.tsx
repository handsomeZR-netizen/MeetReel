// 智能分发：对话式的智能体界面（左）+ 实时画布（右：编排时间轴 → 账本流向 → 路由矩阵 → 每人简报）。
// 投递前停下来等主持人确认（人在回路），确认后才发飞书。
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { ArrowUp, Check, ChevronDown, Copy, Square } from 'lucide'
import {
  ArrowLeft, BellOff, Check as CheckIcon, FileVideo, Mic, MessageCircleQuestion, PanelRightClose, PanelRightOpen, Paperclip, PenLine,
  Plus, RotateCcw, ShieldCheck, SquarePen, ThumbsDown, ThumbsUp, UserCheck, X,
} from 'lucide-react'
import { DEFAULT_MODELS, ME, MODELS, REASONS, personById, type ModelId, type PersonId } from '@/data/model'
import { MEETINGS, XM, itemById, meetingById } from '@/data/meetings'
import { mmss, quoteSpan } from '@/data/derive'
import {
  AGENTS, GATE_AT, LOG, PHASES, RUN_ID, RUN_MEETING, RUN_PEOPLE, RUN_PEOPLE_SORTED, T_END, TOTAL_TOKENS,
  agentById, agentModel, agentSpan, costText, isQuietIn, logAt, phaseIndex, readyAt, runBrief, runItemsAt, runRoutesAt, tokensAt, usedModels,
} from '@/data/run'
import { go, goSource, href, useRoute } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { useClock } from '@/lib/useClock'
import { cn, cnDate } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Face, FaceStack, Kb, ModelIcon, RankTag } from '@/components/common/bits'
import { FeishuCard } from '@/components/common/FeishuCard'
import { Switch } from '@/components/ui/misc'
import { rich, richLen, useStream } from '@/components/common/stream'
import { AgentTimeline } from '@/components/dispatch/AgentTimeline'
import { RoutingBoard } from '@/components/dispatch/RoutingBoard'
import { Matrix } from '@/components/sketch/Matrix'
import { BriefPaper, StickyNotes } from '@/components/sketch/Briefs'

type CanvasTab = 'run' | 'flow' | 'matrix' | 'briefs'
type Msg = { id: number; q: string; a: string; kind?: 'assign' }

const FOLLOWUPS: { q: string; a: string }[] = [
  { q: '为什么许诺没收到？', a: '许诺关注的是**电子安全**。直播开场说了分两部分 [[xm_02]]，电子安全在第二部分，这段 9 分 49 秒的录像里没有。他没有必读内容，**不单独打扰**；第二部分接入后再推给他。' },
  { q: '和我们自己的安委会比，差在哪？', a: '差在**评审机制**。对方：所有环节业务评估后还要过安委会评估 [[xm_09]]，安全有**一票否决权** [[xm_10]]。我们：10/28 安全周会上宋岚说安委会只做事后通报，**评审里没有否决权** [[sf_01]]，她准备下月经营会提方案让安全评审变成一道关 [[sf_02]]。这两条已经在宋岚和韩总的简报里。' },
  { q: '“3500 人”这个数字可靠吗？', a: '是直播里说的，但要注意**谁说的**：“超过了3500人”是爽哥接话 [[xm_08]]，侯静雷随后答了“是”。审核官一开始发现抽取官挂错了说话人，打回重抽过一次。给韩总的简报里写的是“安全相关团队超过 3500 人”。' },
  { q: '韩总为什么收到 5 条？', a: '韩总是 **L1 高管**，走管理者规则 R6：竞品的**目标** [[xm_06]]、**组织机制** [[xm_07]] [[xm_10]]、**投入规模** [[xm_08]] [[xm_04]]。具体的开发细节（座椅、二次伤害）只发给负责的魏然，不占高管的时间。' },
]

export function Dispatch({ id }: { id?: string }) {
  const route = useRoute()
  const meeting = id ? meetingById(id) : undefined
  if (meeting && meeting.id !== RUN_ID) return <AlreadySent id={meeting.id} />
  return <DispatchView key={id ?? 'new'} attachedAtStart={!!meeting} autorun={route.query.has('run')} />
}

function DispatchView({ attachedAtStart, autorun }: { attachedAtStart: boolean; autorun: boolean }) {
  const already = useStore(s => s.dispatched[RUN_ID])
  const models = useStore(s => s.models)
  const [approved, setApproved] = useState(already)
  const clock = useClock(T_END, { t: already ? T_END : 0, stopAt: approved ? null : GATE_AT })
  const [stage, setStage] = useState<'welcome' | 'run'>(already ? 'run' : 'welcome')
  const [attached, setAttached] = useState(attachedAtStart || autorun)
  const [instant] = useState(already)
  const [canvas, setCanvas] = useState(true)
  const [ctab, setCtab] = useState<CanvasTab>(already ? 'briefs' : 'run')
  const [follow, setFollow] = useState(!already)
  const [person, setPerson] = useState<PersonId | null>(null)
  const [paper, setPaper] = useState<PersonId | null>(null)
  const [draft, setDraft] = useState('')
  const [extra, setExtra] = useState<Msg[]>([])
  const t = clock.t
  const running = stage === 'run'
  const done = running && t >= T_END
  const gated = running && !approved && t >= GATE_AT - 0.001

  const start = () => {
    setStage('run')
    setApproved(false)
    setExtra([])
    clock.pause()
    clock.seek(0)
    setFollow(true)
    setCtab('run')
    setTimeout(() => clock.play(), 600)
  }
  const reset = () => {
    clock.pause()
    clock.seek(0)
    setStage('welcome')
    setAttached(false)
    setExtra([])
    setPerson(null)
    go('/dispatch')
  }
  const approve = () => {
    setApproved(true)
    setTimeout(() => clock.play(), 50)
  }

  useEffect(() => {
    if (autorun && !already) start()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (done) actions.dispatch(RUN_ID)
  }, [done])

  // 画布跟随进度切页
  useEffect(() => {
    if (!follow || !running) return
    const next: CanvasTab = done ? 'briefs' : gated ? 'matrix' : t < 10.3 ? 'run' : t < 14.5 ? 'flow' : 'briefs'
    setCtab(next)
  }, [follow, running, t, gated, done])

  const answerDone = useStreamDone(done, instant)
  const generating = running && !answerDone

  const ask = (q: string) => {
    const hit = FOLLOWUPS.find(f => f.q === q)
    setExtra(x => [...x, { id: Date.now(), q, a: hit?.a ?? '这个问题会映还答不上来。可以问：为什么许诺没收到？和我们自己的安委会比，差在哪？' }])
    setDraft('')
  }
  const assign = () => {
    actions.assign('xm_18', 'linxia')
    setExtra(x => [...x, { id: Date.now(), q: '好，交给林夏核实', a: '已指派给你组里的**林夏**（L4 竞品研究专员）。她会收到一张带原话的卡片 [[xm_18]]，点“我来负责”后，这条在账本里就有了负责人；核实结果会回到你的发布者版。', kind: 'assign' }])
  }
  const send = () => {
    if (!running) {
      if (attached) start()
      return
    }
    if (draft.trim() && !generating) ask(draft.trim())
  }
  const openBrief = (pid: PersonId) => {
    setCanvas(true)
    setFollow(false)
    setCtab('briefs')
    setPerson(pid)
  }

  // 新内容出现时，若停在底部附近就跟着滚
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  })

  return (
    <>
      <TopBar crumbs={[{ label: '智能分发', to: '/dispatch' }, ...(running || attached ? [{ label: RUN_MEETING.title }] : [])]}>
        <ModelPicker models={models} />
        {running && (
          <button className="text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={() => setCanvas(c => !c)} aria-label="画布" title={canvas ? '收起画布' : '打开画布'}>
            {canvas ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        )}
        <button className="text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={reset} title="新对话"><SquarePen size={16} /></button>
      </TopBar>

      <LayoutGroup>
        <div className={cn('grid min-h-0 flex-1', running && canvas ? 'grid-cols-[minmax(400px,0.9fr)_minmax(0,1.15fr)]' : 'grid-cols-1')}>
          <div className="relative flex min-h-0 flex-col">
            <div
              ref={scroller}
              className={cn('min-h-0 flex-1 overflow-y-auto', !running && 'flex items-end justify-center')}
              onScroll={e => {
                const el = e.currentTarget
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
              }}
            >
              {running ? (
                <div className="mx-auto max-w-[760px] px-6 pt-4 pb-10">
                  <UserMessage />
                  <Answer
                    t={t} models={models} instant={instant} gated={gated} approved={approved}
                    onApprove={approve} onMatrix={() => { setCanvas(true); setFollow(false); setCtab('matrix') }}
                    onOpen={openBrief} onCanvas={() => { setCanvas(true); setFollow(true) }}
                    onAsk={ask} onAssign={assign} showFollow={answerDone && !extra.length}
                  />
                  {extra.map((msg, i) => (
                    <div key={msg.id}>
                      <motion.div className="mt-4 mb-6 flex justify-end" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="max-w-[75%] rounded-[22px] bg-[#F4F4F4] px-[18px] py-2.5 text-[15px] leading-relaxed">{msg.q}</div>
                      </motion.div>
                      <FollowAnswer msg={msg} onAsk={ask} last={i === extra.length - 1} asked={extra.map(e => e.q)} />
                    </div>
                  ))}
                </div>
              ) : (
                <Welcome attached={attached} onAttach={() => setAttached(true)} />
              )}
            </div>

            <motion.div layout className={cn('relative mx-auto w-full max-w-[808px] flex-none px-6 pb-3', !running && 'mb-[24vh]')} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
              {running && <div className="pointer-events-none absolute inset-x-0 -top-7 h-7 bg-gradient-to-b from-transparent to-white" />}
              <Composer
                attached={attached && !running}
                onDetach={() => setAttached(false)}
                onAttach={() => setAttached(true)}
                draft={draft}
                onDraft={setDraft}
                onSend={send}
                generating={generating}
                canSend={running ? !!draft.trim() : attached}
                placeholder={running ? '继续追问，例如：和我们自己的安委会比，差在哪？' : attached ? '' : '把会议录像、录音或文本交给会映'}
              />
              <p className="text-ink-3 mt-2 text-center text-[12px]">会映会出错，重要事项请点原话回到录像核实。</p>
            </motion.div>
          </div>

          <AnimatePresence>
            {running && canvas && (
              <motion.aside
                key="canvas"
                className="flex min-h-0 flex-col border-l bg-[#FBFBFA]"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                transition={{ type: 'spring', stiffness: 300, damping: 34 }}
              >
                <CanvasHead tab={ctab} onTab={v => { setCtab(v); setFollow(false); setPerson(null) }} follow={follow} onFollow={setFollow} t={t} gated={gated} done={done} onClose={() => setCanvas(false)} />
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  <AnimatePresence mode="wait">
                    <motion.div key={ctab + (person ?? '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                      {ctab === 'run' && <RunTab clock={clock} models={models} gated={gated} />}
                      {ctab === 'flow' && <FlowTab t={t} onOpen={openBrief} />}
                      {ctab === 'matrix' && <MatrixTab t={t} gated={gated} onApprove={approve} onOpen={openBrief} />}
                      {ctab === 'briefs' && (person
                        ? <BriefView pid={person} onPick={setPerson} onBack={() => setPerson(null)} onPaper={() => setPaper(person)} />
                        : <BriefsTab t={t} done={done} onOpen={openBrief} />)}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
      <BriefPaper meeting={RUN_ID} pid={paper} onClose={() => setPaper(null)} />
    </>
  )
}

// ---------------- 已经分发过的其他会议 ----------------

function AlreadySent({ id }: { id: string }) {
  const m = meetingById(id)!
  return (
    <>
      <TopBar crumbs={[{ label: '智能分发', to: '/dispatch' }, { label: m.title }]} />
      <div className="grid flex-1 place-items-center">
        <div className="text-center">
          <span className="text-ink-3 kb-icon-in inline-block"><Kb name="mailbox" size={64} /></span>
          <h2 className="mt-3 text-lg font-semibold">{m.title} 已于 {cnDate(m.date)} 分发</h2>
          <p className="text-ink-3 mt-1 text-sm">{new Set(m.routes.map(r => r.person)).size} 人收到了各自的简报，确认和追问都在回流里。</p>
          <div className="mt-4 flex justify-center gap-2">
            <a className="rounded-lg border px-3 py-1.5 text-sm hover:bg-black/5" href={href(`/m/${m.id}`, { tab: 'dist' })}>看分发结果</a>
            <a className="bg-ink rounded-lg px-3 py-1.5 text-sm text-white" href={href(`/dispatch/${RUN_ID}`)}>去分发{RUN_MEETING.title.replace(/ · .*/, '')}</a>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------- 顶栏：模型选择 ----------------

function ModelPicker({ models }: { models: ModelId[] }) {
  const [open, setOpen] = useState(false)
  const multi = models.length > 1
  const used = usedModels(models)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  return (
    <div className="relative">
      <button className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13.5px] font-semibold hover:bg-black/5" onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        <span className="flex items-center">{used.slice(0, 5).map((id, i) => <span key={id} className="grid size-[19px] place-items-center rounded-full bg-white ring-2 ring-white" style={{ marginLeft: i ? -5 : 0 }}><ModelIcon icon={id} size={14} /></span>)}</span>
        {multi ? `多模型协同 · ${used.length}` : MODELS.find(m => m.id === models[0])!.label}
        <motion.span className="text-ink-3 inline-grid" animate={{ rotate: open ? 180 : 0 }}><MorphIcon icon={ChevronDown} size={14} strokeWidth={2} /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-10 right-0 z-30 w-[400px] origin-top-right rounded-2xl border bg-white p-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,.18)]"
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-1.5 pt-1 pb-2">
              <div className="flex rounded-lg bg-[#F2F3F5] p-0.5 text-[12px]">
                <button onClick={() => actions.setModels(DEFAULT_MODELS)} className={cn('h-6 rounded-md px-2', multi ? 'text-ink bg-white font-medium shadow-sm' : 'text-ink-3')}>多模型协同</button>
                <button onClick={() => actions.setModels([models[0]])} className={cn('h-6 rounded-md px-2', !multi ? 'text-ink bg-white font-medium shadow-sm' : 'text-ink-3')}>单一模型</button>
              </div>
              <span className="text-ink-3 ml-auto text-[11.5px]">{costText(99, models)} / 场</span>
            </div>
            <div className="grid max-h-[340px] grid-cols-2 gap-1 overflow-y-auto">
              {MODELS.map(m => {
                const on = models.includes(m.id)
                return (
                  <button key={m.id} className={cn('flex items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-[#F4F4F4]', on && 'bg-[#F4F6FB]')} onClick={() => (multi ? actions.toggleModel(m.id) : actions.setModels([m.id]))}>
                    <ModelIcon icon={m.id} size={18} />
                    <span className="min-w-0 flex-1 leading-tight"><b className="block text-[13px] font-medium">{m.label}</b><small className="text-ink-3 text-[11px]">{m.vendor}{m.open ? ' · 可私有化' : ''}</small></span>
                    <span className="grid w-4 place-items-center">{on && <MorphIcon icon={Check} size={14} strokeWidth={2.6} />}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 border-t px-1.5 pt-2 text-[11.5px]">
              {AGENTS.filter(a => !['orc', 'scribe', 'disp'].includes(a.id)).map(a => {
                const b = agentModel(a.id, models)
                return <span key={a.id} className="text-ink-2 inline-flex items-center gap-1"><i className="size-1.5 rounded-full" style={{ background: a.color }} />{a.name}<ModelIcon icon={b.icon} size={12} />{b.label.replace('规则 + ', '')}</span>
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------- 欢迎页 ----------------

function Welcome({ attached, onAttach }: { attached: boolean; onAttach: () => void }) {
  const dispatched = useStore(s => s.dispatched)
  const pending = MEETINGS.filter(m => !dispatched[m.id])
  return (
    <motion.div className="w-full max-w-[760px] px-6 pb-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.span className="text-ink kb-icon-in mb-3 inline-block" initial={{ rotate: -8 }} animate={{ rotate: 0 }}><Kb name="paperPlane" size={56} /></motion.span>
      <motion.h1 className="text-[30px] font-semibold tracking-tight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>开完会了？交给我按人分发。</motion.h1>
      <p className="text-ink-3 mt-2 text-[14.5px]">8 个智能体抽账本、按人路由、逐人改写；发出去之前，先给你看一眼。</p>
      <motion.div className="mt-6 flex flex-wrap justify-center gap-2" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}>
        {pending.map(m => (
          <motion.button
            key={m.id}
            variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}
            onClick={onAttach}
            className={cn('kb-tile inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px]', attached ? 'border-ink bg-white' : 'border-ink shadow-[0_0_0_3px_rgba(0,0,0,.05)]')}
          >
            <FileVideo size={16} /> {m.title}<span className="rounded-md bg-amber-100 px-1.5 text-[11.5px] text-amber-700">待分发</span>
          </motion.button>
        ))}
        {[{ icon: Mic, label: '上传会议录音' }, { icon: Paperclip, label: '导入飞书妙记' }].map(({ icon: I, label }) => (
          <motion.a key={label} href={href('/new')} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }} className="kb-tile text-ink-2 inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px]">
            <I size={16} /> {label}
          </motion.a>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ---------------- 输入框 ----------------

function Composer(props: { attached: boolean; onDetach: () => void; onAttach: () => void; draft: string; onDraft: (v: string) => void; onSend: () => void; generating: boolean; canSend: boolean; placeholder: string }) {
  const { attached, onDetach, onAttach, draft, onDraft, onSend, generating, canSend, placeholder } = props
  return (
    <div className="rounded-[28px] bg-white p-2.5 shadow-[0_0_0_1px_rgba(0,0,0,.08),0_6px_20px_-6px_rgba(0,0,0,.1)] transition-shadow focus-within:shadow-[0_0_0_1px_rgba(0,0,0,.14),0_8px_24px_-6px_rgba(0,0,0,.14)]">
      <AnimatePresence>
        {attached && (
          <motion.div className="overflow-hidden px-1.5 pt-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <FileChip onRemove={onDetach} />
            <div className="px-1.5 pt-2.5 pb-1.5 text-left text-[15px]">把这场会按人分发：每人只收和自己有关的，附原话和理由。</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-end gap-1">
        <button className="text-ink-2 grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="添加附件" onClick={onAttach}><Plus size={19} /></button>
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
          className="placeholder:text-ink-3 max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-[15px] leading-6 outline-none"
        />
        <button className="text-ink-2 grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="语音"><Mic size={18} /></button>
        <button className={cn('grid size-9 place-items-center rounded-full text-white transition-[background,transform]', canSend || generating ? 'bg-ink hover:scale-105' : 'bg-[#D7D7D7]')} onClick={onSend} aria-label={generating ? '停止' : '发送'}>
          <MorphIcon icon={generating ? Square : ArrowUp} size={generating ? 14 : 18} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}

function FileChip({ onRemove, sent }: { onRemove?: () => void; sent?: boolean }) {
  return (
    <div className={cn('relative inline-flex items-center gap-2.5 rounded-2xl border bg-white py-2 pl-2 text-left', sent ? 'pr-4' : 'pr-9')}>
      <img src={XM.video!.poster} alt="" className="h-11 w-[25px] flex-none rounded-[6px] object-cover" draggable={false} />
      <div className="leading-tight">
        <b className="block text-[13.5px] font-semibold">小米汽车安全专场直播.mp4</b>
        <small className="text-ink-3 text-[12px]">直播录像 · 09:49 · {XM.segments.length} 段发言 · 8 位收到者{sent ? '' : ' · 关注档案已加载'}</small>
      </div>
      {onRemove && <button className="bg-ink absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full text-white" onClick={onRemove} aria-label="移除"><X size={12} /></button>}
    </div>
  )
}

function UserMessage() {
  return (
    <motion.div className="mt-4 mb-6 flex flex-col items-end gap-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <FileChip sent />
      <div className="max-w-[75%] rounded-[22px] bg-[#F4F4F4] px-[18px] py-2.5 text-[15px] leading-relaxed">把这场会按人分发：每人只收和自己有关的，附原话和理由。</div>
    </motion.div>
  )
}

// ---------------- 主回答 ----------------

function Answer(p: {
  t: number; models: ModelId[]; instant: boolean; gated: boolean; approved: boolean
  onApprove: () => void; onMatrix: () => void; onOpen: (id: PersonId) => void; onCanvas: () => void
  onAsk: (q: string) => void; onAssign: () => void; showFollow: boolean
}) {
  const { t, models, instant, gated, approved } = p
  const done = t >= T_END
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? !done
  const n = useStream(done, instant, 95)
  const blocks = useMemo(() => buildBlocks(), [])
  const total = blocks.reduce((s, b) => s + b.cost, 0)
  const streaming = done && n < total
  const owners = useStore(s => s.owners)

  let budget = n
  const shown: ReactNode[] = []
  for (const b of blocks) {
    if (budget <= 0) break
    const k = Math.min(b.cost, budget)
    shown.push(b.render(k, p.onOpen))
    budget -= b.cost
  }

  return (
    <div className="mb-7 text-[15px] leading-[1.75]">
      <Thinking t={t} models={models} open={open} onToggle={() => setUserOpen(!open)} onCanvas={p.onCanvas} />
      <AnimatePresence>
        {(gated || (approved && t >= GATE_AT && !instant)) && (
          <Approval key="gate" pending={gated} onApprove={p.onApprove} onMatrix={p.onMatrix} />
        )}
      </AnimatePresence>
      <div className="chat-md">
        {shown}
        {streaming && budget <= 0 && <span className="cursor-dot" />}
      </div>
      {done && n >= total && (
        <>
          <Actions models={models} />
          {!owners.xm_18 && (
            <motion.div className="mt-3 flex flex-wrap gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <button onClick={p.onAssign} className="bg-ink inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[14px] text-white transition-transform hover:-translate-y-px"><UserCheck size={15} /> 好，交给林夏核实</button>
              <button onClick={() => goSource(RUN_ID, Math.max(0, quoteSpan(itemById('xm_18')).t0 - 0.4), 'xm_18')} className="text-ink-2 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[14px] hover:bg-[#F4F4F4]">先回录像听一下原话</button>
            </motion.div>
          )}
          {p.showFollow && <Follow onAsk={p.onAsk} asked={[]} />}
        </>
      )}
    </div>
  )
}

function Thinking({ t, models, open, onToggle, onCanvas }: { t: number; models: ModelId[]; open: boolean; onToggle: () => void; onCanvas: () => void }) {
  const done = t >= T_END
  const log = logAt(t)
  const phase = PHASES[phaseIndex(t)]
  const busy = AGENTS.filter(a => agentSpan(a.id, t))
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <button className="text-ink-2 inline-flex items-center gap-1.5 py-1 text-[15px]" onClick={onToggle}>
          {done ? <span>已编排 8 个智能体，用时 20 秒</span> : (
            <>
              <span className="shimmer-text">正在编排</span>
              <span className="text-ink-3 text-[14px]">· {phase.label}{busy.length ? ` · ${busy.map(a => a.name).join('、')}` : ''}</span>
            </>
          )}
          <motion.span className="text-ink-3 inline-block text-lg leading-none" animate={{ rotate: open ? 90 : 0 }}>›</motion.span>
        </button>
        <button className="text-primary ml-auto text-[12.5px] hover:underline" onClick={onCanvas}>在画布里看时间轴 ↗</button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="think-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
            <div className="think-phases">
              {PHASES.map((ph, i) => <span key={ph.id} className={i < phaseIndex(t) || done ? 'past' : i === phaseIndex(t) ? 'on' : ''}>{ph.label}</span>)}
            </div>
            <div className="think-chips">
              {AGENTS.map(a => {
                const on = busy.includes(a)
                const m = agentModel(a.id, models)
                return <span key={a.id} className={on ? 'on' : ''} style={{ '--c': a.color } as CSSProperties} title={m.label}><ModelIcon icon={m.icon} size={12} />{a.name}</span>
              })}
            </div>
            <ol className="think-steps">
              <AnimatePresence initial={false}>
                {log.map(l => {
                  const a = agentById(l.agent)
                  return (
                    <motion.li key={l.at} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className={l.text.includes('失败') ? 'bad' : ''}>
                      <i style={{ background: a.color }} /><b>{a.name}</b><span>{l.text}</span>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ol>
            {!done && <div className="text-ink-3 mt-2 text-[12px] tabular-nums">{tokensAt(t).toLocaleString()} tokens</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 投递前的确认卡：像编码助手请求执行命令那样，等主持人点“确认发送” */
function Approval({ pending, onApprove, onMatrix }: { pending: boolean; onApprove: () => void; onMatrix: () => void }) {
  const recips = RUN_PEOPLE.filter(pid => !isQuietIn(pid))
  return (
    <motion.div
      layout
      className={cn('my-3 overflow-hidden rounded-2xl border', pending ? 'border-ink shadow-[0_10px_30px_-16px_rgba(0,0,0,.35)]' : 'bg-[#FAFAFA]')}
      initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
    >
      {pending ? (
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-ink kb-wiggle on"><Kb name="paperPlane" size={34} /></span>
            <div className="min-w-0 flex-1 leading-snug">
              <div className="text-[15px] font-semibold">投递官请求发送 7 份简报</div>
              <div className="text-ink-3 text-[13px]">7 张飞书卡片 + 7 个 H5 链接 · 发出后会通知到个人</div>
            </div>
            <FaceStack ids={recips} size={24} max={7} />
          </div>
          <ul className="text-ink-2 mt-3 grid gap-1.5 text-[13.5px]">
            <li className="flex items-center gap-2"><BellOff size={14} className="text-ink-3" /> 许诺只关注电子安全，本段没有，不打扰，只进日报</li>
            <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-600" /> 20 条都是直播公开内容，没有受限条目；只引用原话，不替发言人补充</li>
            <li className="flex items-center gap-2"><PenLine size={14} className="text-amber-600" /> xm_18“应该是行业内首个”是绝对化表述，已标待核实</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <button onClick={onApprove} className="bg-ink inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-medium text-white transition-transform hover:-translate-y-px"><MorphIcon icon={Check} size={15} strokeWidth={2.6} /> 确认发送</button>
            <button onClick={onMatrix} className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-4 py-2 text-[14px] hover:bg-[#F4F4F4]">先看分发矩阵</button>
          </div>
        </div>
      ) : (
        <div className="text-ink-2 flex items-center gap-2 px-4 py-2.5 text-[13.5px]">
          <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><CheckIcon size={12} strokeWidth={3} /></span>
          {personById(ME).name} 已确认发送 · 7 份简报
        </div>
      )}
    </motion.div>
  )
}

// ---------------- 回答内容（可流式输出的块） ----------------

interface Block { cost: number; render: (k: number, onOpen: (id: PersonId) => void) => ReactNode }

function buildBlocks(): Block[] {
  const text = (s: string, tag: 'p' | 'h3' = 'p'): Block => ({
    cost: richLen(s),
    render: k => {
      const Tag = tag
      return <Tag key={s}>{rich(s, k)}</Tag>
    },
  })
  const people = RUN_PEOPLE_SORTED
  const bullets = [
    '**直播里没人点到我们任何一个人的名**，R1、R2 一条都没命中。全靠负责（R3）、订阅（R5）和管理者规则（R6），“谁被提到就发给谁”在这里一份都发不出去。',
    '**同一句“同档最安全”** [[xm_06]] 发给了 3 个人：对韩总是竞争目标，对你是定位口径，对邓凯是门店会被问到的话。',
    '**xm_08 一开始挂错了人**：“超过了3500人”是爽哥接话、侯静雷确认 [[xm_08]]，审核官打回重抽。20 条全部附原话，点一下就回到录像。',
  ]
  return [
    text('这场直播有 **20 条要点**，我按 8 个人的职级、负责的事和订阅分好了：**7 个人**各收到一份不同的简报，**许诺**这次不打扰。'),
    text('谁收到了什么', 'h3'),
    {
      cost: people.length * 14,
      render: k => {
        const rows = Math.ceil(k / 14)
        return (
          <div key="table" className="mt-1 mb-2 overflow-hidden rounded-2xl border">
            <table className="w-full border-collapse text-[13.5px]">
              <thead><tr className="bg-[#FAFAFA]">{['收到者', '条数', '为什么发给 TA', '阅读'].map(h => <th key={h} className="border-b px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {people.slice(0, rows).map(pp => {
                  const quiet = isQuietIn(pp.id)
                  const b = runBrief(pp.id)
                  const reasons = [...new Set(RUN_MEETING.routes.filter(r => r.person === pp.id).flatMap(r => r.reasons))]
                  return (
                    <motion.tr key={pp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b last:border-0">
                      <td className="px-3 py-2"><span className="inline-flex items-center gap-2 font-medium whitespace-nowrap"><Face p={pp} size={22} muted={quiet} />{pp.name}<RankTag p={pp} /></span></td>
                      <td className="px-3 py-2 tabular-nums">{quiet ? '—' : b.host ? RUN_MEETING.items.length : b.entries.length}</td>
                      <td className="px-3 py-2">
                        {quiet ? <span className="text-ink-3 inline-flex items-center gap-1 text-[12.5px]"><BellOff size={12} /> 没有必读，不打扰</span>
                          : b.host ? <span className="text-ink-3 text-[12.5px]">发布者：全部条目和分发情况</span>
                          : reasons.map(r => <span key={r} className={cn('mr-1 inline-block rounded-full px-2 text-[12px] leading-[1.6]', r === 'R4' ? 'bg-ink text-white' : 'text-ink-2 bg-[#F2F2F2]')}>{REASONS[r]}</span>)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{quiet ? '—' : `${b.readSeconds}s`}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      },
    },
    text('值得注意', 'h3'),
    {
      cost: bullets.reduce((s, b) => s + richLen(b), 0),
      render: k => {
        let left = k
        return (
          <ul key="ul">
            {bullets.map(b => {
              const len = richLen(b)
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
        <motion.div key="cards" className="mt-1.5 mb-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {people.map(pp => {
            const quiet = isQuietIn(pp.id)
            const b = runBrief(pp.id)
            return (
              <button key={pp.id} className={cn('kb-tile flex flex-col rounded-2xl border bg-white p-3 text-left', quiet && 'border-dashed bg-[#FAFAFA]')} onClick={() => onOpen(pp.id)}>
                <div className="flex items-center gap-2">
                  <Face p={pp} size={28} muted={quiet} />
                  <div className="min-w-0 leading-tight"><b className="block text-[13.5px]">{pp.name}</b><small className="text-ink-3 text-[11.5px]">{b.host ? '发布者版' : pp.role}</small></div>
                  <em className="ml-auto rounded-full bg-[#F2F2F2] px-2 py-0.5 text-[11.5px] font-semibold not-italic">{quiet ? '不打扰' : `${b.host ? RUN_MEETING.items.length : b.entries.length} 条`}</em>
                </div>
                <p className="text-ink-2 my-2 line-clamp-3 text-[12.5px] leading-[1.55]">{b.headline}</p>
                <span className="text-ink-3 mt-auto text-[12px]">在画布中打开 ↗</span>
              </button>
            )
          })}
        </motion.div>
      ),
    },
    text('点任意一张卡，在右侧画布里看 TA 收到的飞书卡片。**xm_18“行业内首个”**还没人核实出处，要我交给你组里的**林夏**去核实吗？'),
  ]
}

function Actions({ models }: { models: ModelId[] }) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const used = usedModels(models)
  const ib = 'text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5'
  return (
    <motion.div className="-ml-2 flex items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
      <button className={ib} onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }} aria-label="复制"><MorphIcon icon={copied ? Check : Copy} size={16} strokeWidth={2} /></button>
      <button className={cn(ib, vote === 'up' && 'text-ink')} onClick={() => setVote('up')} aria-label="有用"><ThumbsUp size={16} /></button>
      <button className={cn(ib, vote === 'down' && 'text-ink')} onClick={() => setVote('down')} aria-label="没用"><ThumbsDown size={16} /></button>
      <button className={ib} aria-label="重新生成"><RotateCcw size={16} /></button>
      <span className="text-ink-3 ml-2 inline-flex items-center gap-1.5 text-[12px]">{used.map(id => <ModelIcon key={id} icon={id} size={13} />)} {used.length > 1 ? `${used.length} 个模型协同` : MODELS.find(x => x.id === used[0])!.label} · {TOTAL_TOKENS.toLocaleString()} tokens · {costText(99, models)} · {RUN_MEETING.routes.length} 条推送</span>
    </motion.div>
  )
}

function Follow({ onAsk, asked }: { onAsk: (q: string) => void; asked: string[] }) {
  const left = FOLLOWUPS.filter(f => !asked.includes(f.q))
  if (!left.length) return null
  return (
    <motion.div className="mt-3 flex flex-col items-start gap-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      {left.map(f => (
        <button key={f.q} onClick={() => onAsk(f.q)} className="text-ink-2 hover:text-ink inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[14px] hover:bg-[#F4F4F4]"><MessageCircleQuestion size={14} /> {f.q}</button>
      ))}
    </motion.div>
  )
}

function FollowAnswer({ msg, onAsk, last, asked }: { msg: Msg; onAsk: (q: string) => void; last: boolean; asked: string[] }) {
  const [ready, setReady] = useState(false)
  const confirmedBy = useStore(s => s.confirmed.xm_18)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 700)
    return () => clearTimeout(id)
  }, [])
  const n = useStream(ready, false, 60)
  const len = richLen(msg.a)
  return (
    <div className="mb-7 text-[15px] leading-[1.75]">
      {!ready ? <div className="py-1"><span className="shimmer-text">{msg.kind === 'assign' ? '正在更新账本' : '正在查账本和录像'}</span></div> : (
        <div className="chat-md"><p>{rich(msg.a, n)}{n < len && <span className="cursor-dot" />}</p></div>
      )}
      {msg.kind === 'assign' && ready && n >= len && (
        <motion.div className="text-ink-2 -mt-1 mb-2 flex items-center gap-2 text-[13.5px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {confirmedBy
            ? <><span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><CheckIcon size={12} strokeWidth={3} /></span> 林夏 已确认负责核实 xm_18 · 刚刚</>
            : <><span className="live-dot" /> 等待林夏确认…</>}
        </motion.div>
      )}
      {ready && n >= len && last && <Follow onAsk={onAsk} asked={asked} />}
    </div>
  )
}

// ---------------- 画布 ----------------

const CTABS: { id: CanvasTab; label: string }[] = [
  { id: 'run', label: '编排' },
  { id: 'flow', label: '分发' },
  { id: 'matrix', label: '矩阵' },
  { id: 'briefs', label: '简报' },
]

function CanvasHead({ tab, onTab, follow, onFollow, t, gated, done, onClose }: { tab: CanvasTab; onTab: (t: CanvasTab) => void; follow: boolean; onFollow: (v: boolean) => void; t: number; gated: boolean; done: boolean; onClose: () => void }) {
  return (
    <div className="flex h-12 flex-none items-center gap-2 border-b bg-white px-3">
      <div className="flex rounded-full bg-[#F2F2F2] p-[3px]">
        {CTABS.map(x => (
          <button key={x.id} className={cn('relative h-7 rounded-full px-3 text-[12.5px]', tab === x.id ? 'text-ink font-medium' : 'text-ink-3')} onClick={() => onTab(x.id)}>
            {tab === x.id && <motion.i layoutId="ctab" className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.1)]" />}
            <span className="relative">{x.label}</span>
          </button>
        ))}
      </div>
      <span className="text-ink-3 ml-1 inline-flex items-center gap-1.5 text-[12px]">
        {done ? <><span className="size-1.5 rounded-full bg-emerald-500" /> 已投递</> : gated ? <><span className="size-1.5 rounded-full bg-amber-500" /> 等你确认</> : <><span className="live-dot" /> {PHASES[phaseIndex(t)].label}</>}
      </span>
      <label className="text-ink-2 ml-auto flex items-center gap-1.5 text-[12px]"><Switch checked={follow} onCheckedChange={onFollow} /> 跟随进度</label>
      <button className="text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={onClose} aria-label="关闭画布"><X size={16} /></button>
    </div>
  )
}

function RunTab({ clock, models, gated }: { clock: ReturnType<typeof useClock>; models: ModelId[]; gated: boolean }) {
  const log = LOG.filter(l => clock.t >= l.at).slice().reverse()
  return (
    <div className="flex flex-col gap-4">
      <AgentTimeline clock={clock} models={models} gated={gated} />
      <div className="rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-2.5"><b className="text-[13.5px]">运行日志</b><span className="text-ink-3 text-[12px]">{log.length} 条事件</span></div>
        <div className="max-h-[260px] overflow-y-auto p-2">
          <AnimatePresence initial={false}>
            {log.map(l => {
              const a = agentById(l.agent)
              const bad = l.text.includes('失败')
              return (
                <motion.div key={l.at} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className={cn('flex gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-black/[.03]', bad && 'text-rose-600')}>
                    <span className="text-ink-3 w-10 flex-none font-mono text-[11.5px] leading-5 tabular-nums">{l.at.toFixed(1)}s</span>
                    <span className="mt-1.5 size-2 flex-none rounded-full" style={{ background: a.color }} />
                    <span><b className="font-medium">{a.name}</b> <span className={bad ? '' : 'text-ink-2'}>{l.text}</span></span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function FlowTab({ t, onOpen }: { t: number; onOpen: (id: PersonId) => void }) {
  const kpis = [
    { v: runItemsAt(t).length, l: '条目' },
    { v: runRoutesAt(t).length, l: '条推送' },
    { v: t >= 19.1 ? 7 : 0, l: '份已送达' },
  ]
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <b className="text-[15px]">会议账本 → 收件人</b>
          <p className="text-ink-3 mt-0.5 text-[12.5px]">推送看相关，可见看权限。悬停任一端只看它的连线。</p>
        </div>
        <div className="flex gap-1.5">
          {kpis.map(k => (
            <div key={k.l} className="flex min-w-[64px] flex-col items-end rounded-xl border bg-[#FAFAF8] px-2.5 py-1">
              <motion.b key={k.v} className="text-lg leading-tight" initial={{ y: -6, opacity: 0.3 }} animate={{ y: 0, opacity: 1 }}>{k.v}</motion.b>
              <span className="text-ink-3 text-[11px]">{k.l}</span>
            </div>
          ))}
        </div>
      </div>
      <RoutingBoard t={t} onOpen={onOpen} />
    </div>
  )
}

function MatrixTab({ t, gated, onApprove, onOpen }: { t: number; gated: boolean; onApprove: () => void; onOpen: (id: PersonId) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {gated && (
        <motion.div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-amber-700"><Kb name="stamp" size={30} /></span>
          <div className="min-w-0 flex-1 text-[13.5px] leading-snug">
            <b>发送前看一眼：</b>这是路由官给出的分发矩阵。直播里没点任何人的名，每一格都写着理由：负责、订阅或管理者规则。
          </div>
          <button onClick={onApprove} className="bg-ink flex-none rounded-xl px-3.5 py-2 text-[13.5px] text-white">确认发送</button>
        </motion.div>
      )}
      <Matrix meeting={RUN_MEETING} t={t} onOpen={onOpen} onItem={it => goSource(RUN_ID, Math.max(0, quoteSpan(it).t0 - 0.4), it.id)} />
    </div>
  )
}

function BriefsTab({ t, done, onOpen }: { t: number; done: boolean; onOpen: (id: PersonId) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Kb name="mailbox" size={26} />
        <b className="font-hand text-[20px]">每人一份简报</b>
        <span className="text-ink-3 text-[12.5px]">{done ? '· 已投递飞书' : '· 编辑官逐人改写中'}</span>
      </div>
      <StickyNotes meeting={RUN_ID} people={RUN_PEOPLE} ready={pid => t >= readyAt(pid)} onOpen={onOpen} />
    </div>
  )
}

function BriefView({ pid, onPick, onBack, onPaper }: { pid: PersonId; onPick: (id: PersonId) => void; onBack: () => void; onPaper: () => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button className="text-ink-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] hover:bg-black/5" onClick={onBack}><ArrowLeft size={14} /> 全部简报</button>
        <div className="ml-1 flex gap-1">
          {RUN_PEOPLE.map(x => (
            <button key={x} className={cn('rounded-full p-[3px] transition-shadow', x === pid && 'shadow-[0_0_0_2px_#17171A]')} onClick={() => onPick(x)} title={personById(x).name}>
              <Face p={x} size={24} muted={isQuietIn(x)} />
            </button>
          ))}
        </div>
        <button className="text-ink-2 ml-auto rounded-lg border bg-white px-2.5 py-1 text-[12.5px] hover:bg-black/5" onClick={onPaper}>手写版</button>
        <a className="text-primary rounded-lg border border-[#C9D8FF] bg-white px-2.5 py-1 text-[12.5px] hover:bg-[#F3F6FE]" href={href(`/m/${RUN_ID}`, { tab: 'people', p: pid })}>成员简报 ↗</a>
      </div>
      <p className="text-ink-3 mb-2 text-[12.5px]">{personById(pid).name} 在飞书里收到的样子 · 点原话回到录像那一秒</p>
      <FeishuCard meeting={RUN_ID} pid={pid} />
      <p className="text-ink-3 mt-3 text-[12px]">数据：{runBrief(pid).entries.length} 条 · 读完约 {runBrief(pid).readSeconds} 秒 · 原话时间 {runBrief(pid).entries.map(e => mmss(quoteSpan(itemById(e.item)).t0)).join('、') || '—'}</p>
    </div>
  )
}


/** 主回答写完了没有（决定发送键是不是“停止”） */
function useStreamDone(active: boolean, instant: boolean) {
  const n = useStream(active, instant, 95)
  const total = useMemo(() => buildBlocks().reduce((s, b) => s + b.cost, 0), [])
  return active && n >= total
}
