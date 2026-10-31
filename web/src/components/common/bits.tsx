// 到处都要用的小件：头像、职级标签、条目类型、模型图标、Koboyo 手绘图标、Logo、原话溯源按钮。
import type { CSSProperties, ReactNode } from 'react'
import { Crown, Lock, Play, Send, Workflow } from 'lucide-react'
import { ITEM_TYPES, PROJECTS, RANKS, personById, type IconKey, type Person, type PersonId } from '@/data/model'
import type { Item } from '@/data/meetings'
import { mmss, quoteSpan } from '@/data/derive'
import { goSource } from '@/lib/router'
import { cn } from '@/lib/utils'
import { KOBOYO, type KoboyoName } from '@/components/sketch/koboyoData'

// 模型图标：Lobe Icons 的静态 SVG（见 assets/models/SOURCE.md），按文件名对应模型
const ICON_FILES = import.meta.glob<string>('../../assets/models/*.svg', { eager: true, import: 'default' })
const ICON_FILE: Partial<Record<IconKey, string>> = {
  deepseek: 'deepseek-color', qwen: 'qwen-color', kimi: 'kimi-color', glm: 'zhipu-color', doubao: 'doubao-color',
  ernie: 'wenxin-color', hunyuan: 'hunyuan-color', minimax: 'minimax-color', spark: 'spark-color', stepfun: 'stepfun-color',
  baichuan: 'baichuan-color', yi: 'yi-color', sensenova: 'sensenova-color', internlm: 'internlm-color', claude: 'claude-color',
  gpt: 'openai', gemini: 'gemini-color', grok: 'grok', llama: 'meta-color', mistral: 'mistral-color', modelscope: 'modelscope-color',
}
const iconSrc = (k: IconKey) => {
  const f = ICON_FILE[k]
  return f ? Object.entries(ICON_FILES).find(([path]) => path.endsWith(`/${f}.svg`))?.[1] : undefined
}

export function Face({ p, size = 28, muted, className, ring, title }: { p: Person | PersonId; size?: number; muted?: boolean; className?: string; ring?: string; title?: string }) {
  const person = typeof p === 'string' ? personById(p) : p
  return (
    <span
      className={cn('inline-grid flex-none place-items-center rounded-full leading-none font-semibold select-none', className)}
      style={{
        width: size, height: size, fontSize: size * 0.44,
        background: muted ? '#EDEDED' : person.bg, color: muted ? '#9B9B9B' : person.fg,
        boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 3.5px ${ring}` : undefined,
      }}
      title={title ?? `${person.name} · ${person.role}`}
    >
      {person.short}
    </span>
  )
}

export function FaceStack({ ids, size = 22, max = 6, ring }: { ids: PersonId[]; size?: number; max?: number; ring?: (id: PersonId) => string | undefined }) {
  const shown = ids.slice(0, max)
  return (
    <span className="inline-flex items-center">
      {shown.map((id, i) => (
        <span key={id} className="rounded-full" style={{ marginLeft: i ? -size * 0.28 : 0, boxShadow: '0 0 0 2px #fff' }}>
          <Face p={id} size={size} ring={ring?.(id)} />
        </span>
      ))}
      {ids.length > max && <span className="text-ink-3 ml-1.5 text-xs">+{ids.length - max}</span>}
    </span>
  )
}

/** 职级标签：L1 高管 / L2 部门负责人 / L3 组长 / L4 成员 / 外部发言人 */
export function RankTag({ p, short, className }: { p: Person | PersonId; short?: boolean; className?: string }) {
  const person = typeof p === 'string' ? personById(p) : p
  const r = RANKS[person.rank]
  return (
    <span className={cn('inline-flex flex-none items-center gap-1 rounded-md px-1.5 text-[11px] leading-[18px] font-medium whitespace-nowrap', className)} style={{ color: r.color, background: r.soft }} title={`${r.level} · ${r.label}`}>
      {person.rank !== 'guest' && <b className="font-mono text-[10px] opacity-70">{r.level}</b>}{short ? null : r.label}
    </span>
  )
}

/** 项目 Leader 标记 */
export function LeaderTag({ pid, className }: { pid: PersonId; className?: string }) {
  const led = PROJECTS.filter(x => x.leader === pid)
  if (!led.length) return null
  return (
    <span className={cn('inline-flex flex-none items-center gap-1 rounded-md bg-amber-50 px-1.5 text-[11px] leading-[18px] font-medium whitespace-nowrap text-amber-700', className)} title={`${led.map(x => x.name).join('、')} 项目组 Leader`}>
      <Crown size={11} strokeWidth={2.4} />{led.map(x => x.name).join(' · ')} Leader
    </span>
  )
}

/** 人 + 职务 + 职级，一行看清“谁、什么级别、哪个部门” */
export function PersonLine({ p, size = 28, sub, leader, className }: { p: PersonId; size?: number; sub?: ReactNode; leader?: boolean; className?: string }) {
  const person = personById(p)
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <Face p={person} size={size} />
      <span className="min-w-0 leading-tight">
        <span className="flex items-center gap-1.5"><b className="truncate text-[13.5px] font-semibold">{person.name}</b><RankTag p={person} />{leader && <LeaderTag pid={p} />}</span>
        <span className="text-ink-3 block truncate text-[12px]">{sub ?? `${person.team}${person.group ? ` · ${person.group}` : ''} · ${person.role}`}</span>
      </span>
    </span>
  )
}

export function TypePill({ item, type, className }: { item?: Item; type?: Item['type']; className?: string }) {
  const c = ITEM_TYPES[item?.type ?? type ?? 'info']
  return <span className={cn('type-pill', className)} style={{ '--c': c.color, '--soft': c.soft } as CSSProperties}>{c.label}</span>
}

export const LockMark = ({ size = 12 }: { size?: number }) => <Lock size={size} className="flex-none text-rose-600" aria-label="受限" />

/** 模型图标（Lobe Icons，见 assets/models/SOURCE.md）；非模型的用 lucide 图标 */
export function ModelIcon({ icon, size = 14, className }: { icon: IconKey; size?: number; className?: string }) {
  const src = iconSrc(icon)
  if (src) return <img className={className} src={src} width={size} height={size} alt="" draggable={false} style={{ display: 'block', flex: 'none' }} />
  const I = icon === 'send' ? Send : Workflow
  return <I className={className} size={size} strokeWidth={2} style={{ flex: 'none', opacity: 0.6 }} />
}

/** Koboyo 手绘图标（https://koboyo.com/icons），填充色跟随 currentColor */
export function Kb({ name, size = 24, className, style }: { name: KoboyoName; size?: number; className?: string; style?: CSSProperties }) {
  const { vb, d } = KOBOYO[name]
  const [, , w, h] = vb.split(' ').map(Number)
  return (
    <svg className={className} style={style} viewBox={vb} width={size} height={(size * h) / w} fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="mr-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <path d="M6 24V9.5c0-1.6 2-2.3 3-1l7 9 7-9c1-1.3 3-.6 3 1V24" fill="none" stroke="url(#mr-logo)" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 原话溯源：点一下跳到会议录像的那一秒，逐字稿同步高亮 */
export function SourceChip({ item, className, children, onGo }: { item: Item; className?: string; children?: ReactNode; onGo?: () => void }) {
  const { t0, seg } = quoteSpan(item)
  const who = personById(seg.speaker)
  return (
    <button
      className={cn('group inline-flex max-w-full items-center gap-1.5 rounded-full border border-transparent py-0.5 pr-2.5 pl-0.5 text-left text-xs transition-colors hover:border-[#C9D8FF] hover:bg-[#EEF3FF]', className)}
      onClick={e => {
        e.stopPropagation()
        onGo?.()
        goSource(item.meeting, Math.max(0, t0 - 0.4), item.id)
      }}
      title="回到录像里的这一秒"
    >
      <span className="bg-primary grid size-5 flex-none place-items-center rounded-full text-white transition-transform group-hover:scale-110"><Play size={9} fill="currentColor" /></span>
      <span className="text-ink-2 truncate">{children ?? `“${item.quote}”`}</span>
      <span className="text-ink-3 flex-none font-mono text-[11px]">{who.name} {mmss(t0)}</span>
    </button>
  )
}

export function Empty({ icon, title, sub, children }: { icon: KoboyoName; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="kb-icon-in text-ink-3"><Kb name={icon} size={52} /></span>
      <b className="mt-2 text-[15px] font-semibold">{title}</b>
      {sub && <p className="text-ink-3 max-w-sm text-sm leading-6">{sub}</p>}
      {children}
    </div>
  )
}
