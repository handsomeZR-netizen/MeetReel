// 账号：侧栏底部的个人菜单 → 个人中心（个人信息 / 我的画像 / 通知与偏好）→ 退出登录。
// 弹出菜单和个人中心用同一套实心玻璃：梅子色卡头（右侧淡出一片点阵），下面是磨砂底和凹槽式分段切换。
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog, Popover } from 'radix-ui'
import { ChevronRight, Languages, LogOut, Plus, RotateCcw, Settings2, X } from 'lucide-react'
import { L, isEn, setLang } from '@/lib/i18n'
import { ME, MODELS, PROJECTS, RANKS, REASONS, SENSITIVITY, STAFF, personById } from '@/data/model'
import { inboxOf } from '@/data/derive'
import { usedModels } from '@/data/run'
import { actions, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/misc'
import { Face, Kb, LeaderTag, ModelIcon, RankTag } from '@/components/common/bits'
import type { KoboyoName } from '@/components/sketch/koboyoData'

type Tab = 'info' | 'profile' | 'prefs'

/** 卡头上的职级：深色底上的半透明小胶囊 */
function HeroRank() {
  const r = RANKS[personById(ME).rank]
  return <span className="pc-chip"><b>{r.level}</b>{r.label}</span>
}

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
          <button className={cn('flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-white/60 data-[state=open]:bg-white/75 data-[state=open]:shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgb(95_62_84/7%),0_8px_18px_-12px_rgb(40_24_36/35%)]', collapsed && 'justify-center p-1.5')}>
            <span className="relative flex-none">
              <Face p={me} size={44} className="!rounded-xl" />
              <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#F3F5F9] bg-emerald-500" title={L('在线', 'Online')} />
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
            className="pc-sheet data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 z-50 w-[304px] rounded-[22px] p-1.5 outline-none"
          >
            <button className="pc-hero group flex w-full items-center gap-3 rounded-[17px] p-3.5 text-left" onClick={() => go('info')}>
              <Face p={me} size={46} className="!rounded-[14px] shadow-[0_0_0_2px_rgb(255_255_255/40%)]" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[11px] text-white/60">{L('个人中心', 'Profile')} · {me.team}</span>
                <span className="mt-1 flex items-center gap-1.5"><b className="text-[16px]">{me.name}</b><HeroRank /></span>
                <span className="mt-1 block truncate text-[12px] text-white/70">{me.role}</span>
              </span>
              <ChevronRight size={16} className="text-white/60 transition-transform group-hover:translate-x-0.5" />
            </button>
            <div className="flex flex-wrap gap-1 px-2 pt-2.5 pb-1">
              <LeaderTag pid={ME} />
              <span className="sg-well text-ink-2 rounded-md px-1.5 text-[11px] leading-[18px]">{L('可见', 'Clearance')} · {SENSITIVITY[me.profile.clearance].label}</span>
            </div>
            <div className="p-1">
              <MenuRow kb="notebook" label={L('个人信息', 'Personal info')} onClick={() => go('info')} />
              <MenuRow kb="target" label={L('我的画像', 'My profile')} meta={L(`${owns} 个关注点`, `${owns} interests`)} onClick={() => go('profile')} />
              <MenuRow kb="bell" label={L('通知与偏好', 'Notifications')} meta={Object.keys(channels).filter(k => channels[k]).join(' · ')} onClick={() => go('prefs')} />
              <MenuRow icon={<Languages size={14} />} label={L('语言 · Language', 'Language · 语言')} meta={L('中文 → English', 'English → 中文')} onClick={() => setLang(isEn ? 'zh' : 'en')} />
            </div>
            <div className="mx-2.5 h-px bg-[rgb(95_62_84/8%)]" />
            <div className="p-1">
              <MenuRow icon={<RotateCcw size={14} />} label={L('重置演示数据', 'Reset demo data')} onClick={() => { actions.reset(); setOpen(false); location.hash = '#/' }} />
              <MenuRow icon={<LogOut size={14} />} label={L('退出登录', 'Sign out')} danger onClick={() => { setOpen(false); actions.signOut() }} />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <ProfileCenter tab={center} onTab={setCenter} />
    </>
  )
}

function MenuRow({ kb, icon, label, meta, danger, onClick }: { kb?: KoboyoName; icon?: ReactNode; label: string; meta?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button className={cn('flex h-10 w-full items-center gap-2.5 rounded-xl px-1.5 text-left text-[13.5px] transition-colors', danger ? 'text-rose-600 hover:bg-rose-50/80' : 'hover:bg-white/80')} onClick={onClick}>
      <span className={cn('sg-raised grid size-7 flex-none place-items-center rounded-[9px]', danger ? 'text-rose-500' : 'text-[var(--plum)]')}>{kb ? <Kb name={kb} size={16} /> : icon}</span>
      <span className="flex-1">{label}</span>
      {meta && <span className="text-ink-3 max-w-[120px] truncate text-[11.5px]">{meta}</span>}
    </button>
  )
}

// ---------------- 个人中心 ----------------

const TABS: { id: Tab; label: string; kb: KoboyoName }[] = [
  { id: 'info', label: L('个人信息', 'Info'), kb: 'notebook' },
  { id: 'profile', label: L('我的画像', 'Profile'), kb: 'target' },
  { id: 'prefs', label: L('通知与偏好', 'Notifications'), kb: 'bell' },
]

function ProfileCenter({ tab, onTab }: { tab: Tab | null; onTab: (t: Tab | null) => void }) {
  const me = personById(ME)
  return (
    <Dialog.Root open={tab != null} onOpenChange={o => !o && onTab(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[#2A1B26]/25 backdrop-blur-[3px]" />
        <Dialog.Content className="pc-sheet data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-[6vh] left-1/2 z-50 flex max-h-[88vh] w-[min(760px,94vw)] -translate-x-1/2 flex-col rounded-[28px] p-2 outline-none">
          <div className="pc-hero flex items-center gap-4 rounded-[22px] px-5 py-5">
            <Face p={me} size={60} className="!rounded-[18px] shadow-[0_0_0_3px_rgb(255_255_255/35%)]" />
            <div className="min-w-0 flex-1 leading-tight">
              <Dialog.Title className="text-[11.5px] font-normal text-white/60">{L('会映 · 个人中心', 'MeetReel · Profile')} · {me.team}{me.group ? ` · ${me.group}` : ''}</Dialog.Title>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><b className="text-[22px] tracking-tight">{me.name}</b><HeroRank /><LeaderTag pid={ME} /></div>
              <div className="mt-1.5 text-[13px] text-white/70">{me.role} · {L('汇报给', 'Reports to')} {me.reportsTo ? personById(me.reportsTo).name : '—'} · {L('飞书已绑定', 'Lark connected')}</div>
            </div>
            <Dialog.Close className="grid size-8 flex-none place-items-center self-start rounded-full bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/25%)] transition-colors hover:bg-white/25" aria-label={L('关闭', 'Close')}><X size={15} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{L('个人信息、关注画像和通知偏好', 'Personal info, interest profile and notification preferences')}</Dialog.Description>
          <div className="px-3 pt-3.5">
            <div className="sg-well inline-flex rounded-full p-1">
              {TABS.map(t => {
                const on = tab === t.id
                return (
                  <button key={t.id} onClick={() => onTab(t.id)} className={cn('relative flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors', on ? 'font-medium text-white' : 'text-ink-2 hover:text-ink')}>
                    {on && <motion.span layoutId="pc-tab" className="sg-onyx absolute inset-0 rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                    <Kb name={t.kb} size={15} className="relative" />
                    <span className="relative">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3.5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
                {tab === 'info' && <InfoTab />}
                {tab === 'profile' && <PortraitTab />}
                {tab === 'prefs' && <PrefsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3 px-4 pt-1 pb-2">
            <span className="text-ink-3 text-[12px]">{L('资料来自飞书通讯录；画像由路由官维护，你的确认和退回会让它更准。', 'Details come from the Lark directory; the Router maintains your profile, and every confirm or bounce makes it sharper.')}</span>
            <button className="sg-raised ml-auto inline-flex h-8 flex-none items-center gap-1.5 rounded-full px-3.5 text-[13px] text-rose-600 transition-transform hover:-translate-y-px" onClick={() => { onTab(null); actions.signOut() }}>
              <LogOut size={14} /> {L('退出登录', 'Sign out')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pc-row grid grid-cols-[80px_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[110px_minmax(0,1fr)]">
      <span className="text-ink-3 text-[13px]">{label}</span>
      <div className="text-ink flex min-w-0 flex-wrap items-center gap-1.5 text-[13.5px]">{children}</div>
    </div>
  )
}

function InfoTab() {
  const me = personById(ME)
  const team = STAFF.filter(x => x.reportsTo === ME)
  const projects = PROJECTS.filter(p => p.members.includes(ME))
  const boss = me.reportsTo ? personById(me.reportsTo) : null
  return (
    <div className="sg-card rounded-[20px] px-4">
      <Row label={L('姓名', 'Name')}>{me.name}<span className="text-ink-3">· {L('别名', 'aka')} {me.profile.aliases.join(L('、', ', '))}</span></Row>
      <Row label={L('部门', 'Department')}>{me.team}{me.group ? ` / ${me.group}` : ''}</Row>
      <Row label={L('职务', 'Title')}>{me.role}</Row>
      <Row label={L('职级', 'Level')}><RankTag p={me} /><span className="text-ink-2 text-[12.5px]">{L('简报默认写成：', 'Briefs default to: ')}{RANKS[me.rank].brief}</span></Row>
      <Row label={L('汇报给', 'Reports to')}>{boss ? <span className="inline-flex items-center gap-1.5"><Face p={boss} size={22} />{boss.name}<span className="text-ink-3">· {boss.role}</span></span> : '—'}</Row>
      <Row label={L('组员', 'Team')}>
        {team.map(x => <span key={x.id} className="sg-raised inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5"><Face p={x} size={22} />{x.name}<RankTag p={x} short /></span>)}
      </Row>
      <Row label={L('参与项目', 'Projects')}>
        {projects.map(p => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12.5px] font-medium" style={{ color: p.color, background: p.soft }}>
            <span className="size-1.5 rounded-full" style={{ background: p.color }} />{p.name}{p.leader === ME && ' · Leader'}
          </span>
        ))}
      </Row>
      <Row label={L('可见范围', 'Clearance')}><b className="font-medium">{SENSITIVITY[me.profile.clearance].label}</b><span className="text-ink-2 text-[12.5px]">{SENSITIVITY[me.profile.clearance].desc}</span></Row>
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
    { v: inbox.length, l: L('份简报发给我', 'briefs sent to me') },
    { v: inbox.reduce((n, x) => n + x.brief.entries.length, 0), l: L('条和我有关', 'items for me') },
    { v: Object.values(confirmed).filter(p => p === ME).length, l: L('条我确认负责', 'items I own') },
  ]
  const groups: { r: string; title: string; words: string[]; edit?: boolean }[] = [
    { r: 'R3', title: L('我负责的', 'What I own'), words: me.profile.owns },
    { r: 'R5', title: L('我订阅的话题', 'Topics I follow'), words: interests, edit: true },
    { r: 'R4', title: L('我依赖的', 'What I depend on'), words: me.profile.dependsOn },
    { r: 'R2', title: L('别人这样叫我', 'What people call me'), words: me.profile.aliases },
  ]
  const add = () => {
    const v = draft.trim()
    if (v && !interests.includes(v)) actions.toggleInterest(v)
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-3.5">
      <div className="glass-metrics grid grid-cols-3">
        {stats.map(s => (
          <div key={s.l}>
            <b className="block text-[24px] leading-tight font-semibold tabular-nums">{s.v}</b>
            <span className="text-ink-3 text-[12px]">{s.l}</span>
          </div>
        ))}
      </div>
      <p className="text-ink-2 px-1 text-[13px] leading-relaxed">{L('会议里一说到下面这些词，路由官就会考虑发给你，并在简报里写明“为什么发给你”。没说到的，不打扰。', 'When a meeting touches any of these words, the Router considers sending it to you and says why in your brief. If none come up, you’re not pinged.')}</p>
      {groups.map(g => (
        <div key={g.r} className="sg-card rounded-[18px] p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <b className="text-[13.5px]">{g.title}</b>
            <span className="sg-well text-ink-2 rounded-full px-2 text-[11.5px] leading-5"><b className="font-mono text-[10.5px] font-semibold">{g.r}</b> · {REASONS[g.r]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {g.words.length ? g.words.map(w => (
              <span key={w} className={cn('inline-flex h-7 items-center gap-1 rounded-full px-3 text-[13px]', g.r === 'R3' ? 'sg-onyx' : 'sg-raised text-ink')}>
                {w}
                {g.edit && <button className="text-ink-3 hover:text-ink -mr-1.5 grid size-4 place-items-center rounded-full hover:bg-black/5" onClick={() => actions.toggleInterest(w)} aria-label={L(`取消订阅 ${w}`, `Unfollow ${w}`)}><X size={11} /></button>}
              </span>
            )) : <span className="text-ink-3 text-[12.5px]">{L('暂无', 'None yet')}</span>}
            {g.edit && (
              <span className="sg-well inline-flex h-7 items-center gap-1 rounded-full pr-1 pl-2.5">
                <Plus size={12} className="text-ink-3" />
                <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder={L('加一个话题，回车', 'Add a topic, press Enter')} className="placeholder:text-ink-4 w-[110px] bg-transparent text-[12.5px] outline-none" />
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
    <div className="flex flex-col gap-3.5">
      <div>
        <div className="mb-2 px-1 text-[13px] font-semibold">{L('推送渠道', 'Channels')}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.keys(channels).map(c => (
            <label key={c} className="sg-card flex h-12 cursor-pointer items-center justify-between rounded-2xl px-4 text-[13.5px]">
              {c}<Switch className="sg-switch" checked={channels[c]} onCheckedChange={() => actions.toggleChannel(c)} />
            </label>
          ))}
        </div>
      </div>
      <div className="sg-card rounded-[20px] px-4">
        <Row label={L('免打扰', 'Quiet mode')}><label className="flex items-center gap-2"><Switch className="sg-switch" checked={quiet} onCheckedChange={setQuiet} />{L('没有必读内容的会，不单独推送', 'No separate ping for meetings with nothing must-read')}</label></Row>
        <Row label={L('待办提醒', 'Reminders')}><label className="flex items-center gap-2"><Switch className="sg-switch" checked={digest} onCheckedChange={setDigest} />{L('截止前一天早上 9 点在飞书提醒', 'Remind me in Lark at 9 am the day before a due date')}</label></Row>
        <Row label={L('默认模型', 'Models')}>
          <span className="inline-flex items-center gap-1">{used.map(id => <ModelIcon key={id} icon={id} size={16} />)}</span>
          {used.length > 1 ? L(`多模型协同 · ${used.length} 个`, `Multi-model · ${used.length}`) : MODELS.find(m => m.id === used[0])?.label}
          <span className="text-ink-3 text-[12.5px]">{L('在新建会映的输入框里切换', 'Switch in the New reel composer')}</span>
        </Row>
        <Row label={L('界面语言', 'Language')}><LangSwitch /></Row>
        <Row label={L('简报语言', 'Brief language')}>{L('简体中文', 'English')}<span className="text-ink-3 text-[12.5px]">{L('原话保留原文', 'Quotes stay in the original')}</span></Row>
      </div>
    </div>
  )
}

/** 中文 / English 分段切换；切换会刷新页面（演示数据回到初始状态） */
export function LangSwitch({ className }: { className?: string }) {
  return (
    <span className={cn('sg-well inline-flex rounded-full p-0.5 text-[12.5px]', className)} role="group" aria-label="语言 / Language">
      {(['zh', 'en'] as const).map(l => {
        const on = (l === 'en') === isEn
        return (
          <button key={l} onClick={() => setLang(l)} aria-pressed={on} className={cn('h-7 rounded-full px-3 transition-colors', on ? 'sg-onyx font-medium text-white' : 'text-ink-2 hover:text-ink')}>
            {l === 'zh' ? '中文' : 'English'}
          </button>
        )
      })}
    </span>
  )
}

// ---------------- 退出后的登录页 ----------------

export function SignedOut({ logo }: { logo?: string }) {
  const me = personById(ME)
  return (
    <motion.div className="glass-workspace fixed inset-0 z-[70] grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="pc-sheet w-[min(400px,92vw)] rounded-[28px] p-2" initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center">
          {logo ? <img src={logo} alt={L('会映 MeetReel', 'MeetReel')} className="h-14 w-auto" draggable={false} /> : <b className="text-[22px]">{L('会映 MeetReel', 'MeetReel')}</b>}
          <p className="text-ink-2 mt-3 text-[14px]">{L('你已退出。每场会，按人发到对的人手里。', 'You’re signed out. Every meeting, split per person and sent to the right people.')}</p>
        </div>
        <button className="pc-hero group flex w-full items-center gap-3 rounded-[22px] p-3.5 text-left" onClick={actions.signIn}>
          <Face p={me} size={44} className="!rounded-[14px] shadow-[0_0_0_2px_rgb(255_255_255/40%)]" />
          <span className="min-w-0 flex-1 leading-tight"><b className="block text-[15px]">{me.name}</b><span className="text-[12.5px] text-white/70">{me.team} · {me.role}</span></span>
          <span className="sg-white-btn rounded-full px-3.5 py-1.5 text-[13px] font-semibold">{L('继续登录', 'Continue')}</span>
        </button>
        <button className="text-ink-2 hover:text-ink mx-auto mt-2.5 mb-1.5 block text-[13px] hover:underline" onClick={actions.signIn}>{L('使用其他飞书账号', 'Use another Lark account')}</button>
      </motion.div>
    </motion.div>
  )
}
