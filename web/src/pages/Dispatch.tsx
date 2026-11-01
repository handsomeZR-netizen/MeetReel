// 新建会映（原“新建会议”和“智能分发”合一）：对话式的智能体界面（左）+ 实时画布（右）。
// 上传 → 会映先看一遍录像，一问一答确认会议信息、项目、收到者和发送前复核 → 8 个智能体编排
// （编排时间轴 → 账本流向 → 路由矩阵 → 每人简报）。投递前停下来等发布者确认（人在回路），确认后才发飞书。
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { ArrowUp, Check, ChevronDown, Copy, Square } from 'lucide'
import {
  ArrowLeft, BellOff, Check as CheckIcon, FileVideo, Mic, MessageCircleQuestion, PanelRightClose, PanelRightOpen, Link as LinkIcon, PenLine,
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
import { usePhone } from '@/lib/ui'
import { TopBar } from '@/components/shell/TopBar'
import { Face, FaceStack, Kb, ModelIcon, RankTag } from '@/components/common/bits'
import { FeishuCard } from '@/components/common/FeishuCard'
import { Switch } from '@/components/ui/misc'
import { rich, richLen, useStream } from '@/components/common/stream'
import { AgentTimeline } from '@/components/dispatch/AgentTimeline'
import { RoutingBoard } from '@/components/dispatch/RoutingBoard'
import { Matrix } from '@/components/sketch/Matrix'
import { BriefPaper, StickyNotes } from '@/components/sketch/Briefs'
import { Intake, QUESTIONS, answerQ, initialIntake, type Answers, type IntakeState } from '@/components/dispatch/Intake'
import { Modal } from '@/components/common/Pop'
import { DotLoader } from '@/components/common/DotMatrix'
import { L } from '@/lib/i18n'

type CanvasTab = 'run' | 'flow' | 'matrix' | 'briefs'
type Msg = { id: number; q: string; a: string; kind?: 'assign' }

const FOLLOWUPS: { q: string; a: string }[] = L([
  { q: '为什么许诺没收到？', a: '许诺关注的是**电子安全**。直播开场说了分两部分 [[xm_02]]，电子安全在第二部分，这段 9 分 49 秒的录像里没有。他没有必读内容，**不单独打扰**；第二部分接入后再推给他。' },
  { q: '和我们自己的安委会比，差在哪？', a: '差在**评审机制**。对方：所有环节业务评估后还要过安委会评估 [[xm_09]]，安全有**一票否决权** [[xm_10]]。我们：10/28 安全周会上宋岚说安委会只做事后通报，**评审里没有否决权** [[sf_01]]，她准备下月经营会提方案让安全评审变成一道关 [[sf_02]]。这两条已经在宋岚和韩总的简报里。' },
  { q: '“3500 人”这个数字可靠吗？', a: '是直播里说的，但要注意**谁说的**：“超过了3500人”是爽哥接话 [[xm_08]]，侯静雷随后答了“是”。审核官一开始发现抽取官挂错了说话人，打回重抽过一次。给韩总的简报里写的是“安全相关团队超过 3500 人”。' },
  { q: '韩总为什么收到 5 条？', a: '韩总是 **L1 高管**，走管理者规则 R6：竞品的**目标** [[xm_06]]、**组织机制** [[xm_07]] [[xm_10]]、**投入规模** [[xm_08]] [[xm_04]]。具体的开发细节（座椅、二次伤害）只发给负责的魏然，不占高管的时间。' },
], [
  { q: 'Why didn’t Xu Nuo get anything?', a: 'Xu Nuo follows **electronic safety**. The stream opened by saying it has two parts [[xm_02]]; electronic safety is part two, which isn’t in this 9 min 49 s recording. With nothing must-read, Xu Nuo **isn’t pinged separately**; it goes out once part two comes in.' },
  { q: 'How does this compare with our own Safety Committee?', a: 'It comes down to the **review gate**. Them: after the business review, every step also passes a committee assessment [[xm_09]], and safety has **veto power** [[xm_10]]. Us: at the 10/28 safety weekly, Song Lan said our committee only sends after-the-fact notices and has **no veto in reviews** [[sf_01]]; she plans to propose a hard safety gate at next month’s ops review [[sf_02]]. Both items are already in Song Lan’s and GM Han’s briefs.' },
  { q: 'Is the “3,500 people” number reliable?', a: 'It was said on the stream, but note **who said it**: “Over 3,500 people” came from Shuang [[xm_08]], and Hou Jinglei answered “yes”. The Auditor caught the Extractor attributing it to the wrong speaker and sent it back once. GM Han’s brief says “safety-related teams exceed 3,500 people”.' },
  { q: 'Why did GM Han get 5 items?', a: 'GM Han is an **L1 executive**, so manager rule R6 applies: the competitor’s **goal** [[xm_06]], **org & mechanisms** [[xm_07]] [[xm_10]] and **investment scale** [[xm_08]] [[xm_04]]. Engineering details (seats, secondary injury) only go to Wei Ran, who owns them, and don’t take up executive time.' },
])

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
  // 问答里选了“直接发出”：不停在发送前
  const [auto, setAuto] = useState(false)
  const clock = useClock(T_END, { t: already ? T_END : 0, stopAt: approved ? null : GATE_AT })
  const [stage, setStage] = useState<'welcome' | 'intake' | 'run'>(already ? 'run' : 'welcome')
  const [intake, setIntake] = useState<IntakeState | null>(null)
  const [attached, setAttached] = useState(attachedAtStart || autorun)
  const [sourceLink, setSourceLink] = useState('')
  const attach = (link = '') => { setSourceLink(link); setAttached(true) }
  const detach = () => { setAttached(false); setSourceLink('') }
  const [instant] = useState(already)
  // 手机上画布是盖在对话上的整页，默认先看对话
  const phone = usePhone()
  const [canvas, setCanvas] = useState(!phone)
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

  const start = (review = true) => {
    setStage('run')
    setApproved(!review)
    setAuto(!review)
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
    setIntake(null)
    detach()
    setExtra([])
    setPerson(null)
    go('/new')
  }
  const setIntakeFn = useMemo(() => (f: (s: IntakeState) => IntakeState) => setIntake(s => (s ? f(s) : s)), [])
  const intakeDone = (a: Answers) => start(a.review)
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
    setExtra(x => [...x, { id: Date.now(), q, a: hit?.a ?? L('这个问题会映还答不上来。可以问：为什么许诺没收到？和我们自己的安委会比，差在哪？', 'MeetReel can’t answer that one yet. Try: Why didn’t Xu Nuo get anything? How does this compare with our own Safety Committee?') }])
    setDraft('')
  }
  const assign = () => {
    actions.assign('xm_18', 'linxia')
    setExtra(x => [...x, { id: Date.now(), q: L('好，交给林夏核实', 'OK, have Lin Xia verify it'), a: L('已指派给你组里的**林夏**（L4 竞品研究专员）。她会收到一张带原话的卡片 [[xm_18]]，点“我来负责”后，这条在账本里就有了负责人；核实结果会回到你的发布者版。', 'Assigned to **Lin Xia** on your team (L4 Competitive Research Analyst). Lin Xia gets a card with the quote [[xm_18]]; once they tap “I’ll own it”, the item has an owner in the ledger, and the result comes back to your publisher version.'), kind: 'assign' }])
  }
  const asking = stage === 'intake' && intake?.phase === 'asking'
  const send = () => {
    if (stage === 'welcome') {
      // 交给会映：先看录像、问几件事，再编排
      if (attached) { setStage('intake'); setIntake(initialIntake()) }
      return
    }
    if (stage === 'intake') {
      // 回车 = 用推荐答案回答正在问的这一问
      if (asking && intake && !intake.editing) answerQ(setIntakeFn, QUESTIONS[intake.step])
      setDraft('')
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
  const thread = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const lastTop = useRef(0)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  })
  // 问答、流式输出在子组件里长高，不一定触发这里重渲染，所以盯着对话本身的高度
  useEffect(() => {
    const el = scroller.current
    const body = thread.current
    if (!el || !body) return
    const ro = new ResizeObserver(() => { if (stick.current) el.scrollTop = el.scrollHeight })
    ro.observe(body)
    return () => ro.disconnect()
  }, [stage])

  return (
    <>
      <TopBar crumbs={[{ label: L('新建会映', 'New reel'), to: '/new' }, ...(stage !== 'welcome' || attached ? [{ label: RUN_MEETING.title }] : [])]}>
        {running && (
          <button className="text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={() => setCanvas(c => !c)} aria-label={L('画布', 'Canvas')} title={canvas ? L('收起画布', 'Hide canvas') : L('打开画布', 'Show canvas')}>
            {canvas ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        )}
        <button className="text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5" onClick={reset} title={L('新对话', 'New chat')}><SquarePen size={16} /></button>
      </TopBar>

      <LayoutGroup>
        <div className={cn('relative grid min-h-0 flex-1', running && canvas && !phone ? 'grid-cols-[minmax(400px,0.9fr)_minmax(0,1.15fr)]' : 'grid-cols-[minmax(0,1fr)]')}>
          <div className="relative flex min-h-0 flex-col">
            <div
              ref={scroller}
              className={cn('min-h-0 flex-1 overflow-y-auto', stage === 'welcome' && 'flex items-end justify-center')}
              onScroll={e => {
                // 只有往上翻才松开；程序滚到底的那次事件可能晚到，那时内容又长了，不能当成用户离开了底部
                const el = e.currentTarget
                const gap = el.scrollHeight - el.scrollTop - el.clientHeight
                if (el.scrollTop < lastTop.current - 1) stick.current = gap < 80
                else if (gap < 80) stick.current = true
                lastTop.current = el.scrollTop
              }}
            >
              {stage !== 'welcome' ? (
                <div ref={thread} className="mx-auto max-w-[760px] px-6 pt-4 pb-10 max-md:px-4">
                  <UserMessage sourceLink={sourceLink} />
                  {intake && <Intake s={intake} set={setIntakeFn} onDone={intakeDone} locked={running} />}
                  {running && (
                    <Answer
                      t={t} models={models} instant={instant} gated={gated} approved={approved} auto={auto}
                      onApprove={approve} onMatrix={() => { setCanvas(true); setFollow(false); setCtab('matrix') }}
                      onOpen={openBrief} onCanvas={() => { setCanvas(true); setFollow(true) }}
                      onAsk={ask} onAssign={assign} showFollow={answerDone && !extra.length}
                    />
                  )}
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
                <Welcome attached={attached} onAttach={attach} />
              )}
            </div>

            <motion.div layout className={cn('relative mx-auto w-full max-w-[808px] flex-none px-6 pb-3 max-md:px-3', stage === 'welcome' && 'mb-[24vh]')} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
              {stage !== 'welcome' && <div className="pointer-events-none absolute inset-x-0 -top-7 h-7 bg-gradient-to-b from-transparent to-white" />}
              <Composer
                models={models}
                attached={attached && stage === 'welcome'}
                onDetach={detach}
                onAttach={() => attach()}
                sourceLink={sourceLink}
                draft={draft}
                onDraft={setDraft}
                onSend={send}
                generating={generating || (stage === 'intake' && intake?.phase === 'reading')}
                canSend={running ? !!draft.trim() : stage === 'intake' ? asking && !intake?.editing : attached}
                placeholder={
                  running ? L('继续追问，例如：和我们自己的安委会比，差在哪？', 'Ask a follow-up, e.g. How does this compare with our own Safety Committee?')
                    : stage === 'intake' ? (asking ? L('回车 = 按推荐回答这一问；要改就在上面的卡片里改', 'Enter = accept the suggestion; to change it, edit the card above') : L('会映正在看录像…', 'MeetReel is watching the recording…'))
                    : attached ? '' : L('把会议录像、录音或会议链接交给会映', 'Add a recording or link')
                }
              />
              <p className="text-ink-3 mt-2 text-center text-[12px]">{L('会映会出错，重要事项请点原话回到录像核实。', 'MeetReel can make mistakes. For anything important, tap the quote and check the recording.')}</p>
            </motion.div>
          </div>

          <AnimatePresence>
            {running && canvas && (
              <motion.aside
                key="canvas"
                className={cn('flex min-h-0 flex-col border-l bg-[#FBFBFA]', phone && 'absolute inset-0 z-20 border-l-0')}
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
      <TopBar crumbs={[{ label: L('新建会映', 'New reel'), to: '/new' }, { label: m.title }]} />
      <div className="grid flex-1 place-items-center">
        <div className="text-center">
          <span className="text-ink-3 kb-icon-in inline-block"><Kb name="mailbox" size={64} /></span>
          <h2 className="mt-3 text-lg font-semibold">{L(`${m.title} 已于 ${cnDate(m.date)} 分发`, `${m.title} was dispatched on ${cnDate(m.date)}`)}</h2>
          <p className="text-ink-3 mt-1 text-sm">{L(`${new Set(m.routes.map(r => r.person)).size} 人收到了各自的简报，确认和追问都在回流里。`, `${new Set(m.routes.map(r => r.person)).size} people got their own brief; confirmations and questions are flowing back.`)}</p>
          <div className="mt-4 flex justify-center gap-2">
            <a className="rounded-lg border px-3 py-1.5 text-sm hover:bg-black/5" href={href(`/m/${m.id}`, { tab: 'dist' })}>{L('看分发结果', 'See results')}</a>
            <a className="bg-ink rounded-lg px-3 py-1.5 text-sm text-white" href={href(`/dispatch/${RUN_ID}`)}>{L('去分发', 'Dispatch ')}{RUN_MEETING.title.replace(/ · .*/, '')}</a>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------- 输入框里的模型选择（在语音键旁边） ----------------

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
  // 下拉框贴着整个输入框的右边往上弹，窄栏里也不会被裁掉
  return (
    <div>
      <button className={cn('text-ink-2 hover:text-ink flex h-9 items-center gap-1.5 rounded-full pr-2 pl-2.5 text-[13px] font-medium transition-colors hover:bg-black/5', open && 'text-ink bg-black/5')} onClick={e => { e.stopPropagation(); setOpen(o => !o) }} title={L('选择模型', 'Choose models')}>
        <span className="flex items-center">{used.slice(0, 5).map((id, i) => <span key={id} className="grid size-[18px] place-items-center rounded-full bg-white ring-2 ring-white" style={{ marginLeft: i ? -5 : 0 }}><ModelIcon icon={id} size={13} /></span>)}</span>
        <span className="whitespace-nowrap @max-[600px]:hidden">{multi ? L(`多模型协同 · ${used.length}`, `Multi-model · ${used.length}`) : MODELS.find(m => m.id === models[0])!.label}</span>
        <motion.span className="text-ink-3 inline-grid" animate={{ rotate: open ? 180 : 0 }}><MorphIcon icon={ChevronDown} size={14} strokeWidth={2} /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-2 bottom-[calc(100%+8px)] z-30 w-[min(400px,calc(100%-16px))] origin-bottom-right rounded-2xl border bg-white p-2 text-left shadow-[0_12px_40px_-8px_rgba(0,0,0,.18)]"
            initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-1.5 pt-1 pb-2">
              <div className="flex rounded-lg bg-[#F2F3F5] p-0.5 text-[12px]">
                <button onClick={() => actions.setModels(DEFAULT_MODELS)} className={cn('h-6 rounded-md px-2', multi ? 'text-ink bg-white font-medium shadow-sm' : 'text-ink-3')}>{L('多模型协同', 'Multi-model')}</button>
                <button onClick={() => actions.setModels([models[0]])} className={cn('h-6 rounded-md px-2', !multi ? 'text-ink bg-white font-medium shadow-sm' : 'text-ink-3')}>{L('单一模型', 'Single model')}</button>
              </div>
              <span className="text-ink-3 ml-auto text-[11.5px]">{costText(99, models)} {L('/ 场', '/ meeting')}</span>
            </div>
            <div className="grid max-h-[340px] grid-cols-2 gap-1 overflow-y-auto">
              {MODELS.map(m => {
                const on = models.includes(m.id)
                return (
                  <button key={m.id} className={cn('flex items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-[#F4F4F4]', on && 'bg-[#F4F6FB]')} onClick={() => (multi ? actions.toggleModel(m.id) : actions.setModels([m.id]))}>
                    <ModelIcon icon={m.id} size={18} />
                    <span className="min-w-0 flex-1 leading-tight"><b className="block text-[13px] font-medium">{m.label}</b><small className="text-ink-3 text-[11px]">{m.vendor}{m.open ? L(' · 可私有化', ' · self-hostable') : ''}</small></span>
                    <span className="grid w-4 place-items-center">{on && <MorphIcon icon={Check} size={14} strokeWidth={2.6} />}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 border-t px-1.5 pt-2 text-[11.5px]">
              {AGENTS.filter(a => !['orc', 'scribe', 'disp'].includes(a.id)).map(a => {
                const b = agentModel(a.id, models)
                return <span key={a.id} className="text-ink-2 inline-flex items-center gap-1"><i className="size-1.5 rounded-full" style={{ background: a.color }} />{a.name}<ModelIcon icon={b.icon} size={12} />{b.label.replace(L('规则 + ', 'Rules + '), '')}</span>
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------- 欢迎页 ----------------

function Welcome({ attached, onAttach }: { attached: boolean; onAttach: (link?: string) => void }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const importLink = () => {
    try {
      const url = new URL(link.trim())
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
      onAttach(url.href)
      setLinkOpen(false)
      setError('')
    } catch { setError(L('请输入完整的会议链接，以 https:// 或 http:// 开头。', 'Enter a full meeting link starting with https:// or http://.')) }
  }
  const dispatched = useStore(s => s.dispatched)
  const pending = MEETINGS.filter(m => !dispatched[m.id])
  return (
    <motion.div className="w-full max-w-[760px] px-6 pb-6 text-center max-md:px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.span className="text-ink kb-icon-in mb-3 inline-block" initial={{ rotate: -8 }} animate={{ rotate: 0 }}><Kb name="paperPlane" size={56} /></motion.span>
      <motion.h1 className="text-[30px] font-semibold tracking-tight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>{L('开完会了？交给我按人分发。', 'Meeting over? I’ll split it per person.')}</motion.h1>
      <p className="text-ink-3 mt-2 text-[14.5px]">{L('我先看一遍录像，问你几件事；再让 8 个智能体按人分发。发出去之前，先给你看一眼。', 'I’ll watch the recording, ask you a few things, then have 8 agents split it per person. You see it before anything goes out.')}</p>
      <motion.div className="mt-6 flex flex-wrap justify-center gap-2" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}>
        {pending.map(m => (
          <motion.button
            key={m.id}
            variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}
            onClick={() => onAttach()}
            className={cn('kb-tile inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px]', attached ? 'border-ink bg-white' : 'border-ink shadow-[0_0_0_3px_rgba(0,0,0,.05)]')}
          >
            <FileVideo size={16} /> {m.title}<span className="rounded-md bg-amber-100 px-1.5 text-[11.5px] text-amber-700">{L('待分发', 'To send')}</span>
          </motion.button>
        ))}
        {[{ icon: Mic, label: L('上传会议录音', 'Upload audio'), action: () => onAttach() }, { icon: LinkIcon, label: L('导入会议链接', 'Import a link'), action: () => { setError(''); setLinkOpen(true) } }].map(({ icon: I, label, action }) => (
          <motion.button key={label} onClick={action} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }} className="kb-tile text-ink-2 inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px]">
            <I size={16} /> {label}
          </motion.button>
        ))}
      </motion.div>
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} label={L('导入会议链接', 'Import a meeting link')} className="pc-sheet w-[min(460px,calc(100vw-32px))] rounded-[24px] p-6 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{L('导入会议链接', 'Import a meeting link')}</h2>
          <button onClick={() => setLinkOpen(false)} aria-label={L('关闭', 'Close')} className="grid size-8 place-items-center rounded-full hover:bg-black/5"><X size={18} /></button>
        </div>
        <p className="text-ink-3 mt-2 text-sm">{L('粘贴会议录像或妙记链接，交给会映按人整理。', 'Paste a meeting recording or minutes link and MeetReel will split it per person.')}</p>
        <form className="mt-5" onSubmit={e => { e.preventDefault(); importLink() }}>
          <label htmlFor="meeting-link" className="mb-2 block text-sm font-medium">{L('会议链接', 'Meeting link')}</label>
          <input id="meeting-link" type="text" inputMode="url" autoComplete="off" value={link} onChange={e => { setLink(e.target.value); setError('') }} placeholder="https://…" aria-invalid={!!error} aria-describedby={error ? 'meeting-link-error' : 'meeting-link-hint'} className="w-full rounded-xl border bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-[var(--plum)]" />
          {error && <p id="meeting-link-error" role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          <p id="meeting-link-hint" className="text-ink-3 mt-3 text-xs leading-relaxed">{L('演示模式：导入后使用雷军的小米汽车安全专场直播案例，不读取链接内容。', 'Demo mode: importing uses the Xiaomi Auto safety livestream case and doesn’t read the link.')}</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" className="text-ink-2 text-sm underline underline-offset-4" onClick={() => { setLink('https://meeting.example.com/xiaomi-safety'); setError('') }}>{L('填入示例链接', 'Use sample link')}</button>
            <button type="submit" disabled={!link.trim()} className="bg-ink rounded-full px-5 py-2.5 text-sm text-white disabled:opacity-40">{L('导入会议', 'Import')}</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}

// ---------------- 输入框 ----------------

function Composer(props: { sourceLink?: string; models: ModelId[]; attached: boolean; onDetach: () => void; onAttach: () => void; draft: string; onDraft: (v: string) => void; onSend: () => void; generating: boolean; canSend: boolean; placeholder: string }) {
  const { models, attached, onDetach, onAttach, draft, onDraft, onSend, generating, canSend, placeholder } = props
  return (
    <div className="@container relative rounded-[28px] bg-white p-2.5 shadow-[0_0_0_1px_rgba(0,0,0,.08),0_6px_20px_-6px_rgba(0,0,0,.1)] transition-shadow focus-within:shadow-[0_0_0_1px_rgba(0,0,0,.14),0_8px_24px_-6px_rgba(0,0,0,.14)]">
      <AnimatePresence>
        {attached && (
          <motion.div className="overflow-hidden px-1.5 pt-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <FileChip onRemove={onDetach} sourceLink={props.sourceLink} />
            <div className="px-1.5 pt-2.5 pb-1.5 text-left text-[15px]">{L('把这场会按人分发：每人只收和自己有关的，附原话和理由。', 'Split this meeting per person: everyone gets only what concerns them, with quotes and reasons.')}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-end gap-1">
        <button className="text-ink-2 grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label={L('添加附件', 'Add attachment')} onClick={onAttach}><Plus size={19} /></button>
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
        <ModelPicker models={models} />
        <button className="text-ink-2 grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label={L('语音', 'Voice')}><Mic size={18} /></button>
        <button className={cn('grid size-9 place-items-center rounded-full text-white transition-[background,transform]', canSend || generating ? 'bg-ink hover:scale-105' : 'bg-[#D7D7D7]')} onClick={onSend} aria-label={generating ? L('停止', 'Stop') : L('发送', 'Send')}>
          <MorphIcon icon={generating ? Square : ArrowUp} size={generating ? 14 : 18} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}

function FileChip({ onRemove, sent, sourceLink }: { onRemove?: () => void; sent?: boolean; sourceLink?: string }) {
  return (
    <div className={cn('relative inline-flex items-center gap-2.5 rounded-2xl border bg-white py-2 pl-2 text-left', sent ? 'pr-4' : 'pr-9')}>
      <img src={XM.video!.poster} alt="" className="h-11 w-[25px] flex-none rounded-[6px] object-cover" draggable={false} />
      <div className="leading-tight">
        <b className="block text-[13.5px] font-semibold">{sourceLink ? L('小米汽车安全专场直播 · 会议链接', 'Xiaomi Auto safety livestream · link') : L('小米汽车安全专场直播.mp4', 'xiaomi-auto-safety-livestream.mp4')}</b>
        <small className="text-ink-3 text-[12px]">{sourceLink ? L('链接导入（演示）', 'Imported link (demo)') : L('直播录像', 'Livestream recording')} · 09:49 · {L(`${XM.segments.length} 段发言 · 8 位收到者`, `${XM.segments.length} segments · 8 recipients`)}{sent ? '' : L(' · 关注档案已加载', ' · profiles loaded')}</small>
        {sourceLink && <span className="text-ink-3 mt-1 block max-w-[320px] truncate text-[11px]" title={sourceLink}>{sourceLink}</span>}
      </div>
      {onRemove && <button className="bg-ink absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full text-white" onClick={onRemove} aria-label={L('移除', 'Remove')}><X size={12} /></button>}
    </div>
  )
}

function UserMessage({ sourceLink }: { sourceLink?: string }) {
  return (
    <motion.div className="mt-4 mb-6 flex flex-col items-end gap-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <FileChip sent sourceLink={sourceLink} />
      <div className="max-w-[75%] rounded-[22px] bg-[#F4F4F4] px-[18px] py-2.5 text-[15px] leading-relaxed">{L('把这场会按人分发：每人只收和自己有关的，附原话和理由。', 'Split this meeting per person: everyone gets only what concerns them, with quotes and reasons.')}</div>
    </motion.div>
  )
}

// ---------------- 主回答 ----------------

function Answer(p: {
  t: number; models: ModelId[]; instant: boolean; gated: boolean; approved: boolean; auto: boolean
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
          <Approval key="gate" pending={gated} auto={p.auto} onApprove={p.onApprove} onMatrix={p.onMatrix} />
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
              <button onClick={p.onAssign} className="bg-ink inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[14px] text-white transition-transform hover:-translate-y-px"><UserCheck size={15} /> {L('好，交给林夏核实', 'OK, have Lin Xia verify it')}</button>
              <button onClick={() => goSource(RUN_ID, Math.max(0, quoteSpan(itemById('xm_18')).t0 - 0.4), 'xm_18')} className="text-ink-2 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[14px] hover:bg-[#F4F4F4]">{L('先回录像听一下原话', 'Hear the quote first')}</button>
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
          {done ? <span>{L('已编排 8 个智能体，用时 20 秒', 'Ran 8 agents in 20 s')}</span> : (
            <>
              <DotLoader className="text-ink mr-0.5" />
              <span className="shimmer-text">{L('正在编排', 'Running')}</span>
              <span className="text-ink-3 text-[14px]">· {phase.label}{busy.length ? ` · ${busy.map(a => a.name).join(L('、', ', '))}` : ''}</span>
            </>
          )}
          <motion.span className="text-ink-3 inline-block text-lg leading-none" animate={{ rotate: open ? 90 : 0 }}>›</motion.span>
        </button>
        <button className="text-primary ml-auto text-[12.5px] hover:underline" onClick={onCanvas}>{L('在画布里看时间轴 ↗', 'See the timeline in the canvas ↗')}</button>
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
                    <motion.li key={l.at} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className={l.text.includes(L('失败', 'failed')) ? 'bad' : ''}>
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
function Approval({ pending, auto, onApprove, onMatrix }: { pending: boolean; auto: boolean; onApprove: () => void; onMatrix: () => void }) {
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
              <div className="text-[15px] font-semibold">{L('投递官请求发送 7 份简报', 'The Courier is asking to send 7 briefs')}</div>
              <div className="text-ink-3 text-[13px]">{L('7 张飞书卡片 + 7 个 H5 链接 · 发出后会通知到个人', '7 Lark cards + 7 web links · each person is notified once sent')}</div>
            </div>
            <FaceStack ids={recips} size={24} max={7} />
          </div>
          <ul className="text-ink-2 mt-3 grid gap-1.5 text-[13.5px]">
            <li className="flex items-center gap-2"><BellOff size={14} className="text-ink-3" /> {L('许诺只关注电子安全，本段没有，不打扰，只进日报', 'Xu Nuo only follows electronic safety, which isn’t in this clip — no ping, digest only')}</li>
            <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-600" /> {L('20 条都是直播公开内容，没有受限条目；只引用原话，不替发言人补充', 'All 20 items are public livestream content, none restricted; speakers are only quoted, never paraphrased')}</li>
            <li className="flex items-center gap-2"><PenLine size={14} className="text-amber-600" /> {L('xm_18“应该是行业内首个”是绝对化表述，已标待核实', 'xm_18 “should be the first in the industry” is an absolute claim, flagged unverified')}</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <button onClick={onApprove} className="bg-ink inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-medium text-white transition-transform hover:-translate-y-px"><MorphIcon icon={Check} size={15} strokeWidth={2.6} /> {L('确认发送', 'Confirm & send')}</button>
            <button onClick={onMatrix} className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-4 py-2 text-[14px] hover:bg-[#F4F4F4]">{L('先看分发矩阵', 'See the matrix first')}</button>
          </div>
        </div>
      ) : (
        <div className="text-ink-2 flex items-center gap-2 px-4 py-2.5 text-[13.5px]">
          <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><CheckIcon size={12} strokeWidth={3} /></span>
          {auto ? L('按你的设置直接发出', 'Sent per your settings') : L(`${personById(ME).name} 已确认发送`, `${personById(ME).name} confirmed sending`)} · {L('7 份简报', '7 briefs')}
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
  const bullets = L([
    '**直播里没人点到我们任何一个人的名**，R1、R2 一条都没命中。全靠负责（R3）、订阅（R5）和管理者规则（R6），“谁被提到就发给谁”在这里一份都发不出去。',
    '**同一句“同档最安全”** [[xm_06]] 发给了 3 个人：对韩总是竞争目标，对你是定位口径，对邓凯是门店会被问到的话。',
    '**xm_08 一开始挂错了人**：“超过了3500人”是爽哥接话、侯静雷确认 [[xm_08]]，审核官打回重抽。20 条全部附原话，点一下就回到录像。',
  ], [
    '**Nobody on our side was named in the stream**, so R1 and R2 hit nothing. It all came down to ownership (R3), follows (R5) and manager rules (R6) — “send it to whoever was mentioned” wouldn’t have sent a single brief here.',
    '**The same “safest in class” line** [[xm_06]] went to 3 people: for GM Han it’s a competitive goal, for you it’s positioning, for Deng Kai it’s what stores will be asked.',
    '**xm_08 was first pinned on the wrong person**: “Over 3,500 people” came from Shuang and was confirmed by Hou Jinglei [[xm_08]]; the Auditor sent it back for re-extraction. All 20 items carry a quote — tap one to jump to the recording.',
  ])
  return [
    text(L('这场直播有 **20 条要点**，我按 8 个人的职级、负责的事和订阅分好了：**7 个人**各收到一份不同的简报，**许诺**这次不打扰。', 'This stream has **20 key points**. I sorted them by each of the 8 people’s level, ownership and follows: **7 people** each get a different brief, and **Xu Nuo** isn’t pinged this time.')),
    text(L('谁收到了什么', 'Who got what'), 'h3'),
    {
      cost: people.length * 14,
      render: k => {
        const rows = Math.ceil(k / 14)
        return (
          <div key="table" className="mt-1 mb-2 overflow-hidden rounded-2xl border">
            <table className="w-full border-collapse text-[13.5px]">
              <thead><tr className="bg-[#FAFAFA]">{L(['收到者', '条数', '为什么发给 TA', '阅读'], ['Recipient', 'Items', 'Why them', 'Read']).map(h => <th key={h} className="border-b px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
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
                        {quiet ? <span className="text-ink-3 inline-flex items-center gap-1 text-[12.5px]"><BellOff size={12} /> {L('没有必读，不打扰', 'Nothing must-read — no ping')}</span>
                          : b.host ? <span className="text-ink-3 text-[12.5px]">{L('发布者：全部条目和分发情况', 'Publisher: every item and where it went')}</span>
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
    text(L('值得注意', 'Worth noting'), 'h3'),
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
                  <div className="min-w-0 leading-tight"><b className="block text-[13.5px]">{pp.name}</b><small className="text-ink-3 text-[11.5px]">{b.host ? L('发布者版', 'Publisher version') : pp.role}</small></div>
                  <em className="ml-auto rounded-full bg-[#F2F2F2] px-2 py-0.5 text-[11.5px] font-semibold not-italic">{quiet ? L('不打扰', 'No ping') : L(`${b.host ? RUN_MEETING.items.length : b.entries.length} 条`, `${b.host ? RUN_MEETING.items.length : b.entries.length} items`)}</em>
                </div>
                <p className="text-ink-2 my-2 line-clamp-3 text-[12.5px] leading-[1.55]">{b.headline}</p>
                <span className="text-ink-3 mt-auto text-[12px]">{L('在画布中打开 ↗', 'Open in canvas ↗')}</span>
              </button>
            )
          })}
        </motion.div>
      ),
    },
    text(L('点任意一张卡，在右侧画布里看 TA 收到的飞书卡片。**xm_18“行业内首个”**还没人核实出处，要我交给你组里的**林夏**去核实吗？', 'Click any card to see the Lark card they received in the canvas. Nobody has verified the source of **xm_18 “first in the industry”** yet — want me to hand it to **Lin Xia** on your team?')),
  ]
}

function Actions({ models }: { models: ModelId[] }) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const used = usedModels(models)
  const ib = 'text-ink-2 grid size-8 place-items-center rounded-lg hover:bg-black/5'
  return (
    <motion.div className="-ml-2 flex items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
      <button className={ib} onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }} aria-label={L('复制', 'Copy')}><MorphIcon icon={copied ? Check : Copy} size={16} strokeWidth={2} /></button>
      <button className={cn(ib, vote === 'up' && 'text-ink')} onClick={() => setVote('up')} aria-label={L('有用', 'Helpful')}><ThumbsUp size={16} /></button>
      <button className={cn(ib, vote === 'down' && 'text-ink')} onClick={() => setVote('down')} aria-label={L('没用', 'Not helpful')}><ThumbsDown size={16} /></button>
      <button className={ib} aria-label={L('重新生成', 'Regenerate')}><RotateCcw size={16} /></button>
      <span className="text-ink-3 ml-2 inline-flex items-center gap-1.5 text-[12px]">{used.map(id => <ModelIcon key={id} icon={id} size={13} />)} {used.length > 1 ? L(`${used.length} 个模型协同`, `${used.length} models`) : MODELS.find(x => x.id === used[0])!.label} · {TOTAL_TOKENS.toLocaleString()} tokens · {costText(99, models)} · {L(`${RUN_MEETING.routes.length} 条推送`, `${RUN_MEETING.routes.length} pushes`)}</span>
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
      {!ready ? <div className="flex items-center gap-2 py-1"><DotLoader className="text-ink" /><span className="shimmer-text">{msg.kind === 'assign' ? L('正在更新账本', 'Updating the ledger') : L('正在查账本和录像', 'Checking the ledger and recording')}</span></div> : (
        <div className="chat-md"><p>{rich(msg.a, n)}{n < len && <span className="cursor-dot" />}</p></div>
      )}
      {msg.kind === 'assign' && ready && n >= len && (
        <motion.div className="text-ink-2 -mt-1 mb-2 flex items-center gap-2 text-[13.5px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {confirmedBy
            ? <><span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><CheckIcon size={12} strokeWidth={3} /></span> {L('林夏 已确认负责核实 xm_18 · 刚刚', 'Lin Xia confirmed owning the xm_18 check · just now')}</>
            : <><span className="live-dot" /> {L('等待林夏确认…', 'Waiting for Lin Xia to confirm…')}</>}
        </motion.div>
      )}
      {ready && n >= len && last && <Follow onAsk={onAsk} asked={asked} />}
    </div>
  )
}

// ---------------- 画布 ----------------

const CTABS: { id: CanvasTab; label: string }[] = [
  { id: 'run', label: L('编排', 'Run') },
  { id: 'flow', label: L('分发', 'Flow') },
  { id: 'matrix', label: L('矩阵', 'Matrix') },
  { id: 'briefs', label: L('简报', 'Briefs') },
]

function CanvasHead({ tab, onTab, follow, onFollow, t, gated, done, onClose }: { tab: CanvasTab; onTab: (t: CanvasTab) => void; follow: boolean; onFollow: (v: boolean) => void; t: number; gated: boolean; done: boolean; onClose: () => void }) {
  return (
    <div className="flex h-12 flex-none items-center gap-2 border-b bg-white px-3 max-md:gap-1 max-md:px-2">
      <div className="flex flex-none rounded-full bg-[#F2F2F2] p-[3px]">
        {CTABS.map(x => (
          <button key={x.id} className={cn('relative h-7 rounded-full px-3 text-[12.5px] max-md:px-2.5', tab === x.id ? 'text-ink font-medium' : 'text-ink-3')} onClick={() => onTab(x.id)}>
            {tab === x.id && <motion.i layoutId="ctab" className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.1)]" />}
            <span className="relative">{x.label}</span>
          </button>
        ))}
      </div>
      <span className="text-ink-3 ml-1 inline-flex items-center gap-1.5 text-[12px] max-md:hidden">
        {done ? <><span className="size-1.5 rounded-full bg-emerald-500" /> {L('已投递', 'Delivered')}</> : gated ? <><span className="size-1.5 rounded-full bg-amber-500" /> {L('等你确认', 'Needs your OK')}</> : <><span className="live-dot" /> {PHASES[phaseIndex(t)].label}</>}
      </span>
      <label className="text-ink-2 ml-auto flex items-center gap-1.5 text-[12px]"><Switch checked={follow} onCheckedChange={onFollow} /> <span className="max-md:sr-only">{L('跟随进度', 'Follow')}</span></label>
      <button className="text-ink-2 grid size-8 flex-none place-items-center rounded-lg hover:bg-black/5" onClick={onClose} aria-label={L('关闭画布', 'Close canvas')}><X size={16} /></button>
    </div>
  )
}

function RunTab({ clock, models, gated }: { clock: ReturnType<typeof useClock>; models: ModelId[]; gated: boolean }) {
  const log = LOG.filter(l => clock.t >= l.at).slice().reverse()
  return (
    <div className="flex flex-col gap-4">
      <AgentTimeline clock={clock} models={models} gated={gated} />
      <div className="rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-2.5"><b className="text-[13.5px]">{L('运行日志', 'Run log')}</b><span className="text-ink-3 text-[12px]">{L(`${log.length} 条事件`, `${log.length} events`)}</span></div>
        <div className="max-h-[260px] overflow-y-auto p-2">
          <AnimatePresence initial={false}>
            {log.map(l => {
              const a = agentById(l.agent)
              const bad = l.text.includes(L('失败', 'failed'))
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
    { v: runItemsAt(t).length, l: L('条目', 'items') },
    { v: runRoutesAt(t).length, l: L('条推送', 'pushes') },
    { v: t >= 19.1 ? 7 : 0, l: L('份已送达', 'delivered') },
  ]
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <b className="text-[15px]">{L('会议账本 → 收件人', 'Ledger → recipients')}</b>
          <p className="text-ink-3 mt-0.5 text-[12.5px]">{L('推送看相关，可见看权限。悬停任一端只看它的连线。', 'Relevance decides the push, permissions decide what’s visible. Hover either side to isolate its links.')}</p>
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
            <b>{L('发送前看一眼：', 'One look before sending: ')}</b>{L('这是路由官给出的分发矩阵。直播里没点任何人的名，每一格都写着理由：负责、订阅或管理者规则。', 'this is the Router’s matrix. Nobody was named in the stream, so every cell states its reason: ownership, follows or a manager rule.')}
          </div>
          <button onClick={onApprove} className="bg-ink flex-none rounded-xl px-3.5 py-2 text-[13.5px] text-white">{L('确认发送', 'Confirm & send')}</button>
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
        <b className="font-hand text-[20px]">{L('每人一份简报', 'One brief per person')}</b>
        <span className="text-ink-3 text-[12.5px]">{done ? L('· 已投递飞书', '· delivered to Lark') : L('· 编辑官逐人改写中', '· the Editor is rewriting per person')}</span>
      </div>
      <StickyNotes meeting={RUN_ID} people={RUN_PEOPLE} ready={pid => t >= readyAt(pid)} onOpen={onOpen} />
    </div>
  )
}

function BriefView({ pid, onPick, onBack, onPaper }: { pid: PersonId; onPick: (id: PersonId) => void; onBack: () => void; onPaper: () => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button className="text-ink-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] hover:bg-black/5" onClick={onBack}><ArrowLeft size={14} /> {L('全部简报', 'All briefs')}</button>
        <div className="ml-1 flex gap-1">
          {RUN_PEOPLE.map(x => (
            <button key={x} className={cn('rounded-full p-[3px] transition-shadow', x === pid && 'shadow-[0_0_0_2px_#17171A]')} onClick={() => onPick(x)} title={personById(x).name}>
              <Face p={x} size={24} muted={isQuietIn(x)} />
            </button>
          ))}
        </div>
        <button className="text-ink-2 ml-auto rounded-lg border bg-white px-2.5 py-1 text-[12.5px] hover:bg-black/5" onClick={onPaper}>{L('手写版', 'Handwritten')}</button>
        <a className="text-primary rounded-lg border border-[#C9D8FF] bg-white px-2.5 py-1 text-[12.5px] hover:bg-[#F3F6FE]" href={href(`/m/${RUN_ID}`, { tab: 'people', p: pid })}>{L('成员简报 ↗', 'Member brief ↗')}</a>
      </div>
      <p className="text-ink-3 mb-2 text-[12.5px]">{L(`${personById(pid).name} 在飞书里收到的样子 · 点原话回到录像那一秒`, `What ${personById(pid).name} sees in Lark · tap a quote to jump to that moment`)}</p>
      <FeishuCard meeting={RUN_ID} pid={pid} />
      <p className="text-ink-3 mt-3 text-[12px]">{L('数据：', 'Data: ')}{L(`${runBrief(pid).entries.length} 条 · 读完约 ${runBrief(pid).readSeconds} 秒 · 原话时间 `, `${runBrief(pid).entries.length} items · ~${runBrief(pid).readSeconds}s read · quotes at `)}{runBrief(pid).entries.map(e => mmss(quoteSpan(itemById(e.item)).t0)).join(L('、', ', ')) || '—'}</p>
    </div>
  )
}


/** 主回答写完了没有（决定发送键是不是“停止”） */
function useStreamDone(active: boolean, instant: boolean) {
  const n = useStream(active, instant, 95)
  const total = useMemo(() => buildBlocks().reduce((s, b) => s + b.cost, 0), [])
  return active && n >= total
}
