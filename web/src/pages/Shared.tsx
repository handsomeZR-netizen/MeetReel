// 发给我的 · 简报详情：收到者视角（从“我的会议”点进来）。可以切换身份，看每个人收到的那一份（权限闸实时生效）。
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lock, Play, ShieldCheck } from 'lucide-react'
import { ME, RANKS, REASONS, STAFF, personById, projectById, type PersonId } from '@/data/model'
import { meetingById } from '@/data/meetings'
import { inboxOf, mmss, quoteSpan, visibility } from '@/data/derive'
import { go, goSource, useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import { cn, cnDate } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Empty, Face, Kb, RankTag, TypePill } from '@/components/common/bits'
import { NOTE_COLORS } from '@/components/sketch/Briefs'
import { FeishuCard } from '@/components/common/FeishuCard'

export function Shared() {
  const route = useRoute()
  const as = (route.query.get('as') as PersonId | null) ?? ME
  const dispatched = useStore(s => s.dispatched)
  const inbox = useMemo(
    () => inboxOf(as, id => !!dispatched[id]).sort((a, b) => (b.meeting.date + b.meeting.time).localeCompare(a.meeting.date + a.meeting.time)),
    [as, dispatched],
  )
  const sel = route.query.get('b') ?? inbox[0]?.meeting.id
  const cur = inbox.find(x => x.meeting.id === sel) ?? inbox[0]
  const me = personById(as)
  const pick = (q: Record<string, string>) => go('/shared', { as, b: cur?.meeting.id, ...q })

  return (
    <>
      <TopBar crumbs={[{ label: '我的会议', to: as === ME ? '/?v=meet' : `/?as=${as}&v=meet` }, { label: as === ME ? '发给我的' : `发给${me.name}的` }, ...(cur ? [{ label: cur.meeting.title }] : [])]} />
      <div className="flex-none border-b px-6 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight">{as === ME ? '发给我的简报' : `发给${me.name}的简报`}<RankTag p={me} /></h1>
            <p className="text-ink-3 text-[13px]">收到者视角：每份只含和 {as === ME ? '你' : me.name} 有关的条目，写明为什么发过来；原话一点就回到录像。</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-ink-3 inline-flex items-center gap-1 text-[12.5px]"><ShieldCheck size={14} /> 切换身份预览</span>
            <div className="flex flex-wrap gap-1 rounded-full bg-[#F2F3F5] p-1">
              {STAFF.map(p => (
                <button key={p.id} onClick={() => go('/shared', { as: p.id })} className={cn('relative rounded-full p-0.5 transition-transform hover:-translate-y-px')} title={`${p.name} · ${RANKS[p.rank].level} ${RANKS[p.rank].label} · ${p.role}`}>
                  {as === p.id && <motion.span layoutId="as-ring" className="absolute inset-0 rounded-full shadow-[0_0_0_2px_#17171A]" />}
                  <Face p={p} size={26} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] max-lg:grid-cols-1">
        <div className="min-h-0 overflow-y-auto border-r p-3">
          {!inbox.length && <Empty icon="coffee" title="还没有收到简报" sub="这个人最近的会都没有必读内容，不打扰。" />}
          <div className="flex flex-col gap-3 pt-2">
            {inbox.map(({ meeting: m, brief: b }, i) => {
              const p = projectById(m.project)
              const on = cur?.meeting.id === m.id
              const quiet = !b.host && !b.entries.length
              const pub = personById(m.publisher)
              return (
                <motion.button
                  key={m.id}
                  onClick={() => pick({ b: m.id })}
                  className={cn('sk-todo w-full text-left', on && 'outline-ink outline-2 outline-offset-2')}
                  style={{ background: NOTE_COLORS[(i + 2) % NOTE_COLORS.length], rotate: on ? '0deg' : `${i % 2 ? 0.7 : -0.7}deg` }}
                  whileHover={{ rotate: '0deg', y: -2 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: p.color }} />
                    <b className="min-w-0 flex-1 truncate text-[16px]">{m.title}</b>
                    <span className="flex-none text-[12px] opacity-60">{cnDate(m.date)}</span>
                  </div>
                  <div className="mt-0.5 text-[12.5px] opacity-60">{pub.name} 发布（{RANKS[pub.rank].label}） · {quiet ? '不打扰' : `${b.entries.length} 条 · 约 ${b.readSeconds} 秒`}</div>
                  <p className="mt-1 line-clamp-3 text-[14px] leading-relaxed">{b.headline}</p>
                </motion.button>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            {cur && (
              <motion.div key={cur.meeting.id + as} className="mx-auto grid max-w-[1000px] gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_280px]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div>
                  <div className="text-ink-3 mb-2 text-[12.5px]">飞书 · 会映会议助手 代 {personById(cur.meeting.publisher).name} 发来一张卡片</div>
                  <FeishuCard meeting={cur.meeting.id} pid={as} />
                </div>
                <aside className="flex flex-col gap-4">
                  <SourceTimeline meetingId={cur.meeting.id} pid={as} />
                  <WhyBox meetingId={cur.meeting.id} pid={as} />
                </aside>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}

/** 这份简报里每条的原话，按录像时间排，点一下回到那一秒 */
function SourceTimeline({ meetingId, pid }: { meetingId: string; pid: PersonId }) {
  const m = meetingById(meetingId)!
  const ids = m.publisher === pid ? m.items.map(i => i.id) : m.routes.filter(r => r.person === pid).map(r => r.item)
  const items = [...new Set(ids)].map(id => m.items.find(i => i.id === id)!).sort((a, b) => quoteSpan(a).t0 - quoteSpan(b).t0)
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-2"><Kb name="hourglass" size={20} /><b className="text-[14px]">原话在录像里的位置</b></div>
      <div className="relative mt-3 pl-4">
        <span className="bg-border absolute top-1 bottom-1 left-[5px] w-px" />
        {items.map(it => {
          const { t0, seg } = quoteSpan(it)
          const vis = visibility(it, pid)
          return (
            <button key={it.id} disabled={vis !== 'full'} onClick={() => goSource(m.id, Math.max(0, t0 - 0.4), it.id)} className="group relative mb-3 block w-full text-left last:mb-0 disabled:cursor-not-allowed">
              <span className="bg-primary absolute top-1.5 -left-[14px] size-2.5 rounded-full border-2 border-white shadow-[0_0_0_1px_#C9D8FF]" />
              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-primary font-mono">{mmss(t0)}</span>
                <TypePill item={it} />
                <span className="text-ink-3">{personById(seg.speaker).name}</span>
              </div>
              <div className="text-ink-2 group-hover:text-ink mt-0.5 text-[13px] leading-snug">
                {vis === 'full' ? <>“{it.quote}” <Play size={10} className="text-primary ml-0.5 inline" fill="currentColor" /></> : <span className="inline-flex items-center gap-1"><Lock size={12} /> 原话受限</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WhyBox({ meetingId, pid }: { meetingId: string; pid: PersonId }) {
  const m = meetingById(meetingId)!
  const reasons = [...new Set(m.routes.filter(r => r.person === pid).flatMap(r => r.reasons))]
  const p = personById(pid)
  return (
    <div className="rounded-2xl border bg-[#FAFAF8] p-4 text-[13px]">
      <div className="flex items-center gap-2"><Kb name="route" size={20} /><b className="text-[14px]">为什么是这几条</b></div>
      <p className="text-ink-2 mt-2 leading-relaxed">路由官对照 {p.name} 的关注档案：负责 {p.profile.owns.join('、') || '—'}；依赖 {p.profile.dependsOn.join('、') || '—'}；订阅 {p.profile.interests.join('、') || '—'}。</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {m.publisher === pid ? <span className="rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[12px] text-[#3730A3]">发布者：看全部</span>
          : reasons.length ? reasons.map(r => <span key={r} className={cn('rounded-full px-2 py-0.5 text-[12px]', r === 'R4' ? 'bg-ink text-white' : 'bg-white text-ink-2 border')}>{r} {REASONS[r]}</span>)
          : <span className="text-ink-3">没有命中，不打扰</span>}
      </div>
    </div>
  )
}
