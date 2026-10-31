// 每人 30 秒 · 风格样片：同一个人、同一场会、同一份分镜，四种风格并排同步播放；也可以单看一种。
import { useState } from 'react'
import { Grid2x2, Square } from 'lucide-react'
import { ME, RANKS, STAFF, personById, type PersonId } from '@/data/model'
import { RUN_ID } from '@/data/run'
import { go, useRoute } from '@/lib/router'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/shell/TopBar'
import { Face, RankTag } from '@/components/common/bits'
import { ViewSwitch } from '@/components/common/ViewSwitch'
import { REEL_STYLES, defaultStyle, reelSpec, type ReelStyle } from '@/components/reel/spec'
import { Stage, useReelClock } from '@/components/reel/kit'
import { ReelFrame, ReelPlayer, Scrubber } from '@/components/reel/Player'

/** 只有画面、铺满窗口：录屏导出、单帧截图用（#/reel?frame&s=pop&t=12） */
export function ReelFrameOnly() {
  const route = useRoute()
  const as = (route.query.get('as') as PersonId | null) ?? ME
  const style = (route.query.get('s') as ReelStyle | null) ?? defaultStyle(as)
  const at = route.query.get('t')
  const clock = useReelClock({ autoPlay: true, loop: true, start: at ? Number(at) : undefined })
  return (
    <div className="grid h-svh place-items-center bg-black">
      <div className="w-full" style={{ maxWidth: 'calc(100svh * 16 / 9)' }}>
        <Stage onClick={clock.toggle}><ReelFrame spec={reelSpec(as, RUN_ID)} style={style} t={clock.t} /></Stage>
      </div>
    </div>
  )
}

export function Reels() {
  const route = useRoute()
  const as = (route.query.get('as') as PersonId | null) ?? ME
  const mode = route.query.get('v') === 'one' ? 'one' : 'grid'
  const [style, setStyle] = useState<ReelStyle>(() => (route.query.get('s') as ReelStyle | null) ?? defaultStyle(as))
  const at = route.query.get('t')
  const clock = useReelClock({ autoPlay: true, loop: true, start: at != null && !Number.isNaN(Number(at)) ? Number(at) : undefined })
  const spec = reelSpec(as, RUN_ID)
  const me = personById(as)
  const link = (q: Record<string, string | undefined>) => go('/reel', { as: as === ME ? undefined : as, v: mode === 'one' ? 'one' : undefined, ...q })

  return (
    <>
      <TopBar crumbs={[{ label: '与我有关', to: '/' }, { label: '每人 30 秒 · 风格样片' }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-6 py-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-[24px] font-semibold tracking-tight">{me.name}的 30 秒 <RankTag p={me} /></h1>
              <p className="text-ink-3 mt-1.5 max-w-[640px] text-[13.5px] leading-relaxed">
                {spec.meeting.title}一共 {spec.total} 条，和{as === ME ? '你' : me.name}有关的 {spec.kept.length} 条。同一份分镜（片头 → 筛选 → 逐条 → 接下来 → 收尾），只换风格；画面全部由代码按时间算出来。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-full bg-[#F2F3F5] p-1">
              {STAFF.map(p => (
                <button key={p.id} onClick={() => { link({ as: p.id === ME ? undefined : p.id }); clock.seek(0); clock.play() }} className="relative rounded-full p-0.5 transition-transform hover:-translate-y-px" title={`${p.name} · ${RANKS[p.rank].level} ${RANKS[p.rank].label} · ${p.role}`}>
                  {as === p.id && <span className="absolute inset-0 rounded-full shadow-[0_0_0_2px_#17171A]" />}
                  <Face p={p} size={28} />
                </button>
              ))}
            </div>
          </header>

          <ViewSwitch
            id="reel-view"
            value={mode}
            items={[
              { k: 'grid', label: '四种并排', icon: Grid2x2, hint: '同一时刻、四种风格，一眼比出差别', onClick: () => link({ v: undefined }) },
              { k: 'one', label: '单看一种', icon: Square, hint: '大图看细节，可拖进度条逐幕看', onClick: () => link({ v: 'one' }) },
            ]}
          />

          {mode === 'grid' ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {REEL_STYLES.map(st => (
                  <div key={st.id} className="flex flex-col gap-2">
                    <ReelPlayer spec={spec} style={st.id} clock={clock} controls={false} />
                    <div className="flex items-baseline gap-2 px-1">
                      <b className="text-[14.5px]">{st.label}</b>
                      <span className="text-ink-3 text-[12.5px]">{st.hint}</span>
                      <button className="text-ink-3 hover:text-ink ml-auto text-[12.5px]" onClick={() => { setStyle(st.id); link({ v: 'one', s: st.id }) }}>放大看 →</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sg-card sticky bottom-3 z-10 rounded-2xl"><Scrubber clock={clock} dark={false} /></div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {REEL_STYLES.map(st => (
                  <button key={st.id} onClick={() => setStyle(st.id)} className={cn('rounded-full px-3.5 py-1.5 text-[13px] transition-colors', style === st.id ? 'bg-ink font-medium text-white' : 'sg-raised text-ink-2 hover:text-ink')}>
                    {st.label}
                  </button>
                ))}
                <span className="text-ink-3 self-center text-[12.5px]">{REEL_STYLES.find(x => x.id === style)!.hint}</span>
              </div>
              <ReelPlayer spec={spec} style={style} clock={clock} className="mx-auto w-full max-w-[1040px]" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
