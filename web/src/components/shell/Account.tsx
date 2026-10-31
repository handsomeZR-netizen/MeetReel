// 账号：侧栏底部的个人菜单 → 个人中心（个人信息 / 我的画像 / 通知与偏好）→ 退出登录。
// 个人中心沿用飞书简报卡的样式（蓝色卡头），和收到者看到的简报是同一套视觉。
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog, Popover } from 'radix-ui'
import { Bell, ChevronRight, LogOut, Plus, RotateCcw, ScanFace, Settings2, UserRound, X } from 'lucide-react'
import { ME, MODELS, PROJECTS, RANKS, REASONS, SENSITIVITY, STAFF, personById } from '@/data/model'
import { inboxOf } from '@/data/derive'
import { usedModels } from '@/data/run'
import { actions, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/misc'
import { Face, LeaderTag, ModelIcon, RankTag } from '@/components/common/bits'

type Tab = 'info' | 'profile' | 'prefs'

// ---------------- 侧栏底部：头像 + 弹出菜单 ----------------

export function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false)
  const [center, setCenter] = useState<Tab | null>(null)
  const interests = useStore(s => s.interests)
  const channels = useStore(s => s.channels)
  const me = personById(ME)
  const r = RANKS[me.rank]
  const go = (t: Tab) => { setOpen(false); setCenter(t) }
  const owns = me.profile.owns.length + interests.length

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button className={cn('flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-black/[.035] data-[state=open]:bg-black/[.045]', collapsed && 'justify-center p-1.5')}>
            <span className="relative flex-none">
              <Face p={me} size={44} className="!rounded-xl" />
              <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#F3F5F9] bg-emerald-500" title="在线" />
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block text-[15px] font-semibold">{me.name}</b>
                <span className="text-ink-3 text-[12.5px]">{me.team} · {r.level} {r.label}</span>
              </span>
            )}
            {!collapsed && <Settings2 size={16} className="text-ink-3 flex-none" />}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top" align="start" sideOffset={8} collisionPadding={10}
            className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 z-50 w-[296px] overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(16,24,40,.08),0_18px_48px_-12px_rgba(16,24,40,.28)] outline-none"
          >
            <div className="fs-head !items-center !py-2.5"><span className="!text-[13px]">会映 · 个人中心</span><small>{me.team}</small></div>
            <button className="flex w-full items-center gap-3 px-4 pt-3.5 pb-3 text-left hover:bg-[#F7F8FA]" onClick={() => go('info')}>
              <Face p={me} size={44} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-center gap-1.5"><b className="text-[16px]">{me.name}</b><RankTag p={me} /></span>
                <span className="text-ink-3 mt-1 block truncate text-[12.5px]">{me.role}{me.group ? ` · ${me.group}` : ''}</span>
              </span>
              <ChevronRight size={16} className="text-ink-4" />
            </button>
            <div className="mx-4 mb-2 flex flex-wrap gap-1"><LeaderTag pid={ME} /><span className="text-ink-2 rounded-md bg-[#F2F3F5] px-1.5 text-[11px] leading-[18px]">可见 · {SENSITIVITY[me.profile.clearance].label}</span></div>
            <div className="border-t p-1.5">
              <MenuRow icon={<UserRound size={16} />} label="个人信息" onClick={() => go('info')} />
              <MenuRow icon={<ScanFace size={16} />} label="我的画像" meta={`${owns} 个关注点`} onClick={() => go('profile')} />
              <MenuRow icon={<Bell size={16} />} label="通知与偏好" meta={Object.keys(channels).filter(k => channels[k]).join(' · ')} onClick={() => go('prefs')} />
            </div>
            <div className="border-t p-1.5">
              <MenuRow icon={<RotateCcw size={16} />} label="重置演示数据" onClick={() => { actions.reset(); setOpen(false); location.hash = '#/' }} />
              <MenuRow icon={<LogOut size={16} />} label="退出登录" danger onClick={() => { setOpen(false); actions.signOut() }} />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <ProfileCenter tab={center} onTab={setCenter} />
    </>
  )
}

function MenuRow({ icon, label, meta, danger, onClick }: { icon: ReactNode; label: string; meta?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] transition-colors', danger ? 'text-rose-600 hover:bg-rose-50' : 'hover:bg-[#F2F3F5]')} onClick={onClick}>
      <span className={danger ? '' : 'text-ink-2'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {meta && <span className="text-ink-3 max-w-[120px] truncate text-[11.5px]">{meta}</span>}
    </button>
  )
}

// ---------------- 个人中心 ----------------

const TABS: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'info', label: '个人信息', icon: UserRound },
  { id: 'profile', label: '我的画像', icon: ScanFace },
  { id: 'prefs', label: '通知与偏好', icon: Bell },
]

function ProfileCenter({ tab, onTab }: { tab: Tab | null; onTab: (t: Tab | null) => void }) {
  const me = personById(ME)
  return (
    <Dialog.Root open={tab != null} onOpenChange={o => !o && onTab(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[#0F172A]/30 backdrop-blur-[2px]" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fs fixed top-[7vh] left-1/2 z-50 flex max-h-[86vh] w-[min(760px,94vw)] -translate-x-1/2 flex-col outline-none">
          <div className="fs-head !items-center">
            <Dialog.Title asChild><span>会映 · 个人中心</span></Dialog.Title>
            <span className="flex items-center gap-3">
              <small>{me.team} · {me.group}</small>
              <Dialog.Close className="grid size-6 place-items-center rounded-md text-white/85 hover:bg-white/15 hover:text-white" aria-label="关闭"><X size={15} /></Dialog.Close>
            </span>
          </div>
          <Dialog.Description className="sr-only">个人信息、关注画像和通知偏好</Dialog.Description>
          <div className="flex items-center gap-3.5 px-6 pt-5 pb-4">
            <Face p={me} size={56} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex flex-wrap items-center gap-1.5"><b className="text-[20px] tracking-tight">{me.name}</b><RankTag p={me} /><LeaderTag pid={ME} /></div>
              <div className="mt-1 text-[13px] text-[#646A73]">{me.role} · 汇报给 {me.reportsTo ? personById(me.reportsTo).name : '—'} · 飞书已绑定</div>
            </div>
          </div>
          <div className="flex gap-1 border-b px-5">
            {TABS.map(t => {
              const I = t.icon
              const on = tab === t.id
              return (
                <button key={t.id} onClick={() => onTab(t.id)} className={cn('relative flex h-10 items-center gap-1.5 px-2.5 text-[13.5px] transition-colors', on ? 'font-semibold text-[#1F2329]' : 'text-[#8F959E] hover:text-[#1F2329]')}>
                  <I size={15} className={on ? 'text-[#3370FF]' : ''} />{t.label}
                  {on && <motion.span layoutId="pc-tab" className="absolute inset-x-1.5 -bottom-px h-[2.5px] rounded-full bg-[#3370FF]" />}
                </button>
              )
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
                {tab === 'info' && <InfoTab />}
                {tab === 'profile' && <PortraitTab />}
                {tab === 'prefs' && <PrefsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3 border-t px-6 py-3">
            <span className="text-[12px] text-[#8F959E]">资料来自飞书通讯录；画像由路由官维护，你的确认和退回会让它更准。</span>
            <button className="ml-auto inline-flex h-8 flex-none items-center gap-1.5 rounded-md border border-[#FECDD3] px-3 text-[13px] text-rose-600 hover:bg-rose-50" onClick={() => { onTab(null); actions.signOut() }}>
              <LogOut size={14} /> 退出登录
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 border-b border-[#EFF0F1] py-3 last:border-0">
      <span className="text-[13px] text-[#8F959E]">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13.5px] text-[#1F2329]">{children}</div>
    </div>
  )
}

function InfoTab() {
  const me = personById(ME)
  const team = STAFF.filter(x => x.reportsTo === ME)
  const projects = PROJECTS.filter(p => p.members.includes(ME))
  const boss = me.reportsTo ? personById(me.reportsTo) : null
  return (
    <div>
      <Row label="姓名">{me.name}<span className="text-[#8F959E]">· 别名 {me.profile.aliases.join('、')}</span></Row>
      <Row label="部门">{me.team}{me.group ? ` / ${me.group}` : ''}</Row>
      <Row label="职务">{me.role}</Row>
      <Row label="职级"><RankTag p={me} /><span className="text-[12.5px] text-[#646A73]">简报默认写成：{RANKS[me.rank].brief}</span></Row>
      <Row label="汇报给">{boss ? <span className="inline-flex items-center gap-1.5"><Face p={boss} size={22} />{boss.name}<span className="text-[#8F959E]">· {boss.role}</span></span> : '—'}</Row>
      <Row label="组员">
        {team.map(x => <span key={x.id} className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5"><Face p={x} size={22} />{x.name}<RankTag p={x} short /></span>)}
      </Row>
      <Row label="参与项目">
        {projects.map(p => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12.5px] font-medium" style={{ color: p.color, background: p.soft }}>
            <span className="size-1.5 rounded-full" style={{ background: p.color }} />{p.name}{p.leader === ME && ' · Leader'}
          </span>
        ))}
      </Row>
      <Row label="可见范围"><b className="font-medium">{SENSITIVITY[me.profile.clearance].label}</b><span className="text-[12.5px] text-[#646A73]">{SENSITIVITY[me.profile.clearance].desc}</span></Row>
    </div>
  )
}

/** 画像：路由官判断“这条和你有没有关系”用的就是这几组词，每组对应一条推送理由 */
function PortraitTab() {
  const me = personById(ME)
  const interests = useStore(s => s.interests)
  const dispatched = useStore(s => s.dispatched)
  const confirmed = useStore(s => s.confirmed)
  const [draft, setDraft] = useState('')
  const inbox = inboxOf(ME, id => !!dispatched[id])
  const stats = [
    { v: inbox.length, l: '份简报发给我' },
    { v: inbox.reduce((n, x) => n + x.brief.entries.length, 0), l: '条和我有关' },
    { v: Object.values(confirmed).filter(p => p === ME).length, l: '条我确认负责' },
  ]
  const groups: { r: string; title: string; words: string[]; edit?: boolean }[] = [
    { r: 'R3', title: '我负责的', words: me.profile.owns },
    { r: 'R5', title: '我订阅的话题', words: interests, edit: true },
    { r: 'R4', title: '我依赖的', words: me.profile.dependsOn },
    { r: 'R2', title: '别人这样叫我', words: me.profile.aliases },
  ]
  const add = () => {
    const v = draft.trim()
    if (v && !interests.includes(v)) actions.toggleInterest(v)
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {stats.map(s => (
          <div key={s.l} className="rounded-xl bg-[#F5F6F7] px-3.5 py-2.5">
            <b className="block text-[22px] leading-tight tabular-nums">{s.v}</b>
            <span className="text-[12px] text-[#646A73]">{s.l}</span>
          </div>
        ))}
      </div>
      <p className="text-[13px] leading-relaxed text-[#646A73]">会议里一说到下面这些词，路由官就会考虑发给你，并在简报里写明“为什么发给你”。没说到的，不打扰。</p>
      {groups.map(g => (
        <div key={g.r} className="rounded-xl border border-[#E8E9EB] p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <b className="text-[13.5px]">{g.title}</b>
            <span className="rounded-full bg-[#F2F3F5] px-2 text-[11.5px] leading-5 text-[#646A73]">{g.r} · {REASONS[g.r]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {g.words.length ? g.words.map(w => (
              <span key={w} className={cn('inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[13px]', g.r === 'R3' ? 'bg-[#EEF3FF] text-[#2F55D4]' : 'bg-[#F5F6F7] text-[#1F2329]')}>
                {w}
                {g.edit && <button className="-mr-1 grid size-4 place-items-center rounded text-[#8F959E] hover:bg-black/5 hover:text-[#1F2329]" onClick={() => actions.toggleInterest(w)} aria-label={`取消订阅 ${w}`}><X size={11} /></button>}
              </span>
            )) : <span className="text-[12.5px] text-[#8F959E]">暂无</span>}
            {g.edit && (
              <span className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-[#D0D3D6] pr-1 pl-2">
                <Plus size={12} className="text-[#8F959E]" />
                <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="加一个话题，回车" className="w-[110px] bg-transparent text-[12.5px] outline-none placeholder:text-[#B3B3BA]" />
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PrefsTab() {
  const channels = useStore(s => s.channels)
  const models = useStore(s => s.models)
  const [quiet, setQuiet] = useState(true)
  const [digest, setDigest] = useState(true)
  const used = usedModels(models)
  return (
    <div>
      <div className="mb-1 text-[13px] font-semibold">推送渠道</div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {Object.keys(channels).map(c => (
          <label key={c} className="flex h-11 cursor-pointer items-center justify-between rounded-xl border border-[#E8E9EB] px-3.5 text-[13.5px]">
            {c}<Switch checked={channels[c]} onCheckedChange={() => actions.toggleChannel(c)} />
          </label>
        ))}
      </div>
      <Row label="免打扰"><label className="flex items-center gap-2"><Switch checked={quiet} onCheckedChange={setQuiet} />没有必读内容的会，不单独推送</label></Row>
      <Row label="待办提醒"><label className="flex items-center gap-2"><Switch checked={digest} onCheckedChange={setDigest} />截止前一天早上 9 点在飞书提醒</label></Row>
      <Row label="默认模型">
        <span className="inline-flex items-center gap-1">{used.map(id => <ModelIcon key={id} icon={id} size={16} />)}</span>
        {used.length > 1 ? `多模型协同 · ${used.length} 个` : MODELS.find(m => m.id === used[0])?.label}
        <span className="text-[12.5px] text-[#8F959E]">在新建会映的输入框里切换</span>
      </Row>
      <Row label="简报语言">简体中文<span className="text-[12.5px] text-[#8F959E]">原话保留原文</span></Row>
    </div>
  )
}

// ---------------- 退出后的登录页 ----------------

export function SignedOut({ logo }: { logo?: string }) {
  const me = personById(ME)
  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-[#F3F5F9]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="fs w-[min(400px,92vw)]" initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <div className="fs-head"><span>会映 · 登录</span><small>企业飞书账号</small></div>
        <div className="flex flex-col items-center px-8 pt-7 pb-8 text-center">
          {logo ? <img src={logo} alt="会映 MeetReel" className="h-14 w-auto" draggable={false} /> : <b className="text-[22px]">会映 MeetReel</b>}
          <p className="mt-3 text-[14px] text-[#646A73]">你已退出。每场会，按人发到对的人手里。</p>
          <button className="mt-6 flex w-full items-center gap-3 rounded-xl border border-[#E8E9EB] p-3 text-left transition-colors hover:border-[#3370FF] hover:bg-[#F5F8FF]" onClick={actions.signIn}>
            <Face p={me} size={40} />
            <span className="min-w-0 flex-1 leading-tight"><b className="block text-[15px]">{me.name}</b><span className="text-[12.5px] text-[#8F959E]">{me.team} · {me.role}</span></span>
            <span className="rounded-md bg-[#3370FF] px-3 py-1.5 text-[13px] font-medium text-white">继续登录</span>
          </button>
          <button className="mt-3 text-[13px] text-[#3370FF] hover:underline" onClick={actions.signIn}>使用其他飞书账号</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
