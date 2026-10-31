// 风格一：Apple 发布会。纯黑底、极光一样慢慢流动的光、一枚彩色光环贯穿全片；字少而大，居中，去模糊入场。
// 光环在片头画出来 → 筛选时变成 20 个点的表盘，17 个暗下去飘走、3 个亮起来 → 收尾时再回来，首尾呼应。
import type { CSSProperties } from 'react'
import { ACT, beatWindow, tc, weekdayShort, type ReelSpec } from './spec'
import { FONT, Grain, Layer, Vignette, actLife, avatarSrc, clamp, count, ease, lerp, life, prog, rise } from './kit'

const GRAY = '#86868B'
const SOFT = '#A1A1A6'
const RING = 'conic-gradient(from VAR, #FF6EC4, #A67CFF, #5AC8FA, #6EF0C2, #FFD36E, #FF8A5C, #FF6EC4)'
const GRAD = (a: string, b: string, c?: string): CSSProperties => ({
  backgroundImage: `linear-gradient(100deg, ${a}, ${b}${c ? `, ${c}` : ''})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
})
const WHITE = GRAD('#FFFFFF', '#E8E2FF', '#FFD9EC')

// 每一幕的主色相：极光跟着换
const HUES: [number, number][] = [[0, 265], [3.5, 250], [9.5, 285], [13.7, 215], [17.9, 330], [22, 22], [26.5, 275]]
const hueAt = (t: number) => {
  let h = HUES[0][1]
  for (let i = 0; i < HUES.length; i++) {
    const [s, v] = HUES[i]
    const prev = HUES[i - 1]?.[1] ?? v
    if (t >= s) h = lerp(prev, v, ease.inOut(prog(t, s, s + 1.2)))
  }
  return h
}

export function AppleReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', fontFamily: FONT.sans, color: '#F5F5F7', overflow: 'hidden', letterSpacing: '-0.01em' }}>
      <Aurora t={t} />
      <Ring s={s} t={t} />
      <Intro s={s} t={t} />
      <Filter s={s} t={t} />
      <Items s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
      <Vignette strength={0.7} />
      <Grain t={t} opacity={0.09} />
    </div>
  )
}

function Aurora({ t }: { t: number }) {
  const h = hueAt(t)
  const blob = (x: number, y: number, w: number, hh: number, hue: number, a: number) =>
    `radial-gradient(ellipse ${w}% ${hh}% at ${x}% ${y}%, hsl(${hue} 85% 58% / ${a}), transparent 70%)`
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: [
        blob(50 + Math.sin(t / 4) * 14, 105 + Math.cos(t / 5) * 6, 70, 55, h, 0.42),
        blob(18 + Math.cos(t / 6) * 8, 92, 40, 40, h + 45, 0.22),
        blob(84 + Math.sin(t / 7) * 6, 96, 38, 38, h - 50, 0.2),
      ].join(','),
    }} />
  )
}

/** 彩色光环：mask 挖成一圈，再叠一层模糊的当辉光；draw 控制画到多少度 */
function Halo({ cx, cy, r, w = 3, draw = 1, spin = 0, glow = 1, o = 1 }: { cx: number; cy: number; r: number; w?: number; draw?: number; spin?: number; glow?: number; o?: number }) {
  if (o <= 0.001 || draw <= 0) return null
  const ring: CSSProperties = {
    position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%',
    background: RING.replace('VAR', `${spin}deg`),
    WebkitMaskImage: `radial-gradient(circle, transparent ${r - w - 0.5}px, #000 ${r - w}px, #000 ${r - 0.5}px, transparent ${r}px), conic-gradient(from -90deg, #000 ${draw * 360}deg, transparent ${draw * 360 + 0.5}deg)`,
    WebkitMaskComposite: 'source-in', maskComposite: 'intersect',
  }
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ ...ring, filter: `blur(${18 * glow}px)`, opacity: 0.9 * glow, transform: 'scale(1.02)' }} />
      <div style={{ ...ring, filter: `blur(${48 * glow}px)`, opacity: 0.55 * glow }} />
      <div style={ring} />
    </div>
  )
}

/** 贯穿全片的光环：片头画出来，筛选时变暗当表盘，逐条时退到远处，收尾时回来 */
function Ring({ s, t }: { s: ReelSpec; t: number }) {
  const [F] = ACT.filter
  const [O] = ACT.outro
  const draw = ease.inOut(prog(t, 0.15, 1.6))
  const spin = t * 18
  // 片头 r=200 → 筛选 r=230（变暗，让点当主角）→ 逐条前淡出 → 收尾回来 r=300
  const toDial = ease.inOut(prog(t, F - 0.3, F + 0.6))
  const fadeOut = 1 - ease.in(prog(t, F + 5.6, F + 6.1))
  const back = ease.out(prog(t, O, O + 1.4))
  const r = back > 0 ? lerp(240, 300, back) : lerp(200, 230, toDial)
  const o = back > 0 ? back * 0.8 : fadeOut * lerp(1, 0.32, toDial)
  const cy = back > 0 ? 330 : lerp(320, 360, toDial)
  void s
  return <Halo cx={640} cy={cy} r={r} w={back > 0 ? 2 : 3} draw={back > 0 ? back : draw} spin={spin} glow={back > 0 ? 1.2 : lerp(1, 0.5, toDial)} o={o} />
}

function Intro({ s, t }: { s: ReelSpec; t: number }) {
  const o = actLife(t, 'intro', 0.2, 0.55)
  const name = ease.out(prog(t, 0.7, 1.7))
  const line = ease.out(prog(t, 1.5, 2.3))
  const m = s.meeting
  return (
    <Layer o={o} style={{ transform: `scale(${lerp(1, 1.05, prog(t, 0, 3.5))})` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 262, textAlign: 'center', ...rise(name, 18, 16) }}>
        <div style={{ fontSize: 17, color: GRAY, letterSpacing: '0.32em', fontWeight: 500 }}>你 的 30 秒</div>
        <div style={{ ...WHITE, fontSize: 88, fontWeight: 600, marginTop: 6, lineHeight: 1.15 }}>{s.person.name}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 572, textAlign: 'center', ...rise(line, 14, 8) }}>
        <div style={{ fontSize: 30, fontWeight: 500, color: '#E5E5EA' }}>这场会，你只需要看 30 秒。</div>
        <div style={{ fontSize: 17, color: GRAY, marginTop: 12, letterSpacing: '0.04em' }}>{m.title} · {Number(m.date.slice(5, 7))} 月 {Number(m.date.slice(8))} 日 · {Math.floor(m.duration / 60)} 分 {m.duration % 60} 秒</div>
      </div>
    </Layer>
  )
}

const DOT_COLORS = ['#FF6EC4', '#5AC8FA', '#FFD36E', '#6EF0C2', '#A67CFF', '#FF8A5C']

function Filter({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.filter
  const o = actLife(t, 'filter', 0.35, 0.55)
  if (o <= 0) return null
  const items = s.meeting.items
  const n = s.kept.length
  const R = 230, cx = 640, cy = 360
  const phase = t < A + 1.5 ? 0 : t < A + 3.1 ? 1 : 2
  const num = count(t, A + 1.5, A + 3.1, s.total, n)
  const lab = ease.out(prog(t, A + 3.6, A + 4.3))
  let k = 0
  return (
    <Layer o={o} style={{ transform: `scale(${lerp(1, 1.06, prog(t, A, A + 6))})` }}>
      {items.map((it, i) => {
        const a0 = -Math.PI / 2 + (i / items.length) * Math.PI * 2
        const kept = s.kept.indexOf(it.id)
        const ap = ease.out(prog(t, A + 0.15 + i * 0.04, A + 0.55 + i * 0.04))
        let a = a0, r = R, size = lerp(2, 9, ap), op = ap, color = '#F5F5F7', glow = 0
        if (kept < 0) {
          const d = ease.inOut(prog(t, A + 1.5 + k * 0.06, A + 2.4 + k * 0.06))
          k++
          r = lerp(R, R + 70, d)
          size = lerp(size, 4, d)
          op = ap * lerp(1, 0, ease.in(prog(t, A + 2.2, A + 3.4)))
          color = d > 0.3 ? '#636366' : color
        } else {
          const lit = ease.out(prog(t, A + 1.6, A + 2.4))
          const mv = ease.inOut(prog(t, A + 3.0, A + 3.9))
          a = lerp(a0, -Math.PI / 2 + (kept / n) * Math.PI * 2, mv)
          size = lerp(size, 18, lit)
          color = DOT_COLORS[kept % DOT_COLORS.length]
          glow = lit
        }
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
        return (
          <div key={it.id}>
            <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: color, opacity: op, boxShadow: glow ? `0 0 ${24 * glow}px ${6 * glow}px ${color}88, 0 0 ${60 * glow}px ${color}55` : undefined }} />
            {kept >= 0 && lab > 0 && (() => {
              const right = Math.cos(a) >= -0.01
              const lx = cx + Math.cos(a) * (R + 34), ly = cy + Math.sin(a) * (R + 34)
              const top = Math.sin(a) < -0.9
              return (
                <div style={{
                  position: 'absolute', left: top ? lx - 200 : right ? lx : lx - 400, top: top ? ly - 46 : ly - 14, width: top ? 400 : 400, textAlign: top ? 'center' : right ? 'left' : 'right',
                  fontSize: 20, fontWeight: 500, color: '#F5F5F7', ...rise(lab, 8, 6),
                }}>{it.title}</div>
              )
            })()}
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy - 92, textAlign: 'center' }}>
        <div style={{ ...WHITE, fontSize: 150, fontWeight: 600, lineHeight: 1, fontFamily: FONT.sans, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', ...rise(ease.out(prog(t, A + 0.3, A + 1.0)), 10, 10) }}>{num}</div>
        <div style={{ fontSize: 22, color: SOFT, marginTop: 14, fontWeight: 500 }}>{phase === 0 ? '条要点' : n ? '条与你有关' : '条与你有关'}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 648, textAlign: 'center', fontSize: 20, color: GRAY, opacity: ease.out(prog(t, A + 3.2, A + 3.8)) }}>
        {n ? `其余 ${s.total - n} 条，会映替你挡掉了。` : '这场直播与你无关，没有打扰你。'}
      </div>
    </Layer>
  )
}

function Items({ s, t }: { s: ReelSpec; t: number }) {
  const [A, B] = ACT.items
  if (t < A - 0.01 || t > B + 0.01) return null
  if (!s.beats.length) {
    const p = ease.out(prog(t, A, A + 1))
    return (
      <Layer o={life(t, A, B, 0.6, 0.5)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...WHITE, fontSize: 80, fontWeight: 600, ...rise(p, 20, 14) }}>没有需要你看的。</div>
        <div style={{ fontSize: 26, color: SOFT, marginTop: 22 }}>{s.total} 条都与你无关，会映没有打扰你。</div>
      </Layer>
    )
  }
  const n = s.beats.length
  return (
    <>
      <Layer o={life(t, A, B, 0.6, 0.4)}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 96, display: 'flex', justifyContent: 'center', gap: 14 }}>
          {s.beats.map((b, i) => {
            const [a, z] = beatWindow(i, n)
            const on = t >= a && t < z
            const c = DOT_COLORS[i % DOT_COLORS.length]
            return <span key={b.entry.item.id} style={{ width: on ? 28 : 8, height: 8, borderRadius: 4, background: on ? c : '#48484A', boxShadow: on ? `0 0 16px ${c}` : undefined, transition: 'none' }} />
          })}
        </div>
      </Layer>
      {s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, n)
        const o = life(t, a, z, 0.6, 0.5)
        if (o <= 0) return null
        const e = b.entry
        const p1 = ease.out(prog(t, a + 0.05, a + 0.9))
        const p2 = ease.out(prog(t, a + 0.45, a + 1.25))
        const p3 = ease.out(prog(t, a + 0.9, a + 1.7))
        const q = e.item.quote
        const k = Math.ceil(q.length * prog(t, a + 1.0, a + 2.3))
        const len = e.item.title.length
        const c = DOT_COLORS[i % DOT_COLORS.length]
        return (
          <Layer key={e.item.id} o={o} style={{ transform: `scale(${lerp(1.0, 1.035, prog(t, a, z))})` }}>
            <div style={{ position: 'absolute', left: 120, right: 120, top: 150, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 17, color: SOFT, ...rise(p1, 8, 4) }}>
                <span style={{ padding: '4px 13px', borderRadius: 999, fontWeight: 600, fontSize: 15, ...(e.tier === 'must' ? { background: '#F5F5F7', color: '#000' } : { boxShadow: 'inset 0 0 0 1px #5A5A5E', color: '#D1D1D6' }) }}>{e.tier === 'must' ? '必读' : '建议看'}</span>
                <span>{e.why}</span>
              </div>
              <div style={{ ...GRAD('#FFFFFF', '#F2EEFF', c), fontSize: len > 18 ? 48 : len > 13 ? 56 : 66, fontWeight: 600, lineHeight: 1.2, marginTop: 26, letterSpacing: '-0.02em', ...rise(p1, 26, 14) }}>{e.item.title}</div>
              <div style={{ fontSize: 25, lineHeight: 1.65, color: SOFT, margin: '26px auto 0', maxWidth: 860, ...rise(p2, 16, 8) }}>{e.forYou}</div>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 468, display: 'flex', justifyContent: 'center', ...rise(p3, 14, 6) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 26px 16px 16px', borderRadius: 24, background: 'rgb(255 255 255 / 6%)', boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 9%), inset 0 1px 0 rgb(255 255 255 / 12%)' }}>
                <img src={avatarSrc(b.speaker.id)} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: 'cover' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 23, color: '#fff', fontWeight: 500, minWidth: 260 }}>“{q.slice(0, k)}{k >= q.length ? '”' : ''}</div>
                  <div style={{ fontSize: 14.5, color: GRAY, marginTop: 5 }}>{b.speaker.name} · 原话 <span style={{ fontFamily: FONT.mono }}>{tc(b.at)}</span> · 示意头像</div>
                </div>
              </div>
            </div>
            {i === n - 1 && s.more > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontSize: 16, color: GRAY, opacity: p3 }}>另外 {s.more} 条在卡片里</div>}
          </Layer>
        )
      })}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.55, 0.5)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const p0 = ease.out(prog(t, A, A + 0.8))
  const p1 = ease.out(prog(t, A + 0.35, A + 1.3))
  const p2 = ease.out(prog(t, A + 1.1, A + 1.9))
  const DATE = GRAD('#FFE1B8', '#FF9F6E', '#FF6EA8')
  return (
    <Layer o={o} style={{ transform: `scale(${lerp(1, 1.04, prog(t, A, A + 4.5))})` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontSize: 17, color: GRAY, letterSpacing: '0.34em', fontWeight: 500, ...rise(p0, 8, 4) }}>接 下 来</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', ...rise(p1, 30, 18) }}>
        {nx.date ? (
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ ...DATE, fontSize: 200, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.05em' }}>{Number(nx.date.slice(5, 7))}</span>
            <span style={{ ...DATE, fontSize: 56, fontWeight: 600 }}>月</span>
            <span style={{ ...DATE, fontSize: 200, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.05em', marginLeft: 10 }}>{Number(nx.date.slice(8))}</span>
            <span style={{ ...DATE, fontSize: 56, fontWeight: 600 }}>日</span>
            <span style={{ fontSize: 30, color: SOFT, marginLeft: 22, fontWeight: 500 }}>周{weekdayShort(nx.date)}</span>
          </div>
        ) : <div style={{ ...DATE, fontSize: 120, fontWeight: 600, lineHeight: 1.4 }}>{nx.dueLabel}</div>}
      </div>
      <div style={{ position: 'absolute', left: 140, right: 140, top: 452, textAlign: 'center', ...rise(p2, 16, 8) }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: '#fff' }}>{nx.item.title}</div>
        <div style={{ fontSize: 22, color: SOFT, marginTop: 16, lineHeight: 1.6 }}>{nx.link}</div>
        <div style={{ fontSize: 15, color: GRAY, marginTop: 14 }}>来自 {nx.meeting.title} · {nx.dueLabel}</div>
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(ease.out(prog(t, A, A + 0.6)))
  if (o <= 0) return null
  const p1 = ease.out(prog(t, A + 0.1, A + 1.1))
  const p2 = ease.out(prog(t, A + 0.7, A + 1.4))
  const btn = ['确认', '追问', '不是我']
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 236, textAlign: 'center' }}>
        <div style={{ ...WHITE, fontSize: 118, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, ...rise(p1, 24, 20) }}>省下 {s.savedMin} 分钟。</div>
        <div style={{ fontSize: 24, color: SOFT, marginTop: 22, ...rise(p2, 10, 6) }}>{s.total - s.kept.length} 条与你无关，已经替你挡掉。</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 496, display: 'flex', justifyContent: 'center', gap: 16 }}>
        {btn.map((b, i) => {
          const p = ease.out(prog(t, A + 1.1 + i * 0.12, A + 1.7 + i * 0.12))
          return (
            <span key={b} style={{ padding: '15px 36px', borderRadius: 999, fontSize: 21, fontWeight: 600, ...rise(p, 12, 6), ...(i === 0 ? { background: '#F5F5F7', color: '#000' } : { background: 'rgb(255 255 255 / 8%)', boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 14%)', color: '#F5F5F7' }) }}>{b}</span>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center', fontSize: 15, color: '#6E6E73', letterSpacing: '0.24em', opacity: ease.out(prog(t, A + 1.6, A + 2.3)) }}>会映 MEETREEL</div>
    </Layer>
  )
}
