// 新建会映的“先问你几件事”：上传之后会映先看一遍录像，再把以前新建会议表单里的信息
// （会议信息、项目、收到者候选、发送前要不要复核）变成一问一答。每一问都有推荐答案，回车就按推荐走。
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Eye, Pencil, Plus, Send } from 'lucide-react'
import { ME, PROJECTS, RANKS, STAFF, personById, type PersonId, type ProjectId, type Rank } from '@/data/model'
import { XM } from '@/data/meetings'
import { agentById, type AgentId } from '@/data/run'
import { actions, useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/misc'
import { Face, FaceStack, Kb } from '@/components/common/bits'
import { rich, richLen, useStream } from '@/components/common/stream'
import type { KoboyoName } from '@/components/sketch/koboyoData'

export type QKey = 'meta' | 'project' | 'people' | 'review'
export const QUESTIONS: QKey[] = ['meta', 'project', 'people', 'review']

export interface Answers { title: string; date: string; kind: string; project: ProjectId; people: PersonId[]; review: boolean }

/** 推荐答案：从录像和关注档案里认出来的 */
export const RECOMMENDED: Answers = {
  title: XM.title, date: XM.date, kind: XM.kind, project: XM.project, people: XM.related.filter(x => x !== ME), review: true,
}

export interface IntakeState {
  /** 读录像中 / 在问 / 问完了 */
  phase: 'reading' | 'asking' | 'done'
  /** 已经回答了几问 */
  step: number
  answers: Answers
  editing: QKey | null
  /** 一上来就选了“都按推荐来” */
  quick: boolean
}

export const initialIntake = (): IntakeState => ({ phase: 'reading', step: 0, answers: { ...RECOMMENDED }, editing: null, quick: false })

const KINDS = ['竞品直播', '周会', '月会', '评审会', '其他']
const RANK_ORDER: Rank[] = ['exec', 'head', 'lead', 'staff']
const P_COLORS = ['#0891B2', '#4F46E5', '#DB2777', '#D97706', '#059669', '#7C3AED']
const P_ICONS: KoboyoName[] = ['newspaper', 'target', 'rocket', 'lightbulb', 'compass', 'team']

const READ_STEPS: { agent: AgentId; text: string }[] = [
  { agent: 'scribe', text: '上传完成，转写 9 分 49 秒的竖屏录像' },
  { agent: 'scribe', text: `认出 ${XM.attendees.length} 位发言人：${XM.attendees.map(id => personById(id).name).join('、')}` },
  { agent: 'topic', text: `切出 ${XM.segments.length} 段发言、${XM.chapters.length} 个章节` },
  { agent: 'orc', text: '判断类型：外部竞品直播，按关注档案圈出候选收到者' },
]

const projectOf = (id: ProjectId, custom: typeof PROJECTS) => [...PROJECTS, ...custom].find(p => p.id === id) ?? PROJECTS[0]

/** 用户这一问的回答，写成一句话放在右边的气泡里 */
function answerText(k: QKey, a: Answers, custom: typeof PROJECTS) {
  if (k === 'meta') return `「${a.title}」· ${cnDate(a.date)} · ${a.kind}`
  if (k === 'project') return `放进「${projectOf(a.project, custom).name}」`
  if (k === 'review') return a.review ? '先给我看一眼分发矩阵，再发' : '不用看，直接发出'
  const added = a.people.filter(x => !RECOMMENDED.people.includes(x)).map(x => personById(x).name)
  const removed = RECOMMENDED.people.filter(x => !a.people.includes(x)).map(x => personById(x).name)
  const diff = [added.length ? `加上${added.join('、')}` : '', removed.length ? `去掉${removed.join('、')}` : ''].filter(Boolean).join('，')
  return `收到者候选 ${a.people.length} 位${diff ? `：${diff}` : '，就按你圈的'}`
}

const PROMPTS: Record<QKey, string> = {
  meta: '先对一下会议信息。标题和时间是我从片头和文件里认出来的：',
  project: '放进哪个项目？会议、账本和待办都跟着项目走。外部竞品直播一般归**竞品情报**，你是这个项目的 Leader。',
  people: `收到者候选我按关注档案先圈了 **${RECOMMENDED.people.length} 位**。路由官只在这些人里判断要不要打扰；没参会但可能相关的人，也可以加进来。`,
  review: '最后一件：发出去之前，要不要先给你看一眼分发矩阵？',
}

// ---------------- 对话里的整段“问你几件事” ----------------

type SetIntake = (f: (s: IntakeState) => IntakeState) => void

/** 回答一问（改答案时只改不前进）。输入框里直接回车 = 用推荐答案回答正在问的这一问 */
export function answerQ(set: SetIntake, k: QKey, patch: Partial<Answers> = {}) {
  const i = QUESTIONS.indexOf(k)
  set(x => {
    const answers = { ...x.answers, ...patch }
    if (x.editing) return { ...x, answers, editing: null }
    const step = Math.max(x.step, i + 1)
    return { ...x, answers, step, phase: step >= QUESTIONS.length ? 'done' : 'asking' }
  })
}

export function Intake({ s, set, onDone, locked }: { s: IntakeState; set: SetIntake; onDone: (a: Answers) => void; locked: boolean }) {
  const custom = useStore(st => st.projects)
  const [readN, setReadN] = useState(s.phase === 'reading' ? 0 : READ_STEPS.length)
  // 每段话说完才出下一段，问题卡跟在它那句话后面
  const [heard, setHeard] = useState<Record<string, boolean>>({})
  const hear = useCallback((id: string) => setHeard(h => (h[id] ? h : { ...h, [id]: true })), [])

  // 读录像：几步依次打勾，然后开始问
  useEffect(() => {
    if (s.phase !== 'reading') return
    const ids = READ_STEPS.map((_, i) => window.setTimeout(() => setReadN(i + 1), 450 + i * 520))
    const end = window.setTimeout(() => set(x => ({ ...x, phase: 'asking' })), 450 + READ_STEPS.length * 520 + 200)
    return () => { ids.forEach(clearTimeout); clearTimeout(end) }
  }, [s.phase, set])

  // 最后那句话说完，交给编排
  const handed = useRef(false)
  useEffect(() => {
    if (!heard.end || handed.current) return
    handed.current = true
    window.setTimeout(() => onDone(s.answers), 500)
  }, [heard.end]) // eslint-disable-line react-hooks/exhaustive-deps

  const reading = s.phase === 'reading'
  const lastHeard = s.quick || heard[QUESTIONS[QUESTIONS.length - 1]]
  return (
    <div className="mb-2 text-[15px] leading-[1.75]">
      <div className="mb-3">
        <div className="text-ink-2 inline-flex items-center gap-1.5 py-1 text-[15px]">
          {reading ? <span className="shimmer-text">正在看录像</span> : <span>看完了录像，用时 3 秒</span>}
        </div>
        <div className="think-body">
          <ol className="think-steps py-1">
            {READ_STEPS.slice(0, readN).map(st => {
              const a = agentById(st.agent)
              return (
                <motion.li key={st.text} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <i style={{ background: a.color }} /><b>{a.name}</b><span>{st.text}</span>
                </motion.li>
              )
            })}
          </ol>
        </div>
      </div>

      {!reading && (
        <>
          <Said id="sum" onEnd={hear} text={`这是一场 **9 分 49 秒的外部竞品直播**，${XM.attendees.length} 位发言人都是外部嘉宾，只引用原话、不推送。内容集中在**安全体系**；开场说的第二部分**电子安全**不在这段录像里。开始分发之前，跟你确认 ${QUESTIONS.length} 件事。`}>
            <AnalysisCard />
            {s.step === 0 && !s.quick && !locked && (
              <button className="text-primary -mt-3 mb-5 inline-flex items-center gap-1 text-[13px] hover:underline" onClick={() => set(x => ({ ...x, step: QUESTIONS.length, phase: 'done', quick: true }))}>都按推荐来，直接开始分发 →</button>
            )}
          </Said>
          {s.quick ? (
            <Bubble>都按推荐来</Bubble>
          ) : heard.sum && QUESTIONS.map((k, i) => {
            if (i > s.step || (i > 0 && !heard[QUESTIONS[i - 1]])) return null
            const answered = i < s.step
            const editing = s.editing === k
            return (
              <div key={k}>
                <Said id={k} onEnd={hear} text={PROMPTS[k]} />
                <AnimatePresence mode="wait" initial={false}>
                  {!heard[k] ? null : answered && !editing ? (
                    <Bubble key="a" onEdit={locked || s.phase === 'done' ? undefined : () => set(x => ({ ...x, editing: k }))}>{answerText(k, s.answers, custom)}</Bubble>
                  ) : (
                    <motion.div key="q" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
                      <Question k={k} i={i} a={s.answers} onAnswer={p => answerQ(set, k, p)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
          {s.phase === 'done' && lastHeard && (
            <Said id="end" onEnd={hear} text={`好，信息齐了：**${projectOf(s.answers.project, custom).name}** · ${s.answers.people.length} 位候选收到者 · ${s.answers.review ? '发送前先给你看' : '确认后直接发出'}。开始编排 8 个智能体。`} />
          )}
        </>
      )}
    </div>
  )
}

/** 你的回答（右侧气泡），开始编排前可以改 */
function Bubble({ children, onEdit }: { children: ReactNode; onEdit?: () => void }) {
  return (
    <motion.div className="group mt-1 mb-6 flex items-center justify-end gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {onEdit && (
        <button className="text-ink-3 hover:text-ink inline-flex items-center gap-1 text-[12.5px] opacity-0 transition-opacity group-hover:opacity-100" onClick={onEdit}>
          <Pencil size={12} /> 修改
        </button>
      )}
      <div className="max-w-[75%] rounded-[22px] bg-[#F4F4F4] px-[18px] py-2.5 text-[15px] leading-relaxed">{children}</div>
    </motion.div>
  )
}

/** 会映说的一段话（流式），说完通知一声 */
function Said({ id, text, onEnd, children }: { id: string; text: string; onEnd: (id: string) => void; children?: ReactNode }) {
  const n = useStream(true, false, 120)
  const len = richLen(text)
  useEffect(() => {
    if (n >= len) onEnd(id)
  }, [n, len, id, onEnd])
  return (
    <div className="chat-md mb-2">
      <p className="!mb-1">{rich(text, n)}{n < len && <span className="cursor-dot" />}</p>
      {n >= len && children}
    </div>
  )
}

/** 看完录像的结论卡 */
function AnalysisCard() {
  const rows: { k: string; v: ReactNode }[] = [
    { k: '来源', v: <>小米汽车安全专场直播.mp4 · 09:49 · 竖屏 {XM.video!.width}×{XM.video!.height}</> },
    { k: '发言人', v: <span className="inline-flex items-center gap-2"><FaceStack ids={XM.attendees} size={20} /><span className="text-ink-3 text-[12.5px]">外部嘉宾 · 只引用原话</span></span> },
    { k: '内容', v: <>{XM.segments.length} 段发言 · {XM.chapters.length} 个章节 · 安全体系</> },
    { k: '没覆盖', v: <span className="text-amber-700">电子安全（直播第二部分）</span> },
  ]
  return (
    <motion.div className="mt-2 mb-6 flex gap-4 rounded-2xl border bg-[#FAFAF8] p-3.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <img src={XM.video!.poster} alt="" className="h-[104px] w-[59px] flex-none rounded-lg object-cover" draggable={false} />
      <dl className="grid min-w-0 flex-1 grid-cols-[52px_minmax(0,1fr)] content-center gap-x-3 gap-y-1.5 text-[13px]">
        {rows.map(r => (
          <div key={r.k} className="contents">
            <dt className="text-ink-3">{r.k}</dt>
            <dd className="min-w-0 truncate">{r.v}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  )
}

// ---------------- 问题卡 ----------------

function Question({ k, i, a, onAnswer }: { k: QKey; i: number; a: Answers; onAnswer: (p: Partial<Answers>) => void }) {
  if (k === 'meta') return <MetaQ i={i} a={a} onAnswer={onAnswer} />
  if (k === 'project') return <ProjectQ i={i} a={a} onAnswer={onAnswer} />
  if (k === 'people') return <PeopleQ i={i} a={a} onAnswer={onAnswer} />
  return <ReviewQ i={i} a={a} onAnswer={onAnswer} />
}

function Card({ i, title, children, foot }: { i: number; title: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="border-ink mt-2 mb-6 overflow-hidden rounded-2xl border bg-white text-[14px] leading-normal shadow-[0_10px_30px_-16px_rgba(0,0,0,.35)]">
      <div className="flex items-center gap-2 px-4 pt-3.5">
        <span className="text-ink-3 font-mono text-[11.5px]">{i + 1}/{QUESTIONS.length}</span>
        <b className="text-[14.5px]">{title}</b>
        <span className="ml-auto flex gap-1">
          {QUESTIONS.map((q, j) => <span key={q} className={cn('h-1 w-4 rounded-full', j < i ? 'bg-ink' : j === i ? 'bg-primary' : 'bg-[#E5E5E5]')} />)}
        </span>
      </div>
      <div className="px-4 pt-3 pb-4">{children}</div>
      {foot && <div className="flex items-center gap-2 border-t bg-[#FAFAFA] px-4 py-2.5">{foot}</div>}
    </div>
  )
}

const Confirm = ({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) => (
  <button disabled={disabled} onClick={onClick} className="bg-ink ml-auto inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13.5px] font-medium text-white transition-transform hover:-translate-y-px disabled:opacity-40">
    <Check size={14} strokeWidth={2.6} /> {children}
  </button>
)
const Hint = ({ children }: { children: ReactNode }) => <span className="text-ink-3 text-[12px]">{children}</span>

function MetaQ({ i, a, onAnswer }: { i: number; a: Answers; onAnswer: (p: Partial<Answers>) => void }) {
  const [title, setTitle] = useState(a.title)
  const [date, setDate] = useState(a.date)
  const [kind, setKind] = useState(a.kind)
  const ok = () => title.trim() && onAnswer({ title: title.trim(), date, kind })
  const enter = (e: React.KeyboardEvent) => e.key === 'Enter' && ok()
  return (
    <Card i={i} title="会议信息" foot={<><Hint>在下面输入框直接回车 = 用识别结果</Hint><Confirm disabled={!title.trim()} onClick={ok}>没问题</Confirm></>}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <label className="flex flex-col gap-1"><span className="text-ink-3 text-[12px]">标题</span><Input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={enter} /></label>
        <label className="flex flex-col gap-1"><span className="text-ink-3 text-[12px]">时间</span><Input value={date} onChange={e => setDate(e.target.value)} onKeyDown={enter} /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-ink-3 mr-1 text-[12px]">类型</span>
        {KINDS.map(x => (
          <button key={x} onClick={() => setKind(x)} className={cn('h-7 rounded-full border px-3 text-[12.5px] transition-colors', kind === x ? 'border-ink bg-white font-medium' : 'text-ink-2 border-transparent bg-[#F4F4F4] hover:bg-[#EDEDED]')}>{x}</button>
        ))}
      </div>
      <div className="text-ink-3 mt-3 flex items-center gap-2 text-[12.5px]">
        <span>发布者</span><Face p={ME} size={20} /><b className="text-ink font-medium">{personById(ME).name}（你）</b>
        <span>· 收到者看到的是“{personById(ME).name} 发来”</span>
      </div>
    </Card>
  )
}

function ProjectQ({ i, a, onAnswer }: { i: number; a: Answers; onAnswer: (p: Partial<Answers>) => void }) {
  const custom = useStore(s => s.projects)
  const [pick, setPick] = useState(a.project)
  const [creating, setCreating] = useState(false)
  const list = [...PROJECTS, ...custom]
  return (
    <Card i={i} title="放进哪个项目" foot={<><Hint>项目的 Leader 默认是发布者</Hint><Confirm onClick={() => onAnswer({ project: pick })}>放进这个项目</Confirm></>}>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map(p => {
          const on = pick === p.id
          return (
            <button key={p.id} onClick={() => setPick(p.id)} className={cn('flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors', on ? 'border-ink bg-white shadow-[0_0_0_3px_rgba(0,0,0,.05)]' : 'hover:border-ink-4 border-[#E8E8E8]')}>
              <span className="grid size-9 flex-none place-items-center rounded-lg" style={{ background: p.soft, color: p.color }}><Kb name={p.icon} size={22} /></span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-center gap-1.5"><b className="text-[13.5px]">{p.name}</b>{p.id === RECOMMENDED.project && <span className="bg-primary/10 text-primary rounded px-1 text-[10.5px] font-medium">推荐</span>}</span>
                <small className="text-ink-3 block truncate text-[11.5px]">{p.desc} · {personById(p.leader).name}</small>
              </span>
              <span className={cn('grid size-4 flex-none place-items-center rounded-full border', on ? 'border-ink bg-ink text-white' : 'border-[#D0D0D0]')}>{on && <Check size={10} strokeWidth={3.4} />}</span>
            </button>
          )
        })}
        {!creating && (
          <button onClick={() => setCreating(true)} className="text-ink-2 hover:border-ink-4 hover:text-ink flex items-center justify-center gap-1.5 rounded-xl border border-dashed p-2.5 text-[13px] transition-colors">
            <Plus size={15} /> 新建项目
          </button>
        )}
      </div>
      <AnimatePresence>
        {creating && <NewProject onDone={id => { setCreating(false); if (id) setPick(id) }} />}
      </AnimatePresence>
    </Card>
  )
}

function NewProject({ onDone }: { onDone: (id?: ProjectId) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(P_COLORS[4])
  const [icon, setIcon] = useState<KoboyoName>('lightbulb')
  const create = () => {
    if (!name.trim()) return
    const id = `p_${Date.now()}`
    actions.addProject({ id, name: name.trim(), color, soft: `${color}14`, icon, desc: '新建项目', leader: ME, members: [ME] })
    onDone(id)
  }
  return (
    <motion.div className="mt-2 overflow-hidden rounded-xl border bg-[#FAFAF7]" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 flex-none place-items-center rounded-lg bg-white" style={{ color }}><Kb name={icon} size={22} /></span>
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); create() } }} placeholder="项目名称，例如：电子安全专项" className="bg-white" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
          <span className="flex items-center gap-1.5"><span className="text-ink-3">颜色</span>
            {P_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={cn('size-4 rounded-full', color === c && 'ring-2 ring-offset-2')} style={{ background: c, '--tw-ring-color': c } as CSSProperties} aria-label={c} />)}
          </span>
          <span className="flex items-center gap-0.5"><span className="text-ink-3 mr-1">图标</span>
            {P_ICONS.map(k => <button key={k} onClick={() => setIcon(k)} className={cn('grid size-7 place-items-center rounded-lg', icon === k ? 'bg-white shadow-sm' : 'opacity-50 hover:opacity-100')} style={{ color }}><Kb name={k} size={17} /></button>)}
          </span>
          <span className="ml-auto flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => onDone()}>取消</Button>
            <Button size="sm" disabled={!name.trim()} onClick={create}><Check /> 创建并选中</Button>
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function PeopleQ({ i, a, onAnswer }: { i: number; a: Answers; onAnswer: (p: Partial<Answers>) => void }) {
  const [people, setPeople] = useState<PersonId[]>(a.people)
  const toggle = (id: PersonId) => setPeople(ps => (ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]))
  return (
    <Card i={i} title={`收到者候选 · ${people.length} 位`} foot={<><Hint>实线是候选，虚线点一下加进来</Hint><Confirm disabled={!people.length} onClick={() => onAnswer({ people })}>就这些人</Confirm></>}>
      <div className="flex flex-col gap-2">
        {RANK_ORDER.map(r => (
          <div key={r} className="flex flex-wrap items-center gap-1.5">
            <span className="w-[76px] flex-none text-[12px]" style={{ color: RANKS[r].color }}><b className="font-mono">{RANKS[r].level}</b> {RANKS[r].label}</span>
            {STAFF.filter(x => x.rank === r && x.id !== ME).map(p => {
              const on = people.includes(p.id)
              return (
                <button key={p.id} onClick={() => toggle(p.id)} className={cn('flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-[13px] transition-colors', on ? 'border-ink bg-white' : 'text-ink-3 border-dashed bg-transparent hover:border-ink-4')} title={`${p.team} · ${p.role}`}>
                  <Face p={p} size={22} muted={!on} />{p.name}<span className="text-ink-3 text-[11.5px]">{p.role}</span>
                </button>
              )
            })}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
          <span className="w-[76px] flex-none text-[12px] text-[#C2410C]">外部发言人</span>
          <FaceStack ids={XM.attendees} size={22} />
          <span className="text-ink-3 text-[12px]">自动识别，只引用原话，不推送</span>
        </div>
      </div>
    </Card>
  )
}

function ReviewQ({ i, a, onAnswer }: { i: number; a: Answers; onAnswer: (p: Partial<Answers>) => void }) {
  const opts = [
    { v: true, icon: Eye, t: '先给我看一眼，再发', d: '投递官停在发送前，等你看完分发矩阵点“确认发送”', rec: true },
    { v: false, icon: Send, t: '直接发出', d: '编排完自动投递飞书；确认、追问照样回流到账本', rec: false },
  ]
  return (
    <Card i={i} title="发送前">
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map(o => {
          const I = o.icon
          return (
            <button key={String(o.v)} onClick={() => onAnswer({ review: o.v })} className={cn('group flex gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-px', a.review === o.v ? 'border-ink' : 'hover:border-ink-4 border-[#E8E8E8]')}>
              <span className="text-ink-2 group-hover:text-ink mt-0.5"><I size={18} /></span>
              <span className="leading-snug">
                <span className="flex items-center gap-1.5"><b className="text-[13.5px]">{o.t}</b>{o.rec && <span className="bg-primary/10 text-primary rounded px-1 text-[10.5px] font-medium">推荐</span>}</span>
                <small className="text-ink-3 mt-0.5 block text-[12px]">{o.d}</small>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
