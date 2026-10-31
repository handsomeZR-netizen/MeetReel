// 风格四：3D 等距。一块浮在暮色里的平台，20 个条目是 20 块方块：与你无关的沉下去变灰，与你有关的浮上来发光。
// 用 CSS 3D 正交投影画（不加透视），平面上的文字标签按同一套投影算出屏幕位置，平着贴上去，保证看得清。
import type { CSSProperties, ReactNode } from 'react'
import { ITEM_TYPES } from '@/data/model'
import { Face } from '@/components/common/bits'
import { ACT, beatWindow, stripDays, tc, weekdayShort, type ReelSpec } from './spec'
import { Layer, actLife, clamp, count, ease, lerp, life, prog } from './kit'

const SANS = '"Inter Variable", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif'
const TILT = 56
const PITCH = 104
const CUBE = 78

const rad = (d: number) => (d * Math.PI) / 180
/** 平台坐标 (x, y, z) → 屏幕偏移，和 CSS 的 rotateX(TILT) rotateZ(phi) 一致 */
function proj(x: number, y: number, z: number, phi: number): [number, number] {
  const p = rad(phi)
  const xr = x * Math.cos(p) - y * Math.sin(p)
  const yr = x * Math.sin(p) + y * Math.cos(p)
  return [xr, yr * Math.cos(rad(TILT)) - z * Math.sin(rad(TILT))]
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.round(Math.min(255, v * f))
  return `rgb(${c(n >> 16)} ${c((n >> 8) & 255)} ${c(n & 255)})`
}

/** 一块方块：顶面 + 看得见的两个侧面；透明度只能加在面上，加在外层会把 3D 拍平 */
function Cube({ x, y, z = 0, w, d = w, h, color, glow = 0, o = 1, children }: { x: number; y: number; z?: number; w: number; d?: number; h: number; color: string; glow?: number; o?: number; children?: ReactNode }) {
  const face: CSSProperties = { position: 'absolute', backfaceVisibility: 'hidden', opacity: o }
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - d / 2, width: w, height: d, transformStyle: 'preserve-3d', transform: `translateZ(${z}px)` }}>
      <div style={{ ...face, left: 0, top: d, width: w, height: h, transformOrigin: 'top', transform: 'rotateX(90deg)', background: shade(color, 0.78) }} />
      <div style={{ ...face, left: 0, top: 0, width: h, height: d, transformOrigin: 'left', transform: 'rotateY(-90deg)', background: shade(color, 0.62) }} />
      <div style={{
        ...face, left: 0, top: 0, width: w, height: d, transform: `translateZ(${h}px)`, background: color, borderRadius: 3,
        boxShadow: glow ? `0 0 ${40 * glow}px ${12 * glow}px rgb(255 236 200 / ${0.55 * glow}), inset 0 0 0 2px rgb(255 255 255 / ${0.6 * glow})` : 'inset 0 0 0 1px rgb(255 255 255 / 25%)',
      }}>{children}</div>
    </div>
  )
}

function World({ cx, cy, phi, children }: { cx: number; cy: number; phi: number; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0, transformStyle: 'preserve-3d', transformOrigin: '0 0', transform: `rotateX(${TILT}deg) rotateZ(${phi}deg)` }}>
      {children}
    </div>
  )
}

/** 贴在平台某点上方的平面标签 */
function Pin({ at, cx, cy, phi, children, style }: { at: [number, number, number]; cx: number; cy: number; phi: number; children: ReactNode; style?: CSSProperties }) {
  const [X, Y] = proj(at[0], at[1], at[2], phi)
  return <div style={{ position: 'absolute', left: cx + X, top: cy + Y, transform: 'translate(-50%, -100%)', ...style }}>{children}</div>
}

export function IsoReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: SANS, color: '#fff', overflow: 'hidden', background: 'linear-gradient(180deg, #221C46 0%, #5B3D78 48%, #E59A9A 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 50% 62%, rgb(255 210 190 / 30%), transparent 70%)' }} />
      <Board s={s} t={t} />
      <Titles s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
    </div>
  )
}

/** 浮上来的方块用亮色，和沉下去的灰块一眼分开 */
const KEPT = ['#FFB86B', '#7CE0B5', '#8FB8FF', '#F79AD3', '#FFD86B', '#B9A6FF']

const cellOf = (i: number) => [((i % 5) - 2) * PITCH, (Math.floor(i / 5) - 1.5) * PITCH] as const

/** 平台和方块：片头升起 → 筛选 → 逐条时当前那块升高；整段持续，只是参数随 t 变 */
function Board({ s, t }: { s: ReelSpec; t: number }) {
  const [F] = ACT.filter
  const [I, IZ] = ACT.items
  const o = Math.min(clamp(prog(t, 0, 0.4)), 1 - prog(t, IZ - 0.4, IZ))
  if (o <= 0) return null
  const rise = ease.out(prog(t, 0.1, 1.6))
  const phi = -45 + Math.sin(t * 0.22) * 7
  const side = ease.inOut(prog(t, I - 0.3, I + 0.6))
  const cx = lerp(640, 410, side), cy = lerp(440, 450, side) + lerp(240, 0, rise)
  const n = s.beats.length
  const beatIdx = s.beats.findIndex((_, i) => { const [a, z] = beatWindow(i, n); return t >= a && t < z })
  let dropK = 0
  const labels: ReactNode[] = []
  const cubes = s.meeting.items.map((it, i) => {
    const [x, y] = cellOf(i)
    const kept = s.kept.indexOf(it.id)
    const ap = ease.back(prog(t, F + 0.05 + i * 0.04, F + 0.5 + i * 0.04))
    let h = 6 + 34 * ap, z = 0, color = '#C9CEE6', glow = 0
    if (kept < 0) {
      const k = dropK++
      const sink = ease.inOut(prog(t, F + 1.5 + k * 0.05, F + 2.2 + k * 0.05))
      h = lerp(h, 4, sink)
      color = sink > 0.5 ? '#8E89A8' : color
    } else {
      const up = ease.out(prog(t, F + 1.6 + kept * 0.1, F + 2.6 + kept * 0.1))
      color = up > 0.3 ? KEPT[kept % KEPT.length] : color
      h = lerp(h, 96, up)
      glow = up
      const bi = s.beats.findIndex(b => b.entry.item.id === it.id)
      if (beatIdx >= 0) {
        const [a, zz] = beatWindow(beatIdx, n)
        const on = bi === beatIdx ? ease.out(prog(t, a, a + 0.6)) * (1 - ease.in(prog(t, zz - 0.4, zz))) : 0
        h = lerp(h, 56, side) + on * 150
        glow = lerp(glow, 0.2, side) + on * 0.8
      }
      if (t < I + 0.2) {
        const lo = ease.out(prog(t, F + 2.6, F + 3.1)) * (1 - prog(t, I - 0.3, I))
        if (lo > 0) labels.push(
          <Pin key={it.id} at={[x, y, z + h + 36]} cx={cx} cy={cy} phi={phi} style={{ opacity: lo }}>
            <div style={{ maxWidth: 200, padding: '6px 10px', borderRadius: 10, background: 'rgb(255 255 255 / 92%)', color: '#2A2340', fontSize: 15, fontWeight: 600, lineHeight: 1.3, boxShadow: '0 8px 20px -8px rgb(30 20 60 / 50%)', textAlign: 'center' }}>{it.title}</div>
          </Pin>,
        )
      }
      if (bi >= 0 && bi === beatIdx) {
        const [a] = beatWindow(bi, n)
        labels.push(
          <Pin key={`b${it.id}`} at={[x, y, z + h + 30]} cx={cx} cy={cy} phi={phi} style={{ opacity: ease.out(prog(t, a + 0.3, a + 0.7)) }}>
            <div style={{ fontSize: 30, fontWeight: 800, textShadow: '0 4px 14px rgb(40 20 60 / 60%)' }}>{String(bi + 1).padStart(2, '0')}</div>
          </Pin>,
        )
      }
    }
    return <Cube key={it.id} x={x} y={y} z={z} w={CUBE} h={h} color={color} glow={glow} o={clamp(ap * 2)} />
  })
  return (
    <Layer o={o}>
      <World cx={cx} cy={cy} phi={phi}>
        <Cube x={0} y={0} z={-36} w={5 * PITCH + 50} d={4 * PITCH + 50} h={36} color="#F3EEF8" />
        {cubes}
      </World>
      {labels}
    </Layer>
  )
}

const CARD: CSSProperties = { background: 'rgb(255 255 255 / 92%)', color: '#2A2340', borderRadius: 26, boxShadow: '0 30px 60px -30px rgb(30 15 50 / 70%), inset 0 1px 0 #fff' }

/** 屏幕上平贴的文字：片头标题、筛选计数、逐条卡片 */
function Titles({ s, t }: { s: ReelSpec; t: number }) {
  const [F] = ACT.filter
  const [I, IZ] = ACT.items
  const intro = actLife(t, 'intro', 0.5, 0.4)
  const filt = actLife(t, 'filter', 0.4, 0.4)
  const n = s.kept.length
  const m = s.meeting
  return (
    <>
      <Layer o={intro}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center' }}>
          <div style={{ fontSize: 22, opacity: 0.75, letterSpacing: '0.06em' }}>会映 MeetReel · {m.title}</div>
          <div style={{ fontSize: 92, fontWeight: 800, marginTop: 10, textShadow: '0 10px 30px rgb(30 15 60 / 50%)', transform: `translateY(${lerp(20, 0, ease.out(prog(t, 0.3, 1.2)))}px)` }}>{s.person.name}的 30 秒</div>
        </div>
      </Layer>
      <Layer o={filt}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 50, textAlign: 'center' }}>
          <div style={{ fontSize: 76, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textShadow: '0 10px 30px rgb(30 15 60 / 50%)' }}>{count(t, F + 1.5, F + 2.6, s.total, n)} <span style={{ fontSize: 34 }}>条</span></div>
          <div style={{ fontSize: 24, opacity: 0.9, marginTop: 4 }}>
            {t < F + 1.5 ? `这场直播，${s.total} 条要点` : n ? `与你无关的 ${s.total - n} 条沉下去，与你有关的 ${n} 条浮上来` : '整场都与你无关，全部沉下去'}
          </div>
        </div>
      </Layer>
      {t >= I - 0.01 && t <= IZ + 0.01 && (s.beats.length ? s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, s.beats.length)
        const o = life(t, a, z, 0.5, 0.4)
        if (o <= 0) return null
        const e = b.entry
        const sl = ease.out(prog(t, a, a + 0.7))
        const q = e.item.quote
        const k = Math.ceil(q.length * prog(t, a + 0.5, a + 1.8))
        return (
          <Layer key={e.item.id} o={o}>
            <div style={{ ...CARD, position: 'absolute', left: 744, top: 64, width: 480, minHeight: 590, padding: '30px 34px', transform: `translateX(${lerp(40, 0, sl)}px)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#7A7090' }}>
                <span style={{ padding: '3px 12px', borderRadius: 999, fontWeight: 700, color: '#fff', background: e.tier === 'must' ? '#E2557A' : '#8E89A8' }}>{e.tier === 'must' ? '必读' : '建议看'}</span>
                <span>{String(i + 1).padStart(2, '0')} / {String(s.beats.length).padStart(2, '0')} · {ITEM_TYPES[e.item.type].label}</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.25, marginTop: 16 }}>{e.item.title}</div>
              <div style={{ fontSize: 19, lineHeight: 1.6, marginTop: 14, color: '#4B4462' }}>{e.forYou}</div>
              <div style={{ marginTop: 18, padding: '16px 18px', borderRadius: 18, background: '#F3EEF8' }}>
                <div style={{ fontSize: 20, lineHeight: 1.5, fontWeight: 600 }}>“{q.slice(0, k)}{k >= q.length ? '”' : ''}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <Face p={b.speaker} size={38} />
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{b.speaker.name}</span>
                  <span style={{ fontSize: 13, color: '#7A7090' }}>原话 {tc(b.at)} · 示意头像</span>
                </div>
              </div>
              <div style={{ marginTop: 16, fontSize: 17, color: '#7A7090' }}>为什么发给你 · <b style={{ color: '#2A2340' }}>{e.why}</b></div>
              {i === s.beats.length - 1 && s.more > 0 && <div style={{ marginTop: 8, fontSize: 15, color: '#7A7090' }}>卡片里还有 {s.more} 条</div>}
            </div>
          </Layer>
        )
      }) : (
        <Layer o={life(t, I, IZ, 0.5, 0.4)}>
          <div style={{ ...CARD, position: 'absolute', left: 744, top: 220, width: 460, padding: '40px 36px', fontSize: 40, fontWeight: 800, lineHeight: 1.3 }}>这场会，<br />没有要你看的。</div>
        </Layer>
      ))}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.5, 0.45)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const phi = -40 + Math.sin(t * 0.3) * 4
  const cx = 640, cy = 420
  const days = nx.date ? stripDays(nx.date) : []
  const hit = ease.back(prog(t, A + 1.0, A + 1.7))
  const card = ease.out(prog(t, A + 1.6, A + 2.3))
  const tiles = days.length ? days : ['']
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 22, opacity: 0.75, letterSpacing: '0.08em' }}>接下来</div>
        <div style={{ fontSize: 38, fontWeight: 800, marginTop: 10, padding: '0 120px', lineHeight: 1.35, textShadow: '0 8px 24px rgb(30 15 60 / 45%)' }}>{nx.link}</div>
      </div>
      <World cx={cx} cy={cy} phi={phi}>
        {tiles.map((d, i) => {
          const on = d === nx.date || !days.length
          const ap = ease.out(prog(t, A + 0.3 + i * 0.07, A + 0.8 + i * 0.07))
          const x = (i - (tiles.length - 1) / 2) * 112
          return (
            <Cube key={d || 'x'} x={x} y={0} z={on ? hit * 40 : 0} w={96} h={14 + 10 * ap} color={on ? '#FFB86B' : '#F3EEF8'} glow={on ? hit : 0} o={clamp(ap * 2)} />
          )
        })}
      </World>
      {tiles.map((d, i) => {
        const on = d === nx.date || !days.length
        const x = (i - (tiles.length - 1) / 2) * 112
        const [X, Y] = proj(x, 0, (on ? hit * 40 : 0) + 34, phi)
        return (
          <div key={d || 'x'} style={{ position: 'absolute', left: cx + X, top: cy + Y, transform: 'translate(-50%, -100%)', textAlign: 'center', opacity: clamp(prog(t, A + 0.5 + i * 0.07, A + 0.9 + i * 0.07)) }}>
            {days.length ? (
              <>
                <div style={{ fontSize: 14, opacity: 0.85 }}>周{weekdayShort(d)}</div>
                <div style={{ fontSize: on ? 46 : 30, fontWeight: 800, textShadow: '0 4px 14px rgb(40 20 60 / 55%)' }}>{Number(d.slice(8))}</div>
              </>
            ) : <div style={{ fontSize: 34, fontWeight: 800, textShadow: '0 4px 14px rgb(40 20 60 / 55%)' }}>{nx.dueLabel}</div>}
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', opacity: card, transform: `translateY(${lerp(20, 0, card)}px)` }}>
        <div style={{ ...CARD, padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: '#FFB86B' }} />
          <span style={{ fontSize: 24, fontWeight: 800 }}>{nx.item.title}</span>
          <span style={{ fontSize: 16, color: '#7A7090' }}>{nx.meeting.title.replace(/ · .*/, '')} · {nx.dueLabel}</span>
        </div>
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(ease.out(prog(t, A, A + 0.5)))
  if (o <= 0) return null
  const phi = -45 + Math.sin(t * 0.3) * 6
  const cx = 640, cy = 470
  const btn = [['确认', '#7CE0B5'], ['追问', '#FFB86B'], ['不是我', '#C9CEE6']] as const
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center' }}>
        <div style={{ fontSize: 88, fontWeight: 800, textShadow: '0 12px 34px rgb(30 15 60 / 50%)', transform: `scale(${lerp(0.92, 1, ease.out(prog(t, A, A + 0.8)))})` }}>省下 {s.savedMin} 分钟</div>
        <div style={{ fontSize: 24, opacity: 0.9, marginTop: 10 }}>{s.total - s.kept.length} 条沉下去了；有关的原话，随时回放</div>
      </div>
      <World cx={cx} cy={cy} phi={phi}>
        <Cube x={0} y={0} z={-24} w={420} d={170} h={24} color="#F3EEF8" />
        {btn.map(([b, c], i) => {
          const p = ease.back(prog(t, A + 0.6 + i * 0.15, A + 1.2 + i * 0.15))
          return <Cube key={b} x={(i - 1) * 130} y={0} z={0} w={96} h={10 + 50 * clamp(p)} color={c} glow={i === 0 ? clamp(p) * 0.6 : 0} />
        })}
      </World>
      {btn.map(([b], i) => {
        const p = ease.back(prog(t, A + 0.6 + i * 0.15, A + 1.2 + i * 0.15))
        const [X, Y] = proj((i - 1) * 130, 0, 10 + 50 * clamp(p) + 70, phi)
        return <div key={b} style={{ position: 'absolute', left: cx + X, top: cy + Y, transform: 'translate(-50%, -100%)', fontSize: 28, fontWeight: 800, opacity: clamp(p), textShadow: '0 4px 14px rgb(40 20 60 / 60%)' }}>{b}</div>
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', fontSize: 18, opacity: 0.8, letterSpacing: '0.08em' }}>会映 MeetReel</div>
    </Layer>
  )
}
