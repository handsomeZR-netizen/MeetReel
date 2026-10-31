// 模板中心：一类会议开完之后，会映怎么分发 —— ① 抽什么 → ② 发给谁 → ③ 每个人收到什么样的简报。
// 样例全部取自真实的几场会（小米直播、安全周会……）；另一页是组织与角色：职级、部门、项目 Leader、关注档案。
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, BellOff, Crown, ShieldCheck } from 'lucide-react'
import { ITEM_TYPES, PROJECTS, RANKS, REASONS, SENSITIVITY, STAFF, PEOPLE, personById, type ItemType, type PersonId, type Rank, type Sensitivity } from '@/data/model'
import { MEETINGS, meetingById } from '@/data/meetings'
import { briefFor, isQuiet } from '@/data/derive'
import { go } from '@/lib/router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/misc'
import { TopBar } from '@/components/shell/TopBar'
import { Face, FaceStack, Kb, LeaderTag, RankTag } from '@/components/common/bits'
import { Sticky } from '@/components/sketch/Briefs'
import type { KoboyoName } from '@/components/sketch/koboyoData'

type Tab = 'tpl' | 'org'
type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'

interface Tpl {
  id: string
  name: string
  icon: KoboyoName
  desc: string
  meetings: string[]
  focus: ItemType[]
  checks: string[]
  rules: Record<RuleId, boolean>
  note: string
}

const TPLS: Tpl[] = [
  {
    id: 'live', name: '竞品发布会 / 直播', icon: 'megaphone', meetings: ['xm_safety'],
    desc: '发言人是外部的人：只引用原话，不派任务',
    focus: ['decision', 'info', 'risk', 'question'],
    checks: ['原话逐字校验', '说话人核对', '绝对化表述标“待核实”', '本段没讲到的标“未覆盖”'],
    rules: { R1: false, R2: false, R3: true, R4: true, R5: true, R6: true },
    note: '直播里不会点到我们任何人的名，所以点名、角色两条关掉也不影响；靠“负责的东西被提到”“订阅”“管理者规则”来判断。',
  },
  {
    id: 'weekly', name: '周会', icon: 'calendar', meetings: ['sf_weekly', 'retail_weekly'],
    desc: '只推待办和没答完的问题，其余进日报',
    focus: ['action', 'question', 'risk'],
    checks: ['缺负责人', '缺截止时间', '预算、编制类默认受限'],
    rules: { R1: true, R2: true, R3: true, R4: true, R5: false, R6: true },
    note: '被点名的人一定收到；高管只看风险和决议；同组成员的待办抄送给组长。',
  },
  {
    id: 'monthly', name: '月会 / 复盘', icon: 'notebook', meetings: ['own_monthly'],
    desc: '保留数据和结论，决议自动进知识库',
    focus: ['decision', 'info', 'risk', 'action'],
    checks: ['数字必须能在原话里找到', '缺截止时间'],
    rules: { R1: true, R2: false, R3: true, R4: true, R5: true, R6: true },
    note: '方案类待办（例如积分方案给韩总）同时推给执行人和审批人。',
  },
  {
    id: 'review', name: '评审会', icon: 'magnifyingGlass', meetings: [],
    desc: '重点抓变更和影响链，发送前一定给发布者看矩阵',
    focus: ['decision', 'change', 'action', 'risk'],
    checks: ['变更必须写清“从什么改成什么”', '缺负责人', '影响链（R4）必查'],
    rules: { R1: true, R2: true, R3: true, R4: true, R5: true, R6: true },
    note: '还没有用这个模板的会。',
  },
]

const RULE_DESC: Record<RuleId, string> = {
  R1: '发言里直接叫到名字，或者“我来”“我负责”',
  R2: '提到某个角色或部门，按关注档案找到对应的人',
  R3: '条目里的事，在某人的档案里写着“负责”',
  R4: '某人依赖的东西变了：没参会、没被点名，也该知道',
  R5: '订阅了某个话题，有变化就收到',
  R6: '高管看所有决议、风险、投入规模和待签批',
}

const BRIEF_RANKS: Rank[] = ['exec', 'head', 'lead', 'staff']

export function Templates() {
  const [tab, setTab] = useState<Tab>('tpl')
  return (
    <>
      <TopBar crumbs={[{ label: '模板中心' }]} />
      <div className="flex-none border-b px-6 pt-4">
        <h1 className="text-[20px] font-semibold tracking-tight">模板中心</h1>
        <p className="text-ink-3 mt-0.5 text-[13px]">一类会议开完之后，会映按模板做三件事：<b className="text-ink-2 font-medium">抽什么</b> → <b className="text-ink-2 font-medium">发给谁</b> → <b className="text-ink-2 font-medium">每个人收到什么样的简报</b>。改这里，下一场同类会议就按新的来。</p>
        <div className="mt-2 flex gap-1">
          {([['tpl', '会议模板'], ['org', '组织与角色']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('relative px-3 pt-2 pb-2.5 text-[13.5px]', tab === k ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink')}>
              {l}{tab === k && <motion.span layoutId="tpl-tab" className="bg-ink absolute inset-x-2 -bottom-px h-[2px] rounded-full" />}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-6 py-6">
          {tab === 'tpl' ? <TemplateView /> : <OrgView />}
        </div>
      </div>
    </>
  )
}

// ---------------- 会议模板 ----------------

function TemplateView() {
  const [cur, setCur] = useState(TPLS[0].id)
  const [rules, setRules] = useState<Record<string, Record<RuleId, boolean>>>(Object.fromEntries(TPLS.map(t => [t.id, t.rules])))
  const [focus, setFocus] = useState<Record<string, ItemType[]>>(Object.fromEntries(TPLS.map(t => [t.id, t.focus])))
  const [review, setReview] = useState(true)
  const t = TPLS.find(x => x.id === cur)!
  const ms = t.meetings.map(id => meetingById(id)!)
  const routes = ms.flatMap(m => m.routes.map(r => ({ ...r, m })))

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <div className="text-ink-3 px-1 text-[12.5px]">选一类会议</div>
        {TPLS.map(x => (
          <button key={x.id} onClick={() => setCur(x.id)} className={cn('kb-tile flex items-start gap-3 rounded-2xl border bg-white p-3 text-left', cur === x.id && 'border-ink shadow-[0_8px_24px_-16px_rgba(0,0,0,.4)]')}>
            <span className="text-ink-2 flex-none"><Kb name={x.icon} size={30} /></span>
            <span className="min-w-0">
              <b className="block text-[14px]">{x.name}</b>
              <span className="text-ink-3 block text-[12px] leading-snug">{x.desc}</span>
              <span className="text-ink-3 mt-1 block text-[11.5px]">{x.meetings.length ? `用在 ${x.meetings.length} 场会：${x.meetings.map(id => meetingById(id)!.title.replace(/ · .*/, '')).join('、')}` : '还没用过'}</span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={cur} className="flex min-w-0 flex-col gap-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <Step n={1} title="抽什么" sub="抽取官从逐字稿里抽这些类型的条目，审核官按右边的规则检查">
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ITEM_TYPES) as ItemType[]).map(k => {
                  const on = focus[cur].includes(k)
                  return (
                    <button key={k} onClick={() => setFocus(s => ({ ...s, [cur]: on ? s[cur].filter(x => x !== k) : [...s[cur], k] }))} className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] transition-colors', on ? 'border-ink bg-white' : 'text-ink-3 border-dashed')}>
                      <i className="size-2 rounded-full" style={{ background: on ? ITEM_TYPES[k].color : '#D4D4D8' }} />{ITEM_TYPES[k].label}
                    </button>
                  )
                })}
              </div>
              <ul className="text-ink-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                {t.checks.map(c => <li key={c} className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-600" />{c}</li>)}
              </ul>
            </div>
          </Step>

          <Step n={2} title="发给谁" sub="路由官依次判断，命中任一条就推送，并把理由写进简报">
            <div className="grid gap-2 md:grid-cols-2">
              {(Object.keys(RULE_DESC) as RuleId[]).map(r => {
                const on = rules[cur][r]
                const ex = routes.find(x => x.reasons.includes(r))
                return (
                  <div key={r} className={cn('flex items-start gap-3 rounded-xl border bg-white px-3 py-2.5 transition-opacity', !on && 'opacity-50')}>
                    <span className="text-ink-3 mt-0.5 w-6 flex-none font-mono text-[12px]">{r}</span>
                    <div className="min-w-0 flex-1">
                      <b className="text-[13.5px]">{REASONS[r]}</b>
                      <p className="text-ink-3 text-[12px] leading-snug">{RULE_DESC[r]}</p>
                      {ex && <p className="font-hand mt-1 truncate text-[14px]" title={`${ex.m.title}`}>例：{ex.m.items.find(i => i.id === ex.item)!.title.slice(0, 18)} → {personById(ex.person).name}</p>}
                    </div>
                    <Switch checked={on} onCheckedChange={v => setRules(s => ({ ...s, [cur]: { ...s[cur], [r]: v } }))} />
                  </div>
                )
              })}
            </div>
            <p className="text-ink-2 mt-2 rounded-xl bg-[#FAFAF7] px-3 py-2 text-[12.5px] leading-relaxed">{t.note}</p>
          </Step>

          <Step n={3} title="每个人收到什么" sub="编辑官按职级改写：同一场会，高管和成员拿到的不是同一份">
            {ms.length ? (
              <div className="sk-board rounded-2xl px-3 pb-2">
                <div className="sk-stickies">
                  {BRIEF_RANKS.map((r, i) => {
                    const hit = samplePerson(ms.map(m => m.id), r)
                    return (
                      <Sticky key={r} i={i} title={`${RANKS[r].level} ${RANKS[r].label}`} sub={hit ? personById(hit.pid).name : undefined} count={hit ? hit.n : '—'} quiet={!hit} foot={RANKS[r].brief}>
                        <p>{hit ? hit.headline : '这类会议里还没有这个职级的收到者。'}</p>
                      </Sticky>
                    )
                  })}
                  {quietSample(ms.map(m => m.id)) && (
                    <Sticky i={7} quiet title="不打扰" sub={personById(quietSample(ms.map(m => m.id))!.pid).name} count={<BellOff size={18} />} foot="只进日报">
                      <p>{quietSample(ms.map(m => m.id))!.headline}</p>
                    </Sticky>
                  )}
                </div>
              </div>
            ) : <div className="text-ink-3 rounded-xl border border-dashed px-4 py-5 text-[13px]">用这个模板开一场会之后，这里会出现每个职级收到的样例。</div>}
          </Step>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3">
            <label className="flex items-center gap-2.5 text-[13px]"><Switch checked={review} onCheckedChange={setReview} /><span><b className="font-medium">发送前给发布者看矩阵</b><span className="text-ink-3 ml-2">关掉后：低敏感、高置信的直接发；含受限条目或待核实的仍会停下来</span></span></label>
            <span className="text-ink-3 ml-auto flex flex-wrap items-center gap-1.5 text-[12px]">权限
              {(Object.keys(SENSITIVITY) as Sensitivity[]).map(s => <span key={s} className={cn('rounded-md px-1.5 py-0.5', s === 'public' ? 'bg-emerald-50 text-emerald-700' : s === 'internal' ? 'bg-muted text-ink-2' : s === 'restricted' ? 'bg-rose-50 text-rose-700' : 'bg-ink text-white')} title={SENSITIVITY[s].desc}>{SENSITIVITY[s].label}</span>)}
            </span>
            <Button size="sm" onClick={() => go('/new')}>用这个模板新建会映 <ArrowRight /></Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Step({ n, title, sub, children }: { n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="bg-ink grid size-6 flex-none translate-y-[3px] place-items-center rounded-full text-[12px] font-semibold text-white">{n}</span>
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <span className="text-ink-3 text-[12.5px]">{sub}</span>
      </div>
      {children}
    </section>
  )
}

/** 这类会议里某个职级的一位收到者和 TA 那份简报的标题 */
function samplePerson(ids: string[], rank: Rank) {
  for (const id of ids) {
    const m = meetingById(id)!
    const pid = m.related.find(p => personById(p).rank === rank && p !== m.publisher && !isQuiet(id, p))
    if (pid) {
      const b = briefFor(id, pid)
      return { pid, headline: b.headline, n: b.entries.length }
    }
  }
  return null
}

function quietSample(ids: string[]) {
  for (const id of ids) {
    const m = meetingById(id)!
    const pid = m.related.find(p => isQuiet(id, p))
    if (pid) return { pid, headline: briefFor(id, pid).headline }
  }
  return null
}

// ---------------- 组织与角色 ----------------

const DEPTS: { name: string; people: PersonId[] }[] = [
  { name: '安全部', people: ['songlan', 'weiran', 'xunuo', 'tangchuan'] },
  { name: '市场部', people: ['jiangwan', 'linxia'] },
  { name: '用户运营部', people: ['chengcheng'] },
  { name: '交付中心', people: ['gaoyuan'] },
  { name: '销售部', people: ['dengkai'] },
]

function OrgView() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="text-[16px] font-semibold">组织</h2>
          <span className="text-ink-3 text-[12.5px]">职级决定简报的写法；关注档案（负责 / 依赖 / 订阅）决定发不发</span>
          <span className="ml-auto flex flex-wrap gap-1.5">{(['exec', 'head', 'lead', 'staff', 'guest'] as Rank[]).map(r => <span key={r} className="rounded-md px-1.5 text-[11.5px] leading-5" style={{ color: RANKS[r].color, background: RANKS[r].soft }}>{RANKS[r].level === '外部' ? '' : `${RANKS[r].level} `}{RANKS[r].label}</span>)}</span>
        </div>
        <div className="flex justify-center"><PersonCard pid="hanzong" wide /></div>
        <div className="mx-auto h-5 w-px bg-[#D4D4D8]" />
        <div className="relative grid gap-3 border-t border-[#D4D4D8] pt-5 sm:grid-cols-2 xl:grid-cols-5">
          {DEPTS.map(d => (
            <div key={d.name} className="flex flex-col gap-2">
              <div className="text-ink-3 text-center text-[12.5px] font-medium">{d.name}</div>
              {d.people.map(pid => <PersonCard key={pid} pid={pid} indent={!!personById(pid).reportsTo && personById(pid).reportsTo !== 'hanzong'} />)}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">项目组</h2><span className="text-ink-3 text-[12.5px]">项目 Leader 默认是这个项目里会议的发布者</span></div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          {PROJECTS.map(p => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 border-b px-4 py-3 last:border-0">
              <span className="flex w-[180px] items-center gap-2" style={{ color: p.color }}><Kb name={p.icon} size={24} /><b className="text-ink text-[14px]">{p.name}</b></span>
              <span className="flex items-center gap-2 text-[13px]"><Crown size={14} className="text-amber-600" /><Face p={p.leader} size={24} /><b className="font-medium">{personById(p.leader).name}</b><RankTag p={p.leader} /></span>
              <span className="text-ink-3 ml-auto flex items-center gap-2 text-[12.5px]">{p.members.length} 位成员<FaceStack ids={p.members.filter(x => x !== p.leader)} size={22} max={8} /></span>
              <span className="text-ink-3 w-full text-[12px] sm:w-auto">{MEETINGS.filter(m => m.project === p.id).length} 场会</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">外部发言人</h2><span className="text-ink-3 text-[12.5px]">发布会、直播里的人：只引用原话，不推送、不派任务，身份只记录直播里自己说的或被介绍的</span></div>
        <div className="flex flex-wrap gap-2">
          {PEOPLE.filter(x => x.external).map(x => (
            <span key={x.id} className="flex items-center gap-2 rounded-xl border border-dashed bg-white px-3 py-2 text-[13px]"><Face p={x} size={26} /><b className="font-medium">{x.name}</b><span className="text-ink-3 text-[12px]">{x.role}</span></span>
          ))}
        </div>
      </section>
      <p className="text-ink-3 text-[12px]">共 {STAFF.length} 位同事。每个人可以在自己的简报里改订阅，改动会回到这里。</p>
    </div>
  )
}

function PersonCard({ pid, wide, indent }: { pid: PersonId; wide?: boolean; indent?: boolean }) {
  const p = personById(pid)
  return (
    <div className={cn('rounded-2xl border bg-white p-3', wide && 'w-full max-w-[420px]', indent && 'ml-3 border-l-[3px]')} style={indent ? { borderLeftColor: RANKS[p.rank].soft } : undefined}>
      <div className="flex items-start gap-2.5">
        <Face p={p} size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex flex-wrap items-center gap-1.5"><b className="text-[14px]">{p.name}</b><RankTag p={p} /></div>
          <div className="text-ink-3 mt-0.5 truncate text-[12px]">{p.group ? `${p.group} · ` : ''}{p.role}</div>
          {p.reportsTo && p.reportsTo !== 'hanzong' && <div className="text-ink-3 mt-0.5 text-[11.5px]">汇报给 {personById(p.reportsTo).name}</div>}
        </div>
      </div>
      <LeaderTag pid={pid} className="mt-2" />
      <div className="mt-2 flex flex-wrap gap-1 text-[11.5px]">
        {p.profile.owns.slice(0, 3).map(x => <span key={x} className="bg-muted text-ink-2 rounded-full px-2 py-px">负责 {x}</span>)}
        {p.profile.dependsOn.slice(0, 2).map(x => <span key={x} className="rounded-full bg-rose-50 px-2 py-px text-rose-700">依赖 {x}</span>)}
        {p.profile.interests.slice(0, 2).map(x => <span key={x} className="rounded-full bg-[#EEF3FF] px-2 py-px text-[#2F64F2]">订阅 {x}</span>)}
      </div>
    </div>
  )
}
