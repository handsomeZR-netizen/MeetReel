// 新建会议：上传录像 / 录音 / 妙记，选项目和相关人，然后交给智能分发。
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, FileVideo, Link2, Upload, Waypoints, X } from 'lucide-react'
import { ENGINES, PEOPLE, PROJECTS, type PersonId, type ProjectId } from '@/data/model'
import { meetingById } from '@/data/meetings'
import { go } from '@/lib/router'
import { actions, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Kbd, Switch } from '@/components/ui/misc'
import { TopBar } from '@/components/shell/TopBar'
import { Face, Kb, ModelIcon } from '@/components/common/bits'
import type { KoboyoName } from '@/components/sketch/koboyoData'

const D11 = meetingById('d11')!

const STEPS: { icon: KoboyoName; t: string; d: string }[] = [
  { icon: 'quill', t: '转写与说话人', d: '场记切分发言、认出谁在说话，生成逐字稿' },
  { icon: 'magnifyingGlass', t: '抽出会议账本', d: '6 类条目，每条都锚定到原话和录像时间' },
  { icon: 'stamp', t: '审核', d: '原话对不上就打回；缺负责人、缺截止会标出来' },
  { icon: 'route', t: '按人路由', d: '相关性 × 权限，没参会但受影响的人也不会漏' },
  { icon: 'pencil', t: '逐人改写', d: '“这对你意味着什么”，30 秒读完' },
  { icon: 'paperPlane', t: '你确认后投递', d: '飞书卡片 + H5；确认、追问都回流到账本' },
]

export function NewMeeting() {
  const engine = useStore(s => s.engine)
  const [source, setSource] = useState<'video' | 'feishu' | 'text'>('video')
  const [file, setFile] = useState(false)
  const [project, setProject] = useState<ProjectId>('p_promo')
  const [people, setPeople] = useState<PersonId[]>(D11.related)
  const [review, setReview] = useState(true)
  const toggle = (id: PersonId) => setPeople(ps => (ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]))
  const ready = file

  return (
    <>
      <TopBar crumbs={[{ label: '新建会议' }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-3xl border bg-white">
            <div className="border-b px-6 py-5">
              <h1 className="text-[20px] font-semibold tracking-tight">新建会议</h1>
              <p className="text-ink-3 mt-0.5 text-[13px]">把录像、录音或飞书妙记交给会映，8 个智能体拆成每人一份的简报：附原话，写明为什么发给你。</p>
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
                      <span className="bg-primary grid size-11 place-items-center rounded-xl text-white"><FileVideo size={20} /></span>
                      <div className="min-w-0 flex-1">
                        <b className="text-[14px]">双11活动上线评审.mp4</b>
                        <div className="text-ink-3 text-[12.5px]">00:58 · 1080p · 已识别 3 位发言人 · 11 段</div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#E3EBFD]"><motion.div className="bg-primary h-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.2, ease: 'easeOut' }} /></div>
                      </div>
                      <button className="text-ink-3 hover:text-ink grid size-7 place-items-center rounded-lg hover:bg-black/5" onClick={() => setFile(false)} aria-label="移除"><X size={15} /></button>
                    </motion.div>
                  ) : (
                    <motion.button key="drop" onClick={() => setFile(true)} className="kb-tile mt-3 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <span className="text-ink-3"><Upload size={22} /></span>
                      <b className="text-[14px]">{source === 'feishu' ? '粘贴飞书妙记链接' : source === 'text' ? '粘贴会议文本（姓名：发言）' : '把录像或录音拖到这里'}</b>
                      <span className="text-ink-3 text-[12.5px]">演示：点这里载入示例“双11活动上线评审.mp4”</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="标题"><Input defaultValue={D11.title} /></Field>
                <Field label="时间"><Input defaultValue="2026-10-31 10:00" /></Field>
              </div>

              <Field label="项目">
                <div className="flex flex-wrap gap-2">
                  {PROJECTS.map(p => (
                    <button key={p.id} onClick={() => setProject(p.id)} className={cn('kb-tile flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]', project === p.id && 'border-ink')}>
                      <span style={{ color: p.color }}><Kb name={p.icon} size={18} /></span>{p.name}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={`相关人 · ${people.length}`} hint="参会的人会自动识别；没参会但可能相关的人也加进来，路由官会判断要不要打扰">
                <div className="flex flex-wrap gap-2">
                  {PEOPLE.map(p => {
                    const on = people.includes(p.id)
                    const present = D11.attendees.includes(p.id)
                    return (
                      <button key={p.id} onClick={() => toggle(p.id)} className={cn('flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] transition-colors', on ? 'border-ink bg-white' : 'text-ink-3 border-dashed bg-transparent')}>
                        <Face p={p} size={24} muted={!on} ring={on && present ? '#22C55E' : undefined} />{p.name}
                        {on && <span className="text-ink-3 text-[11px]">{present ? '参会' : '缺席'}</span>}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="模型">
                  <div className="flex gap-2">
                    {ENGINES.map(e => (
                      <button key={e.id} onClick={() => actions.setEngine(e.id)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[13px]', engine === e.id && 'border-ink ring-[3px] ring-black/5')}>
                        <ModelIcon icon={e.id} size={15} />{e.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="发送前">
                  <label className="flex h-[42px] items-center gap-2.5 rounded-xl border px-3 text-[13px]"><Switch checked={review} onCheckedChange={setReview} /> 先给我看分发矩阵，再发</label>
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
              <span className="text-ink-3 text-[12.5px]">演示数据：无论上传什么，都会用“双 11 活动上线评审”跑一遍</span>
              <Button disabled={!ready} onClick={() => go('/dispatch/d11', { run: 1 })}><Waypoints /> 开始智能分发 <Kbd className="bg-white/15 text-white">↵</Kbd></Button>
            </div>
          </div>

          <aside className="rounded-3xl border bg-[#FAFAF7] p-5">
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2"><span className="text-[13.5px] font-medium">{label}</span>{hint && <span className="text-ink-3 text-[12px]">{hint}</span>}</div>
      {children}
    </div>
  )
}
