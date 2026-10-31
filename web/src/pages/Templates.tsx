// 模板中心：分发规则（相关性）、权限闸、简报模板、会议模板、关注档案。
import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ITEM_TYPES, PEOPLE, REASONS, SENSITIVITY, type ItemType, type Sensitivity } from '@/data/model'
import { MEETINGS } from '@/data/meetings'
import { d11Brief } from '@/data/run'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/misc'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TopBar } from '@/components/shell/TopBar'
import { Face, Kb } from '@/components/common/bits'
import type { KoboyoName } from '@/components/sketch/koboyoData'

type Tab = 'rules' | 'briefs' | 'meetings' | 'profiles'

const RULES: { id: string; icon: KoboyoName; example: string; desc: string }[] = [
  { id: 'R1', icon: 'megaphone', desc: '发言里直接叫到名字，或“我来”“我负责”。', example: '“孙悦，物料跟着改” → 孙悦' },
  { id: 'R2', icon: 'team', desc: '提到某个角色或部门，按关注档案找到对应的人。', example: '“客服 7 号前把 FAQ 更新好” → 李琳' },
  { id: 'R3', icon: 'clipboard', desc: '条目涉及的东西，在某人的档案里写着“负责”。', example: '扩容决议 → 负责扩容的陈默' },
  { id: 'R4', icon: 'chain', desc: '影响链：某人依赖的东西变了。没参会、没被点名，也该知道。', example: '订单接口拆字段 → 依赖订单接口的赵一' },
  { id: 'R5', icon: 'bell', desc: '订阅了某个话题（例如“上线时间”），有变化就收到。', example: '上线提前到 11/8 → 订阅了上线时间的李琳' },
  { id: 'R6', icon: 'compass', desc: '管理者规则：所有决议、变更、风险和待签批事项。', example: '扩容预算待签批 → 林总' },
]

const BRIEF_TPL: { name: string; for: string; icon: KoboyoName; points: string[]; sample: string }[] = [
  { name: '主持人版', for: '会议发起人', icon: 'clipboard', points: ['全部条目', '每条发给了谁、谁确认了', '缺负责人 / 缺截止的提醒'], sample: d11Brief('wangke').headline },
  { name: '管理者版', for: '业务负责人', icon: 'compass', points: ['决议、变更、风险、待签批', '约 60 秒读完', '可附 90 秒视频简报'], sample: d11Brief('linzong').headline },
  { name: '执行者版', for: '有待办的人', icon: 'pencil', points: ['我的待办在最前面', '影响我的变更', '确认 / 不是我 / 追问'], sample: d11Brief('chenmo').headline },
  { name: '只一件事', for: '财务、法务等', icon: 'stamp', points: ['只含和角色相关的单条事项', '受限信息按权限显示', '约 10 秒读完'], sample: d11Brief('zhouning').headline },
  { name: '不打扰', for: '没有必读的人', icon: 'coffee', points: ['不推送卡片', '相关变化放进日报', '想看可以随时打开账本'], sample: d11Brief('wutong').headline },
]

const MEETING_TPL: { name: string; icon: KoboyoName; focus: ItemType[]; rules: string[]; note: string }[] = [
  { name: '评审会', icon: 'magnifyingGlass', focus: ['decision', 'change', 'action', 'risk'], rules: ['R1', 'R2', 'R4', 'R6'], note: '重点抓变更和影响链，发送前给主持人看矩阵' },
  { name: '复盘会', icon: 'notebook', focus: ['info', 'risk', 'decision', 'action'], rules: ['R1', 'R3', 'R6'], note: '保留数据和教训，决议自动进知识库' },
  { name: 'OKR 对齐会', icon: 'target', focus: ['decision', 'change', 'action'], rules: ['R1', 'R5', 'R6'], note: '目标和排期变化推给订阅的人；预算类默认受限' },
  { name: '周会', icon: 'calendar', focus: ['action', 'question'], rules: ['R1', 'R2'], note: '只推待办和没答完的问题，其余进日报' },
]

export function Templates() {
  const [tab, setTab] = useState<Tab>('rules')
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(RULES.map(r => [r.id, true])))
  const [auto, setAuto] = useState(false)
  const hits = (rid: string) => MEETINGS.flatMap(m => m.routes).filter(r => r.reasons.includes(rid)).length

  return (
    <>
      <TopBar crumbs={[{ label: '模板中心' }]} />
      <div className="flex-none border-b px-6 pt-4">
        <h1 className="text-[20px] font-semibold tracking-tight">模板中心</h1>
        <p className="text-ink-3 mt-0.5 text-[13px]">决定“发给谁、能看到什么、写成什么样”。改这里，下一场会就按新规则分发。</p>
        <div className="mt-2 flex gap-1">
          {([['rules', '分发规则'], ['briefs', '简报模板'], ['meetings', '会议模板'], ['profiles', '关注档案']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('relative px-3 pt-2 pb-2.5 text-[13.5px]', tab === k ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink')}>
              {l}{tab === k && <motion.span layoutId="tpl-tab" className="bg-ink absolute inset-x-2 -bottom-px h-[2px] rounded-full" />}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1240px] px-6 py-6">
          {tab === 'rules' && (
            <div className="flex flex-col gap-6">
              <Section title="相关性：谁该知道" sub="六条规则依次判断，命中任一条就推送，并把理由写进简报">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {RULES.map(r => (
                    <div key={r.id} className={cn('kb-tile kb-wiggle rounded-2xl border bg-white p-4', !on[r.id] && 'opacity-55')}>
                      <div className="flex items-start gap-3">
                        <span className={r.id === 'R4' ? 'text-rose-600' : 'text-ink-2'}><Kb name={r.icon} size={34} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className="text-ink-3 font-mono text-[12px]">{r.id}</span><b className="text-[15px]">{REASONS[r.id]}</b></div>
                          <p className="text-ink-2 mt-1 text-[13px] leading-relaxed">{r.desc}</p>
                        </div>
                        <Switch checked={on[r.id]} onCheckedChange={v => setOn(s => ({ ...s, [r.id]: v }))} />
                      </div>
                      <div className="font-hand mt-3 rounded-xl bg-[#FAFAF7] px-3 py-2 text-[14.5px]">{r.example}</div>
                      <div className="text-ink-3 mt-2 text-[12px]">最近 5 场会命中 {hits(r.id)} 次</div>
                    </div>
                  ))}
                </div>
              </Section>
              <div className="grid gap-6 lg:grid-cols-2">
                <Section title="权限闸：能看到什么" sub="相关不等于可见；受限内容按名单显示">
                  <div className="overflow-hidden rounded-2xl border bg-white">
                    {(Object.keys(SENSITIVITY) as Sensitivity[]).map(s => (
                      <div key={s} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                        <span className={cn('w-12 flex-none rounded-md px-1.5 py-0.5 text-center text-[12px] font-medium', s === 'public' ? 'bg-emerald-50 text-emerald-700' : s === 'internal' ? 'bg-muted text-ink-2' : s === 'restricted' ? 'bg-rose-50 text-rose-700' : 'bg-ink text-white')}>{SENSITIVITY[s].label}</span>
                        <span className="text-ink-2 text-[13px]">{SENSITIVITY[s].desc}</span>
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="人在回路" sub="什么时候可以不问主持人直接发">
                  <div className="flex flex-col gap-2 rounded-2xl border bg-white p-4 text-[13.5px]">
                    <label className="flex items-start gap-3"><input type="radio" className="mt-1" checked={!auto} onChange={() => setAuto(false)} /><span><b>每次发送前给我看矩阵</b><br /><span className="text-ink-3">演示默认。投递官会停下来等你点“确认发送”。</span></span></label>
                    <label className="flex items-start gap-3"><input type="radio" className="mt-1" checked={auto} onChange={() => setAuto(true)} /><span><b>低敏感 + 高置信时自动发</b><br /><span className="text-ink-3">含受限条目、缺负责人或置信低于 0.8 时仍然会停下来。</span></span></label>
                    <div className="text-ink-3 mt-1 border-t pt-2 text-[12px]">不可逆、对外的动作（发外部邮件、删数据）一律不做。</div>
                  </div>
                </Section>
              </div>
            </div>
          )}

          {tab === 'briefs' && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {BRIEF_TPL.map(b => (
                <div key={b.name} className="kb-tile kb-wiggle flex flex-col rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-3"><span className="text-ink-2"><Kb name={b.icon} size={32} /></span><div><b className="text-[15px]">{b.name}</b><div className="text-ink-3 text-[12.5px]">给 {b.for}</div></div></div>
                  <ul className="text-ink-2 mt-3 list-disc pl-5 text-[13px] leading-6">{b.points.map(p => <li key={p}>{p}</li>)}</ul>
                  <div className="font-hand mt-auto rounded-xl bg-[#FFF8D6] px-3 py-2.5 text-[14.5px] leading-relaxed shadow-[0_6px_14px_-10px_rgba(0,0,0,.3)]" style={{ rotate: '-0.6deg' }}>“{b.sample}”</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'meetings' && (
            <div className="grid gap-4 md:grid-cols-2">
              {MEETING_TPL.map(t => (
                <div key={t.name} className="kb-tile kb-wiggle rounded-2xl border bg-white p-5">
                  <div className="flex items-center gap-3"><span className="text-ink-2"><Kb name={t.icon} size={36} /></span><b className="text-[16px]">{t.name}</b></div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px]">
                    <span className="text-ink-3">重点抽取</span>
                    {t.focus.map(f => <span key={f} className="type-pill" style={{ '--c': ITEM_TYPES[f].color, '--soft': ITEM_TYPES[f].soft } as React.CSSProperties}>{ITEM_TYPES[f].label}</span>)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px]">
                    <span className="text-ink-3">默认规则</span>
                    {t.rules.map(r => <span key={r} className="bg-muted rounded-full px-2 py-0.5">{r} {REASONS[r]}</span>)}
                  </div>
                  <p className="text-ink-2 mt-3 text-[13px]">{t.note}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'profiles' && (
            <Section title="关注档案" sub="路由官靠它判断“和谁有关”。每个人可以自己改订阅">
              <div className="overflow-hidden rounded-2xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-4">人</TableHead><TableHead>负责</TableHead><TableHead>依赖</TableHead><TableHead>订阅</TableHead><TableHead>权限</TableHead><TableHead className="pr-4">渠道</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PEOPLE.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="pl-4"><span className="flex items-center gap-2"><Face p={p} size={26} /><span className="leading-tight"><b className="block font-medium">{p.name}</b><span className="text-ink-3 text-xs">{p.role} · {p.team}</span></span></span></TableCell>
                        <TableCell><Tags list={p.profile.owns} /></TableCell>
                        <TableCell><Tags list={p.profile.dependsOn} tone="r4" /></TableCell>
                        <TableCell><Tags list={p.profile.interests} /></TableCell>
                        <TableCell><span className={cn('rounded-md px-1.5 py-0.5 text-xs', p.profile.clearance === 'internal' ? 'bg-muted' : 'bg-rose-50 text-rose-700')}>{SENSITIVITY[p.profile.clearance].label}</span></TableCell>
                        <TableCell className="text-ink-2 pr-4 text-xs">{p.profile.channels.join(' · ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">{title}</h2>{sub && <span className="text-ink-3 text-[12.5px]">{sub}</span>}</div>
      {children}
    </section>
  )
}

function Tags({ list, tone }: { list: string[]; tone?: 'r4' }) {
  if (!list.length) return <span className="text-ink-4">—</span>
  return <span className="flex flex-wrap gap-1">{list.map(x => <span key={x} className={cn('rounded-full px-2 py-0.5 text-xs', tone ? 'bg-rose-50 text-rose-700' : 'bg-muted text-ink-2')}>{x}</span>)}</span>
}
