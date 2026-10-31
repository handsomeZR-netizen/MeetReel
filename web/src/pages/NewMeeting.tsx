// 新建会议：上传录像 / 录音 / 妙记，选项目（可以当场新建）、收到者和模型，然后交给智能分发。
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, FileText, FileVideo, Link2, Plus, Upload, Waypoints, X } from 'lucide-react'
import { DEFAULT_MODELS, ME, MODELS, PROJECTS, RANKS, STAFF, personById, type ModelId, type PersonId, type ProjectId, type Rank } from '@/data/model'
import { XM } from '@/data/meetings'
import { AGENTS, agentModel } from '@/data/run'
import { go } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Kbd, Switch } from '@/components/ui/misc'
import { TopBar } from '@/components/shell/TopBar'
import { Face, Kb, ModelIcon, RankTag } from '@/components/common/bits'
import type { KoboyoName } from '@/components/sketch/koboyoData'

const STEPS: { icon: KoboyoName; t: string; d: string }[] = [
  { icon: 'quill', t: '转写与说话人', d: '场记切分发言、认出谁在说话，生成逐字稿' },
  { icon: 'magnifyingGlass', t: '抽出会议账本', d: '6 类条目，每条都锚定到原话和录像时间' },
  { icon: 'stamp', t: '审核', d: '原话对不上就打回；绝对化表述、缺负责人会标出来' },
  { icon: 'route', t: '按人路由', d: '相关性 × 权限 × 职级，没参会但受影响的人也不会漏' },
  { icon: 'pencil', t: '逐人改写', d: '高管看决议和投入，成员只看自己的待办' },
  { icon: 'paperPlane', t: '你确认后投递', d: '飞书卡片 + H5；确认、追问都回流到账本' },
]

const RANK_ORDER: Rank[] = ['exec', 'head', 'lead', 'staff']
const P_COLORS = ['#0891B2', '#4F46E5', '#DB2777', '#D97706', '#059669', '#7C3AED']
const P_ICONS: KoboyoName[] = ['newspaper', 'target', 'rocket', 'lightbulb', 'compass', 'team']

export function NewMeeting() {
  const models = useStore(s => s.models)
  const custom = useStore(s => s.projects)
  const projects = [...PROJECTS, ...custom]
  const [source, setSource] = useState<'video' | 'feishu' | 'text'>('video')
  const [file, setFile] = useState(false)
  const [project, setProject] = useState<ProjectId>(XM.project)
  const [people, setPeople] = useState<PersonId[]>(XM.related)
  const [review, setReview] = useState(true)
  const [creating, setCreating] = useState(false)
  const toggle = (id: PersonId) => setPeople(ps => (ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]))

  return (
    <>
      <TopBar crumbs={[{ label: '新建会议' }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border bg-white">
            <div className="border-b px-6 py-5">
              <h1 className="text-[20px] font-semibold tracking-tight">新建会议</h1>
              <p className="text-ink-3 mt-0.5 text-[13px]">把录像、录音或飞书妙记交给会映。多个智能体拆成每人一份的简报：附原话，写明为什么发给你。</p>
            </div>
            <div className="flex flex-col gap-6 px-6 py-5">
              <Field label="来源">
                <div className="flex w-fit rounded-xl bg-[#F2F3F5] p-1">
                  {([['video', '录像 / 录音', FileVideo], ['feishu', '飞书妙记', Link2], ['text', '粘贴文本', FileText]] as const).map(([k, l, I]) => (
                    <button key={k} onClick={() => setSource(k)} className={cn('relative flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px]', source === k ? 'text-ink font-medium' : 'text-ink-3')}>
                      {source === k && <motion.span layoutId="src-pill" className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
                      <I size={14} className="relative" /><span className="relative">{l}</span>
                    </button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div key="file" className="mt-3 flex items-center gap-3 rounded-2xl border bg-[#F8FAFF] p-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <img src={XM.video!.poster} alt="" className="h-14 w-8 flex-none rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <b className="text-[14px]">小米汽车安全专场直播.mp4</b>
                        <div className="text-ink-3 text-[12.5px]">09:49 · 竖屏 544×960 · 已识别 4 位发言人 · {XM.segments.length} 段</div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#E3EBFD]"><motion.div className="bg-primary h-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.2, ease: 'easeOut' }} /></div>
                      </div>
                      <button className="text-ink-3 hover:text-ink grid size-7 place-items-center rounded-lg hover:bg-black/5" onClick={() => setFile(false)} aria-label="移除"><X size={15} /></button>
                    </motion.div>
                  ) : (
                    <motion.button key="drop" onClick={() => setFile(true)} className="kb-tile mt-3 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <span className="text-ink-3"><Upload size={22} /></span>
                      <b className="text-[14px]">{source === 'feishu' ? '粘贴飞书妙记链接' : source === 'text' ? '粘贴会议文本（姓名：发言）' : '把录像或录音拖到这里'}</b>
                      <span className="text-ink-3 text-[12.5px]">支持 mp4 / mov / mp3 / m4a，或点这里选择文件</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="标题"><Input defaultValue={XM.title} /></Field>
                <Field label="时间"><Input defaultValue={XM.date} /></Field>
              </div>

              <Field label="项目" hint="会议、账本和待办跟着项目走；项目的 Leader 默认是发布者">
                <div className="flex flex-wrap gap-2">
                  {projects.map(p => (
                    <button key={p.id} onClick={() => setProject(p.id)} className={cn('kb-tile flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]', project === p.id && 'border-ink')}>
                      <span style={{ color: p.color }}><Kb name={p.icon} size={18} /></span>{p.name}
                      <span className="text-ink-3 text-[11.5px]">· {personById(p.leader).name}</span>
                    </button>
                  ))}
                  {!creating && (
                    <button onClick={() => setCreating(true)} className="text-ink-2 hover:border-ink-4 hover:text-ink flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-[13px] transition-colors">
                      <Plus size={15} /> 新建项目
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {creating && <NewProject onDone={id => { setCreating(false); if (id) setProject(id) }} />}
                </AnimatePresence>
              </Field>

              <Field label="发布者"><span className="flex items-center gap-2 text-[13.5px]"><Face p={ME} size={26} /><b className="font-medium">{personById(ME).name}（你）</b><RankTag p={ME} /><span className="text-ink-3 text-[12.5px]">上传、确认分发的人；收到者看到的是“{personById(ME).name} 发来”</span></span></Field>

              <Field label={`收到者候选 · ${people.length}`} hint="路由官只在这些人里判断要不要打扰；没参会但可能相关的人也加进来">
                <div className="flex flex-col gap-2">
                  {RANK_ORDER.map(r => (
                    <div key={r} className="flex flex-wrap items-center gap-2">
                      <span className="w-[88px] flex-none text-[12px]" style={{ color: RANKS[r].color }}><b className="font-mono">{RANKS[r].level}</b> {RANKS[r].label}</span>
                      {STAFF.filter(x => x.rank === r && x.id !== ME).map(p => {
                        const on = people.includes(p.id)
                        return (
                          <button key={p.id} onClick={() => toggle(p.id)} className={cn('flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] transition-colors', on ? 'border-ink bg-white' : 'text-ink-3 border-dashed bg-transparent')} title={`${p.team} · ${p.role}`}>
                            <Face p={p} size={24} muted={!on} />{p.name}<span className="text-ink-3 text-[11.5px]">{p.role}</span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-[88px] flex-none text-[12px] text-[#C2410C]">外部发言人</span>
                    {XM.attendees.map(pid => (
                      <span key={pid} className="text-ink-3 flex items-center gap-1.5 rounded-full border border-dashed py-1 pr-3 pl-1 text-[13px]"><Face p={pid} size={24} />{personById(pid).name}</span>
                    ))}
                    <span className="text-ink-3 text-[12px]">自动识别，只引用原话，不推送</span>
                  </div>
                </div>
              </Field>

              <ModelField models={models} />

              <Field label="发送前">
                <label className="flex h-[42px] w-fit items-center gap-2.5 rounded-xl border px-3 text-[13px]"><Switch checked={review} onCheckedChange={setReview} /> 先给我看分发矩阵，再发</label>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              {!file && <span className="text-ink-3 mr-auto text-[12.5px]">先选择会议录像或录音</span>}
              <Button disabled={!file} onClick={() => go(`/dispatch/${XM.id}`, { run: 1 })}><Waypoints /> 开始智能分发 <Kbd className="bg-white/15 text-white">↵</Kbd></Button>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border bg-[#FAFAF7] p-5 lg:sticky lg:top-0">
            <b className="text-[15px]">接下来会发生什么</b>
            <ol className="mt-4 flex flex-col gap-4">
              {STEPS.map((s, i) => (
                <motion.li key={s.t} className="kb-wiggle flex gap-3" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                  <span className="text-ink-2 flex-none"><Kb name={s.icon} size={30} /></span>
                  <div><b className="text-[13.5px]">{i + 1}. {s.t}</b><p className="text-ink-3 text-[12.5px] leading-relaxed">{s.d}</p></div>
                </motion.li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2"><span className="text-[13.5px] font-medium">{label}</span>{hint && <span className="text-ink-3 text-[12px]">{hint}</span>}</div>
      {children}
    </div>
  )
}

// ---------------- 新建项目（当场建，建完自动选中） ----------------

function NewProject({ onDone }: { onDone: (id?: ProjectId) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(P_COLORS[4])
  const [icon, setIcon] = useState<KoboyoName>('lightbulb')
  const [leader, setLeader] = useState<PersonId>(ME)
  const create = () => {
    if (!name.trim()) return
    const id = `p_${Date.now()}`
    actions.addProject({ id, name: name.trim(), color, soft: `${color}14`, icon, desc: '新建项目', leader, members: [leader] })
    onDone(id)
  }
  return (
    <motion.div className="mt-3 overflow-hidden rounded-2xl border bg-[#FAFAF7]" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-xl bg-white" style={{ color }}><Kb name={icon} size={24} /></span>
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} placeholder="项目名称，例如：电子安全专项" className="bg-white" />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
          <span className="flex items-center gap-1.5"><span className="text-ink-3">颜色</span>
            {P_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={cn('size-5 rounded-full', color === c && 'ring-2 ring-offset-2')} style={{ background: c, '--tw-ring-color': c } as React.CSSProperties} aria-label={c} />)}
          </span>
          <span className="flex items-center gap-1"><span className="text-ink-3 mr-0.5">图标</span>
            {P_ICONS.map(k => <button key={k} onClick={() => setIcon(k)} className={cn('grid size-7 place-items-center rounded-lg', icon === k ? 'bg-white shadow-sm' : 'opacity-50 hover:opacity-100')} style={{ color }}><Kb name={k} size={18} /></button>)}
          </span>
          <span className="flex items-center gap-1.5"><span className="text-ink-3">Leader</span>
            <select value={leader} onChange={e => setLeader(e.target.value as PersonId)} className="h-7 rounded-lg border bg-white px-1.5 text-[12.5px]">
              {STAFF.map(x => <option key={x.id} value={x.id}>{x.name} · {RANKS[x.rank].level} {x.role}</option>)}
            </select>
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onDone()}>取消</Button>
          <Button size="sm" disabled={!name.trim()} onClick={create}><Check /> 创建并选中</Button>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------- 模型：默认多模型协同，主流模型都能选 ----------------

function ModelField({ models }: { models: ModelId[] }) {
  const multi = models.length > 1
  const pick = (id: ModelId) => (multi ? actions.toggleModel(id) : actions.setModels([id]))
  const groups: { label: string; list: typeof MODELS }[] = [
    { label: '国内', list: MODELS.filter(m => m.region === 'cn') },
    { label: '海外', list: MODELS.filter(m => m.region === 'global') },
  ]
  const llm = AGENTS.filter(a => !['orc', 'scribe', 'disp'].includes(a.id))
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] font-medium">模型</span>
        <div className="flex rounded-lg bg-[#F2F3F5] p-0.5 text-[12.5px]">
          <button onClick={() => actions.setModels(DEFAULT_MODELS)} className={cn('h-7 rounded-md px-2.5', multi ? 'text-ink bg-white font-medium shadow-sm' : 'text-ink-3')}>多模型协同（推荐）</button>
          <button onClick={() => actions.setModels([models[0]])} className={cn('h-7 rounded-md px-2.5', !multi ? 'text-ink bg-white font-medium shadow-sm' : 'text-ink-3')}>单一模型</button>
        </div>
        <span className="text-ink-3 text-[12px]">{multi ? `已选 ${models.length} 个，每个智能体自动用最合适的那个` : '全部智能体用同一个模型'}</span>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border p-3">
        {groups.map(g => (
          <div key={g.label} className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink-3 w-9 flex-none text-[12px]">{g.label}</span>
            {g.list.map(m => {
              const on = models.includes(m.id)
              return (
                <button key={m.id} onClick={() => pick(m.id)} className={cn('flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[12.5px] transition-colors', on ? 'border-ink bg-white font-medium' : 'text-ink-2 border-transparent bg-[#F6F6F7] hover:bg-[#EFEFF1]')} title={`${m.label} · ${m.vendor}${m.open ? ' · 可私有化部署' : ''}`}>
                  <ModelIcon icon={m.id} size={15} />{m.label}
                  {on && multi && <Check size={12} strokeWidth={3} className="text-ink-2" />}
                </button>
              )
            })}
          </div>
        ))}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-2.5 text-[12px]">
          <span className="text-ink-3">这次分工</span>
          {llm.map(a => {
            const b = agentModel(a.id, models)
            return <span key={a.id} className="inline-flex items-center gap-1"><i className="size-1.5 rounded-full" style={{ background: a.color }} />{a.name}<ModelIcon icon={b.icon} size={13} /><span className="text-ink-2">{b.label}</span></span>
          })}
          <span className="text-ink-3 inline-flex items-center gap-1">场记<ModelIcon icon="modelscope" size={13} />FunASR</span>
        </div>
      </div>
    </div>
  )
}
