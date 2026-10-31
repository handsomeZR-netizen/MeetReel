import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphIcon } from 'morphicons/react'
import { Check as CheckData, Moon as MoonData, Pause, Play, Sun as SunData } from 'lucide'
import {
  AlertTriangle, BellOff, Bot, CalendarDays, Check, CheckCircle2, Moon, Sun, ChevronsUpDown, FileText, Gauge, Inbox,
  LayoutDashboard, ListChecks, Loader2, Lock, MessageCircleQuestion, PanelLeft, RotateCcw, Search,
  Send, Settings, Sparkles, UserRound, UserX, Users, Workflow, XCircle,
} from 'lucide-react'
import { parseTranscript } from '@web/lib/transcript'
import {
  AGENTS, DEFAULT_TEXT, DEFAULT_TITLE, ENGINES, ITEMS, ITEM_TYPES, PHASES, REASONS, T_END, TOTAL_TOKENS,
  agentLine, agentModel, agentProgress, agentState, briefOf, countOf, isQuiet, itemById, itemState, itemsAt,
  logAt, PEOPLE, PEOPLE_SORTED, personById, phaseIndex, quoteAt, readyAt, recipientsOf, routesAt, routesFor,
  tokensAt, mmss,
  type AgentState, type EngineId, type Item, type Person, type PersonId,
} from '@/shared/script'
import { useDemo } from '@/shared/useDemo'
import { ModelIcon } from '@/shared/ModelIcon'
import { cn } from '@/ui/lib/utils'
import { Button } from '@/ui/components/ui/button'
import { Badge } from '@/ui/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/ui/components/ui/sheet'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/ui/components/ui/command'
import { Avatar, AvatarFallback, Input, Kbd, Progress, Separator, Switch, Textarea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/components/ui/misc'

type Tab = 'agents' | 'ledger' | 'people' | 'transcript'
const autoTab = (t: number): Tab => (t < 4.5 ? 'agents' : t < 10.3 ? 'ledger' : 'people')

export function App() {
  const demo = useDemo({ startDelay: 300 })
  const { t, clock, running, done } = demo
  const [dark, setDark] = useState(false)
  const [side, setSide] = useState(true)
  const [engine, setEngine] = useState<EngineId>('deepseek')
  const [follow, setFollow] = useState(true)
  const [tab, setTab] = useState<Tab>('agents')
  const [sheet, setSheet] = useState<PersonId | null>(null)
  const [cmd, setCmd] = useState(false)
  const [hot, setHot] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    if (follow && running) setTab(autoTab(t))
  }, [follow, running, t])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmd(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pickTab = (v: Tab) => {
    setTab(v)
    setFollow(false)
  }

  return (
    <TooltipProvider>
      <div className="bg-sidebar flex h-svh overflow-hidden">
        <AppSidebar open={side} running={running} />

        <main className="bg-background m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm max-md:ml-2">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <Button variant="ghost" size="icon-sm" onClick={() => setSide(s => !s)} aria-label="切换侧栏"><PanelLeft /></Button>
            <Separator orientation="vertical" className="mx-1 !h-4" />
            <nav className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <span>会议</span><span>/</span><span className="text-foreground font-medium">{DEFAULT_TITLE}</span>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-muted-foreground w-56 justify-start font-normal" onClick={() => setCmd(true)}>
                <Search /> 搜索人、条目或操作…
                <Kbd className="ml-auto">Ctrl K</Kbd>
              </Button>
              <EnginePicker engine={engine} onPick={setEngine} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDark(d => !d)} aria-label="切换主题">
                    <MorphIcon icon={dark ? MoonData : SunData} size={16} strokeWidth={2} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{dark ? '切到亮色' : '切到暗色'}</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {!running ? (
                <motion.div key="new" className="p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <NewMeeting engine={engine} onEngine={setEngine} onStart={demo.start} />
                </motion.div>
              ) : (
                <motion.div key="run" className="mx-auto flex max-w-[1440px] flex-col gap-5 p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <TitleRow t={t} done={done} playing={clock.playing} speed={clock.speed} onToggle={clock.toggle} onSpeed={clock.setSpeed} onReplay={clock.restart} onNew={demo.reset} />
                  <Kpis t={t} engine={engine} />
                  <Tabs value={tab} onValueChange={v => pickTab(v as Tab)} className="gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <TabsList>
                        <TabsTrigger value="agents"><Workflow /> 编排</TabsTrigger>
                        <TabsTrigger value="ledger"><ListChecks /> 账本 <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 tabular-nums">{itemsAt(t).length}</Badge></TabsTrigger>
                        <TabsTrigger value="people"><Users /> 收件人</TabsTrigger>
                        <TabsTrigger value="transcript"><FileText /> 原文</TabsTrigger>
                      </TabsList>
                      <label className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Switch checked={follow} onCheckedChange={setFollow} /> 跟随进度切换
                      </label>
                    </div>
                    <TabsContent value="agents"><AgentsView t={t} engine={engine} /></TabsContent>
                    <TabsContent value="ledger"><LedgerView t={t} hot={hot} /></TabsContent>
                    <TabsContent value="people"><PeopleView t={t} onOpen={setSheet} /></TabsContent>
                    <TabsContent value="transcript"><TranscriptView t={t} /></TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <BriefSheet id={sheet} onClose={() => setSheet(null)} />

      <CommandDialog open={cmd} onOpenChange={setCmd}>
        <CommandInput placeholder="输入人名、条目或操作…" />
        <CommandList>
          <CommandEmpty>没有找到。</CommandEmpty>
          <CommandGroup heading="收件人">
            {PEOPLE_SORTED.map(p => (
              <CommandItem key={p.id} value={`${p.name} ${p.role}`} onSelect={() => { setCmd(false); setSheet(p.id) }}>
                <Face p={p} className="size-5 text-[10px]" />
                {p.name}<span className="text-muted-foreground">{p.role}</span>
                <CommandShortcut>{isQuiet(p.id) ? '不打扰' : `${countOf(p.id)} 条`}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="账本条目">
            {ITEMS.map(it => (
              <CommandItem key={it.id} value={`${it.id} ${it.title} ${it.quote}`} onSelect={() => { setCmd(false); pickTab('ledger'); setHot(it.id); setTimeout(() => setHot(null), 2200) }}>
                <TypeBadge item={it} />{it.title}<CommandShortcut>{it.id}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="操作">
            <CommandItem onSelect={() => { setCmd(false); setDark(d => !d) }}>{dark ? <Sun /> : <Moon />} 切换{dark ? '亮色' : '暗色'}主题</CommandItem>
            <CommandItem onSelect={() => { setCmd(false); if (running) clock.restart(); else demo.start() }}><RotateCcw /> 从头运行</CommandItem>
            <CommandItem onSelect={() => { setCmd(false); clock.setSpeed(clock.speed === 2 ? 1 : 2) }}><Gauge /> {clock.speed === 2 ? '恢复 1 倍速' : '2 倍速播放'}</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <AnimatePresence>
        {done && <DoneToast onOpen={() => pickTab('people')} />}
      </AnimatePresence>
    </TooltipProvider>
  )
}

// ---------------- 侧栏 ----------------

function AppSidebar({ open, running }: { open: boolean; running: boolean }) {
  const nav = [
    { icon: LayoutDashboard, label: '概览' },
    { icon: CalendarDays, label: '会议', on: true },
    { icon: Inbox, label: '收件箱', badge: running ? '7' : undefined },
    { icon: Bot, label: '智能体' },
    { icon: UserRound, label: '关注档案' },
  ]
  return (
    <motion.aside className="text-sidebar-foreground shrink-0 overflow-hidden max-md:hidden" animate={{ width: open ? 256 : 0 }} transition={{ type: 'spring', stiffness: 380, damping: 40 }}>
      <div className="flex h-full w-64 flex-col p-2">
        <button className="hover:bg-sidebar-accent flex items-center gap-2 rounded-md p-2 text-left">
          <span className="bg-sidebar-primary text-sidebar-primary-foreground grid size-8 place-items-center rounded-lg">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 7.5h9M4 12h13M4 16.5h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="19" cy="7.5" r="1.8" fill="currentColor" /><circle cx="15.5" cy="16.5" r="1.8" fill="currentColor" /></svg>
          </span>
          <span className="grid flex-1 leading-tight"><b className="text-sm font-semibold">会映 MeetReel</b><span className="text-muted-foreground text-xs">苏客松 · 团队版</span></span>
          <ChevronsUpDown className="text-muted-foreground size-4" />
        </button>

        <div className="text-muted-foreground mt-4 px-2 pb-1 text-xs font-medium">平台</div>
        {nav.map(({ icon: I, label, on, badge }) => (
          <button key={label} className={cn('hover:bg-sidebar-accent flex h-8 items-center gap-2 rounded-md px-2 text-sm', on && 'bg-sidebar-accent font-medium')}>
            <I className="size-4" /> {label}
            {badge && <Badge className="ml-auto h-5 rounded-full px-1.5">{badge}</Badge>}
          </button>
        ))}

        <div className="text-muted-foreground mt-4 px-2 pb-1 text-xs font-medium">最近会议</div>
        {[DEFAULT_TITLE, '客户端发版排期', 'Q4 OKR 对齐会', '客服话术复盘'].map((m, i) => (
          <button key={m} className={cn('hover:bg-sidebar-accent flex h-8 items-center gap-2 rounded-md px-2 text-sm', i === 0 && 'text-foreground', i > 0 && 'text-muted-foreground')}>
            <span className={cn('size-2 rounded-full', ['bg-chart-1', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'][i])} />
            <span className="truncate">{m}</span>
          </button>
        ))}

        <div className="mt-auto flex flex-col gap-1">
          <button className="hover:bg-sidebar-accent text-muted-foreground flex h-8 items-center gap-2 rounded-md px-2 text-sm"><Settings className="size-4" /> 设置</button>
          <div className="hover:bg-sidebar-accent flex items-center gap-2 rounded-md p-2">
            <Face p={personById('wangke')} className="size-8 rounded-lg" />
            <span className="grid flex-1 leading-tight"><b className="text-sm font-medium">王珂</b><span className="text-muted-foreground text-xs">产品 · 本场主持</span></span>
            <ChevronsUpDown className="text-muted-foreground size-4" />
          </div>
        </div>
      </div>
    </motion.aside>
  )
}

function EnginePicker({ engine, onPick }: { engine: EngineId; onPick: (e: EngineId) => void }) {
  return (
    <div className="bg-muted flex h-8 items-center rounded-md p-[3px]">
      {ENGINES.map(e => (
        <Tooltip key={e.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onPick(e.id)}
              className={cn('relative flex h-full items-center gap-1.5 rounded-sm px-2 text-xs font-medium', e.id === engine ? 'text-foreground' : 'text-muted-foreground')}
            >
              {e.id === engine && <motion.span layoutId="ui-engine" className="bg-background absolute inset-0 rounded-sm shadow-sm dark:bg-input/40" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
              <span className={cn('relative', e.id !== engine && 'opacity-50 grayscale')}><ModelIcon icon={e.id} size={13} /></span>
              <span className="relative">{e.label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{e.sub}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

// ---------------- 新建会议 ----------------

function NewMeeting({ engine, onEngine, onStart }: { engine: EngineId; onEngine: (e: EngineId) => void; onStart: () => void }) {
  const [text, setText] = useState(DEFAULT_TEXT)
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="text-xl">新建会议</CardTitle>
        <CardDescription>贴进会议文本，8 个智能体会把它拆成每人一份的简报：附原话，写明为什么发给你。</CardDescription>
        <CardAction><Badge variant="outline"><Sparkles /> 演示数据</Badge></CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">标题</label>
            <Input defaultValue={DEFAULT_TITLE} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">模型</label>
            <div className="grid grid-cols-3 gap-2">
              {ENGINES.map(e => (
                <Button key={e.id} variant="outline" size="sm" onClick={() => onEngine(e.id)} className={cn(e.id === engine && 'border-primary ring-primary/15 ring-[3px]')}>
                  <ModelIcon icon={e.id} size={14} /> {e.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">会议文本</label>
            <span className="text-muted-foreground text-xs">格式：姓名：发言内容，一行一段</span>
          </div>
          <Textarea value={text} onChange={e => setText(e.target.value)} className="h-64 resize-none text-[13.5px] leading-7 [field-sizing:fixed]"
            onKeyDown={e => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onStart()} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {PEOPLE.map(p => <Face key={p.id} p={p} className={cn('ring-background size-7 ring-2', p.present && 'ring-primary')} />)}
          </div>
          <span className="text-muted-foreground text-sm">8 位相关人 · 参会 3 · 缺席 5 · 关注档案已加载</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between border-t">
        <span className="text-muted-foreground text-sm">现场运行用 DeepSeek，可切换 Claude 基线或私有化 Qwen</span>
        <Button onClick={onStart}>开始分析 <Kbd className="bg-primary-foreground/15 text-primary-foreground">Ctrl ↵</Kbd></Button>
      </CardFooter>
    </Card>
  )
}

// ---------------- 运行：标题行 + 指标 ----------------

function TitleRow(p: { t: number; done: boolean; playing: boolean; speed: number; onToggle: () => void; onSpeed: (s: number) => void; onReplay: () => void; onNew: () => void }) {
  const idx = phaseIndex(p.t)
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{DEFAULT_TITLE}</h1>
          {p.done ? (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle2 /> 已分发</Badge>
          ) : (
            <Badge variant="outline" className="border-chart-1/30 bg-chart-1/10 text-chart-1"><Loader2 className="animate-spin" /> 运行中 · {PHASES[idx].label}</Badge>
          )}
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
          {PHASES.map((ph, i) => (
            <span key={ph.id} className="flex items-center gap-1">
              <span className={cn(i < idx || p.done ? 'text-foreground' : i === idx ? 'text-chart-1 font-medium' : '')}>{ph.label}</span>
              {i < PHASES.length - 1 && <span className="text-border">—</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs tabular-nums">{mmss(p.t)} / {mmss(T_END)}</span>
        <Button variant="outline" size="icon-sm" onClick={p.onToggle} aria-label={p.playing ? '暂停' : '播放'}>
          <MorphIcon icon={p.playing ? Pause : Play} size={15} strokeWidth={2.2} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => p.onSpeed(p.speed === 2 ? 1 : 2)} className="tabular-nums">{p.speed}×</Button>
        <Button variant="outline" size="sm" onClick={p.onReplay}><RotateCcw /> 重放</Button>
        <Button size="sm" onClick={p.onNew}>新建会议</Button>
      </div>
    </div>
  )
}

function Kpis({ t, engine }: { t: number; engine: EngineId }) {
  const items = itemsAt(t)
  const ok = items.filter(i => itemState(i, t) === 'ok').length
  const routes = routesAt(t)
  const ready = PEOPLE.filter(p => !isQuiet(p.id) && t >= readyAt(p.id)).length
  const tokens = tokensAt(t)
  const price = ENGINES.find(e => e.id === engine)!.yuanPerM
  const spark = useMemo(() => Array.from({ length: 41 }, (_, i) => tokensAt((i / 40) * T_END)), [])
  const cut = Math.round((t / T_END) * 40)
  const max = spark[40]
  const pts = spark.slice(0, cut + 1).map((v, i) => `${(i / 40) * 100},${30 - (v / max) * 28}`).join(' ')

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="账本条目" value={<>{items.length}<span className="text-muted-foreground text-base font-normal"> / 10</span></>} badge={<><Check /> {ok} 已校验</>}
        foot="全部附原话" sub={t >= 7.25 ? '1 条被审核官打回后重抽' : '审核官逐条对照转写'}>
        <Progress value={(items.length / 10) * 100} className="mt-1 h-1.5" />
      </Kpi>
      <Kpi label="推送" value={routes.length} badge={<><Users /> 8 人</>} foot="相关性 × 权限" sub={t >= 12 ? '其中 3 条来自影响链 R4' : '按点名、角色、负责、依赖判断'}>
        <div className="mt-1 flex h-1.5 gap-0.5">{Array.from({ length: 18 }, (_, i) => <i key={i} className={cn('flex-1 rounded-full transition-colors', i < routes.length ? 'bg-chart-2' : 'bg-muted')} />)}</div>
      </Kpi>
      <Kpi label="简报" value={<>{ready}<span className="text-muted-foreground text-base font-normal"> / 7</span></>} badge={<><BellOff /> 1 不打扰</>} foot={t >= 19.1 ? '已投递到飞书' : '编辑官按人改写'} sub="平均 30 秒读完">
        <div className="mt-1 flex -space-x-1.5">{PEOPLE_SORTED.filter(p => !isQuiet(p.id)).map(p => <Face key={p.id} p={p} className={cn('ring-card size-5 text-[9px] ring-2 transition-opacity', t >= readyAt(p.id) ? 'opacity-100' : 'opacity-25')} />)}</div>
      </Kpi>
      <Kpi label="Tokens" value={tokens.toLocaleString()} badge={<><ModelIcon icon={engine} size={12} /> {price ? `¥${((tokens * price) / 1e6).toFixed(3)}` : '私有化'}</>} foot={agentModel('ext', engine).label} sub={`整场约 ${TOTAL_TOKENS.toLocaleString()} tokens`}>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-1 h-8 w-full overflow-visible">
          <defs><linearGradient id="ui-spark" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity=".35" /><stop offset="1" stopColor="var(--chart-1)" stopOpacity="0" /></linearGradient></defs>
          {cut > 0 && <polygon points={`0,30 ${pts} ${(cut / 40) * 100},30`} fill="url(#ui-spark)" />}
          {cut > 0 && <polyline points={pts} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        </svg>
      </Kpi>
    </div>
  )
}

function Kpi({ label, value, badge, foot, sub, children }: { label: string; value: ReactNode; badge: ReactNode; foot: string; sub: string; children?: ReactNode }) {
  return (
    <Card className="from-primary/5 to-card gap-3 bg-gradient-to-t py-5 shadow-xs dark:bg-card">
      <CardHeader className="px-5">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
        <CardAction><Badge variant="outline">{badge}</Badge></CardAction>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
      <CardFooter className="flex-col items-start gap-0.5 px-5 text-sm">
        <div className="font-medium">{foot}</div>
        <div className="text-muted-foreground">{sub}</div>
      </CardFooter>
    </Card>
  )
}

// ---------------- 编排 ----------------

const STATE_BADGE: Record<AgentState, { label: string; cls: string; icon: ReactNode }> = {
  idle: { label: '待派发', cls: 'text-muted-foreground', icon: null },
  busy: { label: '运行中', cls: 'border-chart-1/30 bg-chart-1/10 text-chart-1', icon: <Loader2 className="animate-spin" /> },
  wait: { label: '等待', cls: 'text-muted-foreground', icon: <Loader2 className="animate-spin opacity-50" /> },
  fail: { label: '打回', cls: 'border-destructive/30 bg-destructive/10 text-destructive', icon: <XCircle /> },
  done: { label: '完成', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 /> },
}

function AgentsView({ t, engine }: { t: number; engine: EngineId }) {
  const log = logAt(t).slice().reverse()
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="gap-0 overflow-hidden py-0 xl:col-span-2">
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle>智能体</CardTitle>
          <CardDescription>调度官维护账本，按阶段派发任务；审核、路由用规则兜底</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">智能体</TableHead>
              <TableHead>模型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-[140px]">进度</TableHead>
              <TableHead className="pr-4">当前</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {AGENTS.map(a => {
              const st = agentState(a.id, t)
              const b = STATE_BADGE[st]
              const m = agentModel(a.id, engine)
              return (
                <TableRow key={a.id} className={cn(st === 'busy' && 'bg-chart-1/5', st === 'fail' && 'bg-destructive/5')}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex size-2.5">
                        {st === 'busy' && <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: a.color }} />}
                        <span className="relative inline-flex size-2.5 rounded-full" style={{ background: a.color }} />
                      </span>
                      <div className="grid leading-tight"><span className="font-medium">{a.name}</span><span className="text-muted-foreground text-xs">{a.duty}</span></div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-normal"><ModelIcon icon={m.icon} size={12} />{m.label}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={b.cls}>{b.icon}{b.label}</Badge></TableCell>
                  <TableCell><Progress value={agentProgress(a.id, t) * 100} className="h-1.5" indicatorClassName={st === 'done' ? 'bg-emerald-500' : ''} /></TableCell>
                  <TableCell className="text-muted-foreground max-w-[280px] truncate pr-4">{st === 'idle' ? '—' : agentLine(a.id, t)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <CardTitle>运行日志</CardTitle>
          <CardDescription>{log.length} 条事件</CardDescription>
        </CardHeader>
        <div className="h-[440px] overflow-y-auto p-2">
          <AnimatePresence initial={false}>
            {log.map(l => {
              const a = AGENTS.find(x => x.id === l.agent)!
              const bad = l.text.includes('失败')
              return (
                <motion.div key={l.at} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className={cn('hover:bg-muted/60 flex gap-3 rounded-md px-2 py-1.5 text-sm', bad && 'text-destructive')}>
                    <span className="text-muted-foreground w-9 shrink-0 font-mono text-xs leading-5 tabular-nums">{l.at.toFixed(1)}s</span>
                    <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: a.color }} />
                    <span><b className="font-medium">{a.name}</b> <span className={bad ? '' : 'text-muted-foreground'}>{l.text}</span></span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  )
}

// ---------------- 账本 ----------------

function LedgerView({ t, hot }: { t: number; hot: string | null }) {
  const items = itemsAt(t)
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-4 [.border-b]:pb-4">
        <CardTitle>会议账本</CardTitle>
        <CardDescription>6 类条目，每条附原话；受限条目按权限脱敏</CardDescription>
        <CardAction className="flex gap-1.5">
          {Object.entries(ITEM_TYPES).map(([k, v]) => <Badge key={k} variant="outline" className="font-normal"><span className="size-1.5 rounded-full" style={{ background: v.color }} />{v.label}</Badge>)}
        </CardAction>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">ID</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>条目</TableHead>
            <TableHead>负责人</TableHead>
            <TableHead>截止</TableHead>
            <TableHead>原话</TableHead>
            <TableHead>收件人</TableHead>
            <TableHead className="pr-4 text-right">状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!items.length && (
            <TableRow><TableCell colSpan={8} className="text-muted-foreground h-32 text-center">抽取官 4.5 秒后开始写入账本</TableCell></TableRow>
          )}
          <AnimatePresence initial={false}>
            {items.map(it => {
              const st = itemState(it, t)
              const owner = it.owner ? personById(it.owner) : null
              const to = recipientsOf(it.id).filter(pid => routesFor(pid, t).some(r => r.item === it.id))
              return (
                <motion.tr
                  key={it.id}
                  layout
                  initial={{ opacity: 0, backgroundColor: 'color-mix(in oklch, var(--chart-1) 12%, transparent)' }}
                  animate={{ opacity: 1, backgroundColor: hot === it.id ? 'color-mix(in oklch, var(--chart-1) 14%, transparent)' : st === 'fail' ? 'color-mix(in oklch, var(--destructive) 8%, transparent)' : 'rgba(0,0,0,0)' }}
                  transition={{ duration: 0.6 }}
                  className="hover:bg-muted/50 border-b last:border-0"
                >
                  <TableCell className="text-muted-foreground pl-4 font-mono text-xs">{it.id}</TableCell>
                  <TableCell><TypeBadge item={it} /></TableCell>
                  <TableCell className="max-w-[210px]">
                    <div className="flex items-center gap-1.5 truncate font-medium">{it.title}{it.sensitivity === 'restricted' && <Lock className="size-3.5 text-rose-600" />}</div>
                  </TableCell>
                  <TableCell>
                    {owner ? (
                      <span className="flex items-center gap-1.5"><Face p={owner} className="size-5 text-[9px]" />{owner.name}{it.ownerBasis && <span className="text-muted-foreground text-xs">{it.ownerBasis}</span>}</span>
                    ) : it.flags && st === 'ok' ? (
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"><AlertTriangle /> 缺负责人</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{it.due ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="max-w-[170px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn('block truncate', st === 'fail' ? 'text-destructive line-through' : 'text-muted-foreground')}>“{quoteAt(it, t)}”</span>
                      </TooltipTrigger>
                      <TooltipContent>{personById(it.speaker).name} · {it.at}{st === 'fail' && ' · 转写里没有这句话'}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-1.5">
                      {to.map(pid => <Face key={pid} p={personById(pid)} className="ring-background size-5 text-[9px] ring-2" />)}
                      {!to.length && <span className="text-muted-foreground text-xs">{t < 10.3 ? '待路由' : '仅账本'}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {st === 'ok' ? <Badge variant="outline" className={STATE_BADGE.done.cls}><CheckCircle2 /> 已校验</Badge>
                      : st === 'fail' ? <Badge variant="outline" className={STATE_BADGE.fail.cls}><XCircle /> 打回重抽</Badge>
                      : <Badge variant="outline" className="text-muted-foreground"><Loader2 className="animate-spin" /> 校验中</Badge>}
                  </TableCell>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Card>
  )
}

// ---------------- 收件人 ----------------

function PeopleView({ t, onOpen }: { t: number; onOpen: (id: PersonId) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PEOPLE_SORTED.map((p, i) => {
        const quiet = isQuiet(p.id)
        const got = p.host ? (routesAt(t).length ? ITEMS.length : 0) : routesFor(p.id, t).length
        const ready = t >= readyAt(p.id)
        const sent = t >= 19.1 && !quiet
        const reasons = [...new Set(routesFor(p.id, t).flatMap(r => r.reasons))]
        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={cn('h-full gap-3 py-4 transition-shadow hover:shadow-md', quiet && ready && 'bg-muted/40 border-dashed shadow-none')}>
              <CardHeader className="px-4">
                <div className="flex items-center gap-2.5">
                  <Face p={p} className="size-9 text-sm" muted={quiet && ready} />
                  <div className="grid leading-tight">
                    <span className="flex items-center gap-1.5 font-medium">{p.name}{!p.present && <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">缺席</Badge>}</span>
                    <span className="text-muted-foreground text-xs">{p.role}</span>
                  </div>
                </div>
                <CardAction>
                  <motion.span key={got} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="block text-2xl font-semibold tabular-nums">{quiet && ready ? '0' : got}</motion.span>
                </CardAction>
              </CardHeader>
              <CardContent className="flex min-h-6 flex-wrap gap-1 px-4">
                {quiet && ready ? <span className="text-muted-foreground flex items-center gap-1 text-xs"><BellOff className="size-3.5" /> 没有必读，不打扰</span>
                  : p.host ? <Badge variant="secondary" className="font-normal">主持人 · 全部条目</Badge>
                  : reasons.map(r => (
                    <Badge key={r} variant={r === 'R4' ? 'default' : 'secondary'} className={cn('font-normal', r === 'R4' && 'bg-chart-1 text-white')}>{REASONS[r]}</Badge>
                  ))}
              </CardContent>
              <CardFooter className="justify-between px-4 text-xs">
                <span className={cn('flex items-center gap-1', sent ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                  {sent ? <><Send className="size-3.5" /> 已投递飞书</> : ready && !quiet ? <><Check className="size-3.5" /> 简报已写好</> : quiet && ready ? '只进日报' : got ? <><Loader2 className="size-3.5 animate-spin" /> 等待改写</> : '等待路由'}
                </span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={!ready} onClick={() => onOpen(p.id)}>查看简报</Button>
              </CardFooter>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// ---------------- 原文 ----------------

function TranscriptView({ t }: { t: number }) {
  const segs = useMemo(() => parseTranscript(DEFAULT_TEXT), [])
  const items = itemsAt(t).filter(i => quoteAt(i, t) === i.quote)
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4 [.border-b]:pb-4">
        <CardTitle>会议原文</CardTitle>
        <CardDescription>11 段发言 · 被抽成条目的原话已标出</CardDescription>
      </CardHeader>
      <CardContent className="divide-y px-0">
        {segs.map(s => (
          <div key={s.id} className="flex gap-3 px-6 py-3">
            {s.person ? <Face p={s.person} className="size-7 text-xs" /> : <Avatar className="size-7"><AvatarFallback>?</AvatarFallback></Avatar>}
            <div className="grid gap-0.5">
              <div className="flex items-baseline gap-2 text-sm"><span className="font-medium">{s.speaker}</span><span className="text-muted-foreground font-mono text-xs">{s.at}</span></div>
              <p className="text-sm leading-6">{mark(s.text, items)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function mark(text: string, items: Item[]) {
  const hits = items.map(it => ({ it, at: text.indexOf(it.quote) })).filter(h => h.at >= 0).sort((a, b) => a.at - b.at)
  const out: ReactNode[] = []
  let cur = 0
  for (const { it, at } of hits) {
    if (at < cur) continue
    out.push(text.slice(cur, at))
    const c = ITEM_TYPES[it.type].color
    out.push(<mark key={it.id} className="rounded-sm px-0.5 text-inherit" style={{ background: `${c}22`, boxShadow: `inset 0 -2px 0 ${c}` }}>{it.quote}</mark>)
    cur = at + it.quote.length
  }
  out.push(text.slice(cur))
  return out
}

// ---------------- 简报侧滑 ----------------

function BriefSheet({ id, onClose }: { id: PersonId | null; onClose: () => void }) {
  const [last, setLast] = useState<PersonId>('zhaoyi')
  const [acted, setActed] = useState<Record<string, string>>({})
  useEffect(() => { if (id) setLast(id) }, [id])
  const p = personById(id ?? last)
  const b = briefOf(p.id)
  const quiet = isQuiet(p.id)
  const rows = p.host ? ITEMS.map(i => i.id) : b.entries.map(e => e.item)
  return (
    <Sheet open={!!id} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-3">
            <Face p={p} className="size-10 text-base" muted={quiet} />
            <div className="grid">
              <SheetTitle>{p.name} 收到的简报</SheetTitle>
              <SheetDescription>{p.role}{quiet ? ' · 这场会不打扰' : ` · ${countOf(p.id)} 条 · 约 ${b.readSeconds} 秒`}</SheetDescription>
            </div>
          </div>
          <p className="mt-2 text-[15px] leading-6 font-medium">{b.headline}</p>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {quiet && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm"><BellOff className="size-6" /> 没有需要必读的内容，上线日期变化已进日报。</div>
          )}
          {rows.map(iid => {
            const it = itemById(iid)
            const e = b.entries.find(x => x.item === iid)
            return (
              <Card key={iid} className="gap-2 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="flex items-center gap-2 text-sm"><TypeBadge item={it} />{it.title}{it.sensitivity === 'restricted' && <Lock className="size-3.5 text-rose-600" />}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 text-sm">
                  {e && <p className="leading-6">{e.forYou}</p>}
                  {e && <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">为什么发给你：{e.why}{e.reasons.map(r => <Badge key={r} variant={r === 'R4' ? 'default' : 'secondary'} className={cn('h-5 font-normal', r === 'R4' && 'bg-chart-1 text-white')}>{REASONS[r]}</Badge>)}</div>}
                  {p.host && <div className="text-muted-foreground text-xs">发给：{recipientsOf(iid).map(x => personById(x).name).join('、') || '仅账本'}</div>}
                  <div className="bg-muted/60 rounded-md px-3 py-2 text-xs">“{it.quote}” <span className="text-muted-foreground">— {personById(it.speaker).name} {it.at}</span></div>
                </CardContent>
                {e && it.type === 'action' && (
                  <CardFooter className="gap-2 px-4">
                    <Button size="sm" className="h-7" variant={acted[iid] === 'ok' ? 'default' : 'outline'} onClick={() => setActed(s => ({ ...s, [iid]: 'ok' }))}>
                      {acted[iid] === 'ok' ? <Check /> : null}{acted[iid] === 'ok' ? '已确认' : '确认'}
                    </Button>
                    <Button size="sm" className="h-7" variant="outline" onClick={() => setActed(s => ({ ...s, [iid]: 'no' }))}><UserX /> 不是我</Button>
                    <Button size="sm" className="h-7" variant="ghost" onClick={() => setActed(s => ({ ...s, [iid]: 'ask' }))}><MessageCircleQuestion /> 追问</Button>
                  </CardFooter>
                )}
              </Card>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------- 小部件 ----------------

function TypeBadge({ item }: { item: Item }) {
  const c = ITEM_TYPES[item.type]
  return <Badge variant="outline" className="border-transparent font-medium" style={{ color: c.color, background: `${c.color}1A` } as CSSProperties}>{c.label}</Badge>
}

function Face({ p, className, muted }: { p: Person; className?: string; muted?: boolean }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="font-semibold" style={muted ? undefined : { background: p.bg, color: p.fg }}>{p.short}</AvatarFallback>
    </Avatar>
  )
}

function DoneToast({ onOpen }: { onOpen: () => void }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setShow(false), 6000)
    return () => clearTimeout(id)
  }, [])
  if (!show) return null
  return (
    <motion.div
      className="bg-popover text-popover-foreground fixed right-4 bottom-16 z-40 flex w-[360px] items-start gap-3 rounded-lg border p-4 shadow-lg"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.3 }}
    >
      <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><MorphIcon icon={CheckData} size={12} strokeWidth={3} /></span>
      <div className="grid flex-1 gap-0.5">
        <span className="text-sm font-medium">已分发 7 份简报</span>
        <span className="text-muted-foreground text-xs">8 个相关人，1 人没被打扰。用时 20 秒，约 {TOTAL_TOKENS.toLocaleString()} tokens。</span>
      </div>
      <Button size="sm" variant="outline" className="h-7" onClick={() => { onOpen(); setShow(false) }}>查看</Button>
    </motion.div>
  )
}
