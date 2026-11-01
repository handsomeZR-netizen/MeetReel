// 风格二：手绘手账。点阵本子、钢笔字一笔笔写出来、红笔圈画、荧光笔划重点、拍立得和和纸胶带。
// 筛选是一张手写清单：20 行里 17 行被划掉，3 行被荧光笔涂上、打勾。
import type { CSSProperties, ReactNode } from 'react'
import { ACT, beatWindow, tc, weekdayShort, type ReelSpec } from './spec'
import { FONT, Layer, PaperGrain, RoughT, Vignette, actLife, avatarSrc, clamp, ease, lerp, life, prog, writeIn } from './kit'
import { L, monthName } from '@/lib/i18n'

const NAVY = '#22304F'
const MUTED = '#5B6476'
const RED = '#E5484D'
const HL = 'rgb(255 214 64 / 72%)'

export function SketchReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: FONT.hand, color: NAVY,
      background: 'radial-gradient(circle, #D3C9B4 1.3px, transparent 1.7px) 16px 16px / 32px 32px, linear-gradient(170deg, #FCF9F1, #F5EEDF)',
    }}>
      <div style={{ position: 'absolute', left: 104, top: 0, bottom: 0, width: 2, background: 'rgb(229 72 77 / 28%)' }} />
      <Intro s={s} t={t} />
      <Filter s={s} t={t} />
      <Items s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
      <PaperGrain opacity={0.32} />
      <Vignette strength={0.22} color="110 80 30" />
    </div>
  )
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width={1280} height={720} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>{children}</svg>
)

/** 和纸胶带 */
function Tape({ x, y, w = 130, rot = -6, hue = 'pink' }: { x: number; y: number; w?: number; rot?: number; hue?: 'pink' | 'mint' | 'blue' }) {
  const c = { pink: ['255 150 170', '255 200 210'], mint: ['120 205 170', '180 235 210'], blue: ['130 170 240', '190 210 250'] }[hue]
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: 30, transform: `rotate(${rot}deg)`,
      background: `repeating-linear-gradient(45deg, rgb(${c[0]} / 62%) 0 9px, rgb(${c[1]} / 62%) 9px 18px)`,
      clipPath: 'polygon(0 8%, 4% 0, 8% 10%, 12% 0, 100% 0, 97% 12%, 100% 25%, 96% 40%, 100% 55%, 96% 70%, 100% 85%, 97% 100%, 0 100%, 3% 85%, 0 70%, 4% 55%, 0 40%, 4% 25%)',
      boxShadow: '0 1px 2px rgb(0 0 0 / 6%)',
    }} />
  )
}

/** 便利贴：渐变纸面、右下角微翘的阴影 */
function Sticky({ x, y, w, h, rot = 0, color = '#FFE98A', children, style }: { x: number; y: number; w: number; h: number; rot?: number; color?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`, ...style }}>
      <div style={{ position: 'absolute', right: 10, bottom: 4, width: '60%', height: 30, background: 'rgb(90 60 20 / 30%)', filter: 'blur(10px)', transform: 'rotate(3deg)' }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(172deg, color-mix(in srgb, ${color} 70%, #fff), ${color} 60%, color-mix(in srgb, ${color} 88%, #8a6a20))`, boxShadow: '0 1px 1px rgb(0 0 0 / 6%), 0 18px 28px -18px rgb(80 60 20 / 55%)', borderRadius: '2px 2px 6px 2px' }}>{children}</div>
    </div>
  )
}

function Intro({ s, t }: { s: ReelSpec; t: number }) {
  const o = actLife(t, 'intro', 0.2, 0.5)
  const m = s.meeting
  return (
    <Layer o={o} style={{ transform: `scale(${lerp(1, 1.03, prog(t, 0, 3.5))})`, transformOrigin: '30% 40%' }}>
      <Tape x={40} y={36} rot={-9} w={150} />
      <div style={{ position: 'absolute', right: 120, top: 62, fontSize: 30, color: MUTED, ...writeIn(prog(t, 0.2, 0.7)) }}>{m.date.slice(5).replace('-', ' / ')} · {L('周', '')}{weekdayShort(m.date)}</div>
      <div style={{ position: 'absolute', left: 160, top: 196, fontSize: 124, fontWeight: 700, lineHeight: 1.2, ...writeIn(ease.inOut(prog(t, 0.25, 1.5))) }}>{L(`${s.person.name}的 30 秒`, `${s.person.name}’s 30 sec`)}</div>
      <div style={{ position: 'absolute', left: 166, top: 420, fontSize: 38, ...writeIn(prog(t, 1.5, 2.2)) }}>{m.title}</div>
      <div style={{ position: 'absolute', left: 166, top: 478, fontSize: 28, color: MUTED, ...writeIn(prog(t, 2.0, 2.8)) }}>{L(`会映替你看完了 ${Math.floor(m.duration / 60)} 分 ${m.duration % 60} 秒，只留下和你有关的。`, `MeetReel watched all ${Math.floor(m.duration / 60)} min ${m.duration % 60} s and kept only what’s yours.`)}</div>
      <Svg>
        <RoughT shape={{ kind: 'path', d: 'M160 372 C 360 384, 660 360, 990 368' }} opts={{ stroke: RED, strokeWidth: 5, roughness: 1.2 }} p={prog(t, 1.3, 1.9)} seed={3} />
        <RoughT shape={{ kind: 'path', d: 'M168 386 C 420 394, 700 380, 930 384' }} opts={{ stroke: RED, strokeWidth: 3, roughness: 1.2 }} p={prog(t, 1.6, 2.1)} seed={4} />
        <RoughT shape={{ kind: 'path', d: 'M1090 230 l14 32 l34 4 l-26 22 l9 34 l-31 -18 l-30 18 l9 -34 l-26 -22 l34 -4 z' }} opts={{ stroke: '#F08C00', strokeWidth: 3, fill: 'rgb(255 212 59 / 70%)', fillStyle: 'hachure', hachureGap: 6 }} p={prog(t, 2.2, 2.8)} seed={5} />
        <RoughT shape={{ kind: 'path', d: 'M1040 330 q -30 40 -80 28' }} opts={{ stroke: NAVY, strokeWidth: 2.5 }} p={prog(t, 2.6, 3.0)} seed={6} />
      </Svg>
    </Layer>
  )
}

function Filter({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.filter
  const o = actLife(t, 'filter', 0.35, 0.5)
  if (o <= 0) return null
  const n = s.kept.length
  let k = 0
  const rows = s.meeting.items.map((it, i) => {
    const col = i < 10 ? 0 : 1
    const x = col ? 690 : 170, y = 168 + (i % 10) * 47
    const kept = s.kept.indexOf(it.id)
    const w = Math.min(440, it.title.length * 22 + 8)
    const wp = prog(t, A + 0.2 + i * 0.055, A + 0.55 + i * 0.055)
    const kk = kept < 0 ? k++ : -1
    return { it, i, x, y, w, kept, wp, kk }
  })
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 160, top: 64, fontSize: 48, fontWeight: 700, ...writeIn(prog(t, A, A + 0.6)) }}>{L(`这场直播 · ${s.total} 条`, `This stream · ${s.total} items`)}</div>
      <div style={{ position: 'absolute', left: 560, top: 70, fontSize: 44, fontWeight: 700, color: RED, ...writeIn(prog(t, A + 3.0, A + 3.7)) }}>{L(`→ 和我有关的 ${n} 条`, `→ ${n} for me`)}</div>
      {rows.map(r => {
        const hl = r.kept >= 0 ? ease.inOut(prog(t, A + 1.7 + r.kept * 0.2, A + 2.2 + r.kept * 0.2)) : 0
        const dim = r.kept < 0 ? prog(t, A + 1.6 + r.kk * 0.07, A + 1.9 + r.kk * 0.07) : 0
        return (
          <div key={r.it.id} style={{ position: 'absolute', left: r.x + 40, top: r.y, maxWidth: 440, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 23, lineHeight: '32px', whiteSpace: 'nowrap', ...writeIn(r.wp) }}>
            {hl > 0 && <div style={{ position: 'absolute', left: -4, top: 6, height: 24, width: (r.w + 8) * hl, background: HL, mixBlendMode: 'multiply', borderRadius: 3, transform: 'skewX(-8deg)' }} />}
            <span style={{ position: 'relative', opacity: lerp(1, 0.38, dim), fontWeight: r.kept >= 0 && hl > 0.5 ? 700 : 400 }}>{r.it.title}</span>
          </div>
        )
      })}
      <Svg>
        {rows.map(r => (
          <g key={r.it.id}>
            <RoughT shape={{ kind: 'rect', x: r.x, y: r.y + 6, w: 22, h: 22 }} opts={{ stroke: NAVY, strokeWidth: 1.8, roughness: 1 }} p={r.wp * 2} seed={r.i + 11} />
            {r.kept < 0
              ? <RoughT shape={{ kind: 'line', x1: r.x + 36, y1: r.y + 18, x2: r.x + 44 + r.w, y2: r.y + 15 }} opts={{ stroke: '#6E7688', strokeWidth: 2.4, roughness: 0.8 }} p={prog(t, A + 1.5 + r.kk * 0.07, A + 1.8 + r.kk * 0.07)} seed={r.i + 31} />
              : <>
                <RoughT shape={{ kind: 'path', d: `M${r.x + 3} ${r.y + 16} l7 9 l16 -20` }} opts={{ stroke: RED, strokeWidth: 3.4, roughness: 0.6 }} p={prog(t, A + 2.0 + r.kept * 0.2, A + 2.3 + r.kept * 0.2)} seed={r.i + 51} />
                <RoughT shape={{ kind: 'ellipse', x: r.x - 38, y: r.y + 17, w: 26, h: 24 }} opts={{ stroke: RED, strokeWidth: 2.4 }} p={prog(t, A + 2.3 + r.kept * 0.2, A + 2.6 + r.kept * 0.2)} seed={r.i + 71} />
              </>}
          </g>
        ))}
      </Svg>
      <div style={{ position: 'absolute', right: 120, bottom: 34, fontSize: 28, color: RED, transform: 'rotate(-3deg)', ...writeIn(prog(t, A + 3.6, A + 4.4)) }}>{n ? L(`划掉的 ${s.total - n} 条，不用你操心 ✓`, `${s.total - n} crossed out — not your worry ✓`) : L('一条都不用你看 ✓', 'Nothing to read ✓')}</div>
    </Layer>
  )
}

const NOTE = ['#FFE98A', '#FFD3DF', '#CDEBFF', '#D4F2D9']

function Items({ s, t }: { s: ReelSpec; t: number }) {
  const [A, B] = ACT.items
  if (t < A - 0.01 || t > B + 0.01) return null
  if (!s.beats.length) {
    return (
      <Layer o={life(t, A, B, 0.5, 0.5)}>
        <Sticky x={330} y={170} w={620} h={330} rot={-2} color="#D4F2D9">
          <div style={{ padding: '80px 56px', fontSize: 56, fontWeight: 700, lineHeight: 1.35 }}>{L('这场会，', 'This meeting:')}<br />{L('没有要你看的。', 'nothing for you.')}</div>
        </Sticky>
        <Tape x={570} y={150} hue="mint" />
      </Layer>
    )
  }
  const n = s.beats.length
  return (
    <>
      {s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, n)
        const o = life(t, a, z, 0.35, 0.4)
        if (o <= 0) return null
        const e = b.entry
        const sl = ease.out(prog(t, a, a + 0.6))
        const pol = ease.back(prog(t, a + 0.35, a + 0.85))
        const hl = ease.inOut(prog(t, a + 1.6, a + 2.2))
        const rot = [-1.6, 1.2, -0.8][i % 3]
        const len = e.item.title.length
        return (
          <Layer key={e.item.id} o={o}>
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${lerp(70, 0, sl)}px)`, opacity: clamp(sl * 1.5) }}>
              <Sticky x={110} y={112} w={650} h={470} rot={rot} color={NOTE[i % NOTE.length]}>
                <div style={{ padding: '46px 50px 0' }}>
                  <div style={{ fontSize: 27, color: RED, fontWeight: 700 }}>{L(`第 ${i + 1} 条`, `#${i + 1}`)} · {e.tier === 'must' ? L('必读', 'Must-read') : L('建议看', 'Suggested')}{i === n - 1 && s.more ? <span style={{ color: MUTED, fontWeight: 400, fontSize: 22 }}>{L(`（卡片里还有 ${s.more} 条）`, ` (${s.more} more in the card)`)}</span> : null}</div>
                  <div style={{ fontSize: len > 16 ? 42 : 50, fontWeight: 700, lineHeight: 1.25, marginTop: 16 }}>{e.item.title}</div>
                  <div style={{ fontSize: 26, lineHeight: 1.65, marginTop: 22, color: '#3A4560' }}>{e.forYou}</div>
                </div>
              </Sticky>
              <Tape x={370} y={96} rot={-4 + i * 3} hue={(['pink', 'blue', 'mint'] as const)[i % 3]} />
            </div>
            <div style={{ position: 'absolute', left: 840, top: 96, width: 280, height: 326, transform: `rotate(${3 - i * 2}deg) scale(${lerp(1.15, 1, pol)})`, opacity: clamp(pol * 2), background: '#FFFEFA', boxShadow: '0 2px 3px rgb(0 0 0 / 8%), 0 20px 30px -16px rgb(60 40 10 / 50%)', padding: '18px 18px 0' }}>
              <img src={avatarSrc(b.speaker.id)} alt="" style={{ width: 244, height: 230, objectFit: 'cover', display: 'block', filter: 'saturate(.85) contrast(1.05) sepia(.08)' }} />
              <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginTop: 10 }}>{b.speaker.name} <span style={{ fontSize: 20, color: MUTED, fontWeight: 400 }}>{tc(b.at)}</span></div>
              <div style={{ position: 'absolute', right: 10, bottom: 6, fontSize: 13, color: '#A39C8E' }}>{L('示意头像', 'illustrative avatar')}</div>
            </div>
            <Tape x={920} y={80} w={110} rot={8} hue="blue" />
            <div style={{ position: 'absolute', left: 810, top: 462, width: 400, fontSize: 30, lineHeight: 1.45, ...writeIn(ease.inOut(prog(t, a + 0.8, a + 2.1))) }}>
              <span style={{ color: RED, fontSize: 44, lineHeight: 0, verticalAlign: '-0.2em', marginRight: 4 }}>“</span>{e.item.quote}<span style={{ color: RED, fontSize: 44, lineHeight: 0, verticalAlign: '-0.2em', marginLeft: 2 }}>”</span>
            </div>
            <div style={{ position: 'absolute', left: 134, top: 620, fontSize: 26, opacity: clamp(prog(t, a + 1.3, a + 1.6)) }}>
              <span style={{ color: MUTED }}>{L('为什么给我：', 'Why me: ')}</span>
              <span style={{ backgroundImage: `linear-gradient(transparent 50%, ${HL} 50%)`, backgroundSize: `${hl * 100}% 100%`, backgroundRepeat: 'no-repeat', padding: '0 4px' }}>{e.why}</span>
            </div>
          </Layer>
        )
      })}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.35, 0.45)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const drop = ease.back(prog(t, A + 0.05, A + 0.6))
  const slap = ease.back(prog(t, A + 1.8, A + 2.3))
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 170, top: 118, width: 360, height: 450, transform: `translateY(${lerp(-60, 0, drop)}px) rotate(-2.5deg)`, opacity: clamp(drop * 2) }}>
        <div style={{ position: 'absolute', inset: 0, background: '#FFFEFA', borderRadius: 10, boxShadow: '0 2px 3px rgb(0 0 0 / 8%), 0 24px 34px -18px rgb(60 40 10 / 55%)', overflow: 'hidden' }}>
          <div style={{ height: 96, background: RED, color: '#fff', fontSize: 48, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{nx.date ? L(`${Number(nx.date.slice(5, 7))} 月`, monthName(Number(nx.date.slice(5, 7)))) : L('截止', 'Due')}</div>
          {nx.date ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 230, fontWeight: 700, lineHeight: 1.15 }}>{Number(nx.date.slice(8))}</div>
              <div style={{ fontSize: 38, color: MUTED, marginTop: -6 }}>{L('周', '')}{weekdayShort(nx.date)}</div>
            </div>
          ) : <div style={{ fontSize: 56, fontWeight: 700, textAlign: 'center', padding: '110px 24px 0', lineHeight: 1.3 }}>{nx.dueLabel}</div>}
        </div>
        {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ position: 'absolute', top: -14, left: 46 + i * 62, width: 14, height: 30, borderRadius: 7, background: 'linear-gradient(90deg, #8E96A8, #D8DCE4, #8E96A8)' }} />)}
      </div>
      <Svg>
        {nx.date && <RoughT shape={{ kind: 'ellipse', x: 352, y: 330, w: 210, h: 200 }} opts={{ stroke: RED, strokeWidth: 4.5, roughness: 1.6 }} p={prog(t, A + 0.9, A + 1.5)} seed={131} />}
      </Svg>
      <div style={{ position: 'absolute', left: 610, top: 128, fontSize: 32, color: RED, fontWeight: 700, ...writeIn(prog(t, A + 0.3, A + 0.7)) }}>{L('接下来 →', 'Next up →')}</div>
      <div style={{ position: 'absolute', left: 610, top: 186, width: 560, fontSize: 38, fontWeight: 700, lineHeight: 1.45, ...writeIn(ease.inOut(prog(t, A + 0.6, A + 1.7))) }}>{nx.link}</div>
      <div style={{ position: 'absolute', inset: 0, opacity: clamp(slap * 2), transform: `scale(${lerp(1.15, 1, slap)})`, transformOrigin: '880px 470px' }}>
        <Sticky x={630} y={392} w={500} h={160} rot={1.6} color="#D4F2D9">
          <div style={{ padding: '28px 30px' }}>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.3 }}>☐ {nx.item.title}</div>
            <div style={{ fontSize: 22, color: MUTED, marginTop: 10 }}>{nx.meeting.title.replace(/ · .*/, '')} · {nx.dueLabel}</div>
          </div>
        </Sticky>
        <Tape x={830} y={378} w={100} rot={-5} hue="mint" />
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(ease.out(prog(t, A, A + 0.4)))
  if (o <= 0) return null
  const btns = L(['确认', '追问', '不是我'], ['Confirm', 'Ask', 'Not me'])
  const bx = [360, 590, 820]
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 128, display: 'flex', justifyContent: 'center' }}>
        <div style={{ fontSize: 132, fontWeight: 700, lineHeight: 1.2, ...writeIn(ease.inOut(prog(t, A + 0.1, A + 1.1))) }}>{L(`省下 ${s.savedMin} 分钟！`, `${s.savedMin} min saved!`)}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center' }}>
        <div style={{ fontSize: 30, color: MUTED, ...writeIn(prog(t, A + 0.9, A + 1.6)) }}>{L(`${s.total - s.kept.length} 条划掉了；有关的原话，随时点开回放。`, `${s.total - s.kept.length} crossed out; tap any of your quotes to replay.`)}</div>
      </div>
      {btns.map((b, i) => (
        <div key={b} style={{ position: 'absolute', left: bx[i] + 50, top: 446, fontSize: 42, fontWeight: 700, ...writeIn(prog(t, A + 1.2 + i * 0.15, A + 1.5 + i * 0.15)) }}>{b}</div>
      ))}
      <Svg>
        <RoughT shape={{ kind: 'path', d: 'M330 300 C 520 312, 780 290, 960 304' }} opts={{ stroke: RED, strokeWidth: 5 }} p={prog(t, A + 1.0, A + 1.5)} seed={141} />
        {btns.map((_, i) => <RoughT key={i} shape={{ kind: 'rect', x: bx[i], y: 456, w: 34, h: 34 }} opts={{ stroke: NAVY, strokeWidth: 2.4 }} p={prog(t, A + 1.1 + i * 0.15, A + 1.4 + i * 0.15)} seed={i + 151} />)}
        <RoughT shape={{ kind: 'path', d: `M${bx[0] + 4} 470 l10 14 l26 -34` }} opts={{ stroke: '#2F9E44', strokeWidth: 4.5, roughness: 0.6 }} p={prog(t, A + 1.9, A + 2.2)} seed={161} />
        <RoughT shape={{ kind: 'path', d: 'M1000 610 c -14 -22, -44 -6, -26 16 l 26 24 l 26 -24 c 18 -22, -12 -38, -26 -16 z' }} opts={{ stroke: RED, strokeWidth: 2.5, fill: 'rgb(229 72 77 / 50%)', fillStyle: 'hachure', hachureGap: 5 }} p={prog(t, A + 2.4, A + 2.9)} seed={171} />
      </Svg>
      <div style={{ position: 'absolute', right: 300, bottom: 70, fontSize: 34, transform: 'rotate(-3deg)', ...writeIn(prog(t, A + 2.0, A + 2.8)) }}>{L('—— 会映 MeetReel', '— MeetReel')}</div>
    </Layer>
  )
}
